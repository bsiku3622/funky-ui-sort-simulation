// 웹(브라우저) 전용 정렬 엔진 — Pyodide 를 Web Worker 에서 구동한다.
// 데스크탑은 pywebview 가 Python 을 별도 프로세스로 호스팅하지만, 웹은 그게 없다.
// Pyodide(파이썬 WASM)로 데스크탑과 "똑같은" backend/sorts/*.py 를 브라우저에서 실행하되,
// 무거운 정렬 계산이 UI 를 얼리지 않도록 Worker 스레드에서 돌린다(여기선 그 Worker 를 부린다).
//
// public/py/sorts/*.py 는 빌드 시 scripts/sync-backend.mjs 가 backend 에서 복사한 것.

import type { AlgoMeta, RandomResult, SortResult } from "./types";

const PY_MODULES = ["__init__.py", "tracer.py", "algorithms.py", "registry.py"];

export type EngineStatus = "idle" | "loading" | "ready" | "failed";

let worker: Worker | null = null;
let initPromise: Promise<void> | null = null;
let status: EngineStatus = "idle";
const statusListeners = new Set<(s: EngineStatus, detail: string) => void>();

// 요청/응답 매칭용.
let reqId = 0;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

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

// 빌드에 실린 정렬 모듈(.py)을 메인 스레드에서 받아 워커로 넘긴다
// (워커의 fetch base 경로 문제를 피하려고 메인에서 읽어 전달).
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

// 워커를 한 번만 띄우고 Pyodide + sorts 패키지를 적재한다(ready 까지 대기).
export function ensureEngine(): Promise<void> {
  if (worker && status === "ready") return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    setStatus("loading", "Python 런타임 불러오는 중");
    const modules = await fetchModules();

    const w = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent) => {
      const d = e.data;
      if (d.type === "status") {
        setStatus(d.status, d.detail);
      } else if (d.type === "result") {
        const p = pending.get(d.id);
        if (!p) return;
        pending.delete(d.id);
        if (d.ok) p.resolve(d.result);
        else p.reject(new Error(d.error));
      }
    };
    w.onerror = (e) => setStatus("failed", e.message);
    worker = w;
    w.postMessage({ type: "init", modules });

    // ready/failed 상태가 올 때까지 대기.
    await new Promise<void>((resolve, reject) => {
      const off = onEngineStatus((s) => {
        if (s === "ready") {
          off();
          resolve();
        } else if (s === "failed") {
          off();
          reject(new Error("Pyodide 엔진 초기화 실패"));
        }
      });
    });
  })();

  initPromise.catch(() => {
    initPromise = null;
  });
  return initPromise;
}

// 워커에 요청을 보내고 응답을 promise 로 받는다(계산은 워커 스레드에서 → UI 안 얼림).
function call<T>(type: "list" | "sort" | "random", args: unknown[]): Promise<T> {
  return ensureEngine().then(
    () =>
      new Promise<T>((resolve, reject) => {
        const id = ++reqId;
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        worker!.postMessage({ type, id, args });
      }),
  );
}

export function pyList(): Promise<AlgoMeta[]> {
  return call<AlgoMeta[]>("list", []);
}

export function pySort(algoId: string, array: number[]): Promise<SortResult> {
  return call<SortResult>("sort", [algoId, array]);
}

export function pyRandom(count: number, algoId?: string | null): Promise<RandomResult> {
  return call<RandomResult>("random", [count, algoId ?? null]);
}
