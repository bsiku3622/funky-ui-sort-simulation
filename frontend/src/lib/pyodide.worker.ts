/// <reference lib="webworker" />
// Pyodide 를 Web Worker 에서 실행한다.
// 정렬 계산(registry.run → 수만 frame 생성)은 무겁고 동기적이라, 메인 스레드에서
// 돌리면 UI 가 통째로 얼어붙는다(스피너·"계산 중" 표시조차 못 그림). Worker 로 빼서
// 백그라운드 스레드에서 계산하고, 결과만 메인으로 보낸다 → UI 는 계속 반응한다.

const PYODIDE_VERSION = "0.29.4";
const CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// sorts 패키지를 import 하고 JS 가 부를 헬퍼들을 정의한다(frame 은 JSON 으로 주고받음).
const BOOTSTRAP = `
import json, random, sys
sys.path.insert(0, "/home/pyodide")
from sorts import list_algorithms as _list
from sorts import registry as _reg
from sorts import run as _run

def _api_list():
    return json.dumps(_list())

def _api_sort(algo_id, arr_json):
    arr = json.loads(arr_json)
    return json.dumps(_run(algo_id, arr))

def _api_random(count, algo_id):
    try:
        n = int(count)
    except Exception:
        n = 16
    n = max(2, min(n, 250))
    capped = None
    if algo_id:
        spec = _reg.get(algo_id)
        if spec and n > spec.max_n:
            n = spec.max_n
            capped = spec.name
    values = random.sample(range(1, 2 * n + 1), n)
    return json.dumps({"array": values, "count": n, "min": 1, "max": 2 * n, "cappedBy": capped})
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;
let ready: Promise<void> | null = null;

const post = (m: unknown) => (self as unknown as Worker).postMessage(m);

async function initEngine(modules: Record<string, string>): Promise<void> {
  post({ type: "status", status: "loading", detail: "Python 런타임 불러오는 중" });
  // 워커에서 CDN 의 pyodide ESM 을 동적 import (절대 URL 이라 Vite 가 건드리지 않게 ignore).
  const mod = await import(/* @vite-ignore */ `${CDN}pyodide.mjs`);
  const py = await mod.loadPyodide({ indexURL: CDN });

  post({ type: "status", status: "loading", detail: "정렬 알고리즘 적재 중" });
  py.FS.mkdirTree("/home/pyodide/sorts");
  for (const [name, src] of Object.entries(modules)) {
    py.FS.writeFile(`/home/pyodide/sorts/${name}`, src);
  }
  py.runPython(BOOTSTRAP);

  pyodide = py;
  post({ type: "status", status: "ready", detail: "" });
}

self.onmessage = async (e: MessageEvent) => {
  const data = e.data;

  if (data.type === "init") {
    ready = initEngine(data.modules).catch((err) => {
      post({ type: "status", status: "failed", detail: String(err) });
      throw err;
    });
    return;
  }

  // list | sort | random — 요청마다 id 로 응답을 매칭한다.
  const { type, id, args } = data;
  try {
    if (ready) await ready;
    if (!pyodide) throw new Error("Pyodide 엔진이 준비되지 않았습니다");
    let json: string;
    if (type === "list") {
      json = pyodide.globals.get("_api_list")();
    } else if (type === "sort") {
      json = pyodide.globals.get("_api_sort")(args[0], JSON.stringify(args[1]));
    } else {
      json = pyodide.globals.get("_api_random")(args[0], args[1] ?? null);
    }
    post({ type: "result", id, ok: true, result: JSON.parse(json) });
  } catch (err) {
    post({ type: "result", id, ok: false, error: String(err) });
  }
};
