// 웹(브라우저) 전용 정렬 엔진.
// 데스크탑은 pywebview 가 Python 을 직접 호스팅하지만, 웹은 Python 백엔드가 없다.
// 그래서 Pyodide(파이썬 WASM)를 CDN 에서 불러와, 데스크탑과 "똑같은"
// backend/sorts/*.py 를 브라우저 안에서 그대로 실행한다(분기 없는 단일 진실 공급원).
//
// public/py/sorts/*.py 는 빌드 시 scripts/sync-backend.mjs 가 backend 에서 복사한 것.

import type { AlgoMeta, RandomResult, SortResult } from "./types";

const PYODIDE_VERSION = "0.29.4";
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Pyodide 가상 FS 에 올릴 패키지 모듈들(backend/sorts 와 동일).
const PY_MODULES = ["__init__.py", "tracer.py", "algorithms.py", "registry.py"];

// Pyodide 부트스트랩: sorts 패키지를 import 하고 JS 가 부를 헬퍼들을 정의한다.
// frame 은 클 수 있어(수만 장) JSON 문자열로 주고받는다(toJs 보다 안정적·빠름).
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

interface Pyodide {
  runPython(code: string): unknown;
  FS: {
    mkdirTree(path: string): void;
    writeFile(path: string, data: string): void;
  };
  globals: { get(name: string): (...args: unknown[]) => string };
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
  }
}

export type EngineStatus = "idle" | "loading" | "ready" | "failed";

let pyodide: Pyodide | null = null;
let initPromise: Promise<Pyodide> | null = null;
let status: EngineStatus = "idle";
const statusListeners = new Set<(s: EngineStatus, detail: string) => void>();

function setStatus(s: EngineStatus, detail = "") {
  status = s;
  for (const fn of statusListeners) fn(s, detail);
}

export function onEngineStatus(fn: (s: EngineStatus, detail: string) => void): () => void {
  statusListeners.add(fn);
  fn(status, "");
  return () => statusListeners.delete(fn);
}

export function getEngineStatus(): EngineStatus {
  return status;
}

// CDN 에서 pyodide.js 로더 스크립트를 한 번만 주입한다.
function loadPyodideScript(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${PYODIDE_CDN}pyodide.js`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Pyodide 로더 스크립트를 불러오지 못했습니다"));
    document.head.appendChild(s);
  });
}

async function fetchModules(): Promise<Record<string, string>> {
  const base = import.meta.env.BASE_URL || "/";
  const out: Record<string, string> = {};
  await Promise.all(
    PY_MODULES.map(async (name) => {
      const res = await fetch(`${base}py/sorts/${name}`);
      if (!res.ok) throw new Error(`정렬 모듈 로드 실패: ${name} (${res.status})`);
      out[name] = await res.text();
    }),
  );
  return out;
}

// 한 번만 Pyodide 를 띄우고 sorts 패키지를 적재한다(이후 호출은 캐시된 인스턴스 사용).
export function ensureEngine(): Promise<Pyodide> {
  if (pyodide) return Promise.resolve(pyodide);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    setStatus("loading", "Python 런타임 불러오는 중");
    await loadPyodideScript();
    const py = await window.loadPyodide!({ indexURL: PYODIDE_CDN });

    setStatus("loading", "정렬 알고리즘 적재 중");
    const modules = await fetchModules();
    py.FS.mkdirTree("/home/pyodide/sorts");
    for (const [name, src] of Object.entries(modules)) {
      py.FS.writeFile(`/home/pyodide/sorts/${name}`, src);
    }
    py.runPython(BOOTSTRAP);

    pyodide = py;
    setStatus("ready");
    return py;
  })();

  initPromise.catch(() => {
    initPromise = null;
    setStatus("failed");
  });
  return initPromise;
}

export async function pyList(): Promise<AlgoMeta[]> {
  const py = await ensureEngine();
  return JSON.parse(py.globals.get("_api_list")());
}

export async function pySort(algoId: string, array: number[]): Promise<SortResult> {
  const py = await ensureEngine();
  return JSON.parse(py.globals.get("_api_sort")(algoId, JSON.stringify(array)));
}

export async function pyRandom(count: number, algoId?: string | null): Promise<RandomResult> {
  const py = await ensureEngine();
  return JSON.parse(py.globals.get("_api_random")(count, algoId ?? null));
}
