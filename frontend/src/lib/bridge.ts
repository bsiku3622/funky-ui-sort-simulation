// 백엔드 브릿지.
//  - 데스크탑(pywebview): window.pywebview.api 로 Python 을 직접 호출.
//  - 웹(브라우저): Pyodide 로 똑같은 backend/sorts/*.py 를 그대로 실행.
//  - Pyodide 적재 실패 시에만 최후의 수단으로 가벼운 JS mock 으로 폴백.

import type { AlgoMeta, Frame, RandomResult, SNode, SortResult } from "./types";
import { ensureEngine, pyList, pyRandom, pySort } from "./pyodideEngine";

interface PyApi {
  list_algorithms(): Promise<AlgoMeta[]>;
  random_array(count: number, algoId?: string | null): Promise<RandomResult>;
  sort(algoId: string, array: number[]): Promise<SortResult>;
}

declare global {
  interface Window {
    pywebview?: { api: PyApi };
  }
}

export function isNative(): boolean {
  return Boolean(window.pywebview?.api);
}

// 웹이면 Pyodide 를 미리 데운다(첫 정렬 클릭 전에 로딩을 끝내 둠). 데스크탑은 무시.
export async function warmUp(): Promise<void> {
  if ((await detectEnv()) === "web") {
    try {
      await ensureEngine();
    } catch {
      /* 실패해도 호출 시 mock 으로 폴백 */
    }
  }
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

// 실행 환경을 한 번만 판별해 캐시한다. pywebview 는 보통 1초 안에 api 를 주입하므로,
// 잠깐 기다려 보고 없으면 웹(Pyodide)으로 확정한다(브라우저에서 매 호출 대기 방지).
const ENV_WAIT_MS = 1500;
let envPromise: Promise<"native" | "web"> | null = null;
function detectEnv(): Promise<"native" | "web"> {
  if (!envPromise) {
    envPromise = (async () => {
      const start = Date.now();
      while (!window.pywebview?.api && Date.now() - start < ENV_WAIT_MS) {
        await sleep(40);
      }
      return window.pywebview?.api ? "native" : "web";
    })();
  }
  return envPromise;
}

// 데스크탑: 브릿지 워밍업 중 간헐적 실패가 있어 몇 번 재시도.
async function callNative<T>(call: (api: PyApi) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < 6; i++) {
    try {
      return await call(window.pywebview!.api);
    } catch (e) {
      lastErr = e;
      await sleep(150);
    }
  }
  throw lastErr;
}

// 웹: Pyodide 로 실행, 실패 시 mock 폴백.
async function callWeb<T>(py: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await py();
  } catch (e) {
    console.warn("[bridge] Pyodide 엔진 실패 → mock 폴백", e);
    return fallback();
  }
}

// ── 공개 API ──────────────────────────────────────────────
export async function listAlgorithms(): Promise<AlgoMeta[]> {
  if ((await detectEnv()) === "native") return callNative((api) => api.list_algorithms());
  return callWeb(() => pyList(), () => mock.list());
}

export async function randomArray(count: number, algoId?: string | null): Promise<RandomResult> {
  if ((await detectEnv()) === "native") return callNative((api) => api.random_array(count, algoId ?? null));
  return callWeb(() => pyRandom(count, algoId), () => mock.random(count, algoId));
}

export async function sort(algoId: string, array: number[]): Promise<SortResult> {
  if ((await detectEnv()) === "native") return callNative((api) => api.sort(algoId, array));
  return callWeb(() => pySort(algoId, array), () => mock.sort(algoId, array));
}

// ── 브라우저 전용 mock (Python 없이 레이아웃 확인용) ──────────
const MOCK_ALGOS: AlgoMeta[] = [
  { id: "bubble", name: "Bubble Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 250, nonNegative: false },
  { id: "insertion", name: "Insertion Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 250, nonNegative: false },
  { id: "binary_tree", name: "Binary Tree Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n log n)~O(n²)", note: "mock", gag: false, maxN: 250, nonNegative: false },
  { id: "selection", name: "Selection Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 250, nonNegative: false },
  { id: "merge", name: "Merge Sort", category: "efficient", categoryLabel: "개선된 정렬", complexity: "O(n log n)", note: "mock", gag: false, maxN: 250, nonNegative: false },
];

// 브라우저 mock 에서도 insertion 은 key 막대를 보여주도록 백엔드 동작을 미러링.
function mockInsertionFrames(input: number[]): Frame[] {
  const frames: Frame[] = [];
  const a = [...input];
  const n = a.length;
  const sorted = new Set<number>();
  let comparisons = 0;
  let swaps = 0;
  const st = (key: number, active: boolean, i: number, j: number) => ({
    held: [{ name: "key", value: key, active }],
    pointers: [{ name: "i", index: i }, { name: "j", index: j }],
    scalars: [] as { name: string; value: number | string }[],
  });
  const push = (extra: Partial<Frame> & { action: string }) =>
    frames.push({
      array: [...a], active: [], pivot: null, sorted: [...sorted].sort((x, y) => x - y),
      note: "", comparisons, swaps, aux: null, tree: null, state: null, ...extra,
    });
  push({ action: "init", note: "초기 배열 (mock)" });
  sorted.add(0);
  for (let i = 1; i < n; i++) {
    const key = a[i];
    push({ action: "select", active: [i], note: `a[${i}]=${key} 를 key 로 빼서 손에 든다`, state: st(key, false, i, i - 1) });
    let j = i - 1;
    while (j >= 0) {
      comparisons++;
      push({ action: "compare", active: [j], note: `key(${key}) 와 a[${j}](${a[j]}) 비교`, state: st(key, true, i, j) });
      if (a[j] > key) {
        a[j + 1] = a[j];
        swaps++;
        push({ action: "overwrite", active: [j + 1], note: `a[${j}]=${a[j]} 가 key보다 크니 한 칸 뒤로`, state: st(key, false, i, j) });
        j--;
      } else break;
    }
    a[j + 1] = key;
    swaps++;
    push({ action: "overwrite", active: [j + 1], note: `빈자리 a[${j + 1}] 에 key=${key} 꽂기`, state: st(key, false, i, j + 1) });
    for (let k = 0; k <= i; k++) sorted.add(k);
  }
  push({ action: "done", note: "정렬 완료 (mock)" });
  return frames;
}

interface MockNode {
  v: number;
  l: MockNode | null;
  r: MockNode | null;
}
function serializeTree(node: MockNode | null): SNode | null {
  if (!node) return null;
  return { v: node.v, l: serializeTree(node.l), r: serializeTree(node.r) };
}

// binary_tree 는 mock 에서도 실제처럼 세분화된 트리 frame 을 만든다
// (삽입 경로 비교 / 순회 내려감·출력을 각각 1프레임으로).
function mockBinaryTreeFrames(input: number[]): Frame[] {
  const frames: Frame[] = [];
  const a = [...input];
  const n = a.length;
  const sorted = new Set<number>();
  let comparisons = 0;
  let swaps = 0;
  const push = (extra: Partial<Frame> & { action: string }) =>
    frames.push({
      array: [...a],
      active: [],
      pivot: null,
      sorted: [...sorted].sort((x, y) => x - y),
      note: "",
      comparisons,
      swaps,
      aux: null,
      tree: null,
      ...extra,
    });

  push({ action: "init", note: "초기 배열 (mock)" });

  let root: MockNode | null = null;
  for (let i = 0; i < n; i++) {
    const v = input[i];
    if (!root) {
      root = { v, l: null, r: null };
      push({ action: "select", active: [i], note: `${v} 를 루트로 삽입`, tree: { root: serializeTree(root), highlight: v, phase: "insert" } });
      continue;
    }
    let cur: MockNode = root;
    while (true) {
      comparisons++;
      const go = v < cur.v ? "왼쪽" : "오른쪽";
      push({ action: "compare", active: [i], note: `삽입값 ${v} 와 노드 ${cur.v} 비교 → ${go}으로`, tree: { root: serializeTree(root), highlight: cur.v, phase: "compare" } });
      if (v < cur.v) {
        if (!cur.l) { cur.l = { v, l: null, r: null }; break; }
        cur = cur.l;
      } else {
        if (!cur.r) { cur.r = { v, l: null, r: null }; break; }
        cur = cur.r;
      }
    }
    push({ action: "select", active: [i], note: `빈 자리를 찾아 ${v} 삽입`, tree: { root: serializeTree(root), highlight: v, phase: "insert" } });
  }

  const full = serializeTree(root);
  let outIdx = 0;
  const inorderWalk = (node: MockNode | null) => {
    if (!node) return;
    push({ action: "select", note: `노드 ${node.v} 방문 — 왼쪽 서브트리 먼저`, tree: { root: full, highlight: node.v, phase: "visit" } });
    inorderWalk(node.l);
    a[outIdx] = node.v;
    swaps++;
    sorted.add(outIdx);
    push({ action: "overwrite", active: [outIdx], note: `LNR ${outIdx + 1}번째 출력 → [${outIdx}] = ${node.v}`, tree: { root: full, highlight: node.v, phase: "output" } });
    outIdx++;
    inorderWalk(node.r);
  };
  inorderWalk(root);
  push({ action: "done", note: "완료 — LNR 순회 결과가 오름차순 정렬", tree: { root: full, highlight: null, phase: "output" } });
  return frames;
}

// 정렬 완료 후 왼쪽부터 한 칸씩 노랑으로 훑는 최종 확인 sweep (mock 용, 백엔드와 동일).
function appendSweep(frames: Frame[]): Frame[] {
  const lastF = frames[frames.length - 1];
  if (!lastF) return frames;
  const a = lastF.array;
  const sorted = a.map((_, i) => i);
  for (let i = 0; i < a.length; i++) {
    frames.push({
      array: [...a], active: [i], pivot: null, sorted,
      action: "compare", note: `정렬 확인 — [${i}] = ${a[i]}`,
      comparisons: lastF.comparisons, swaps: lastF.swaps, aux: null, tree: null, state: null,
    });
  }
  frames.push({
    array: [...a], active: [], pivot: null, sorted,
    action: "done", note: "정렬 완료 ✓",
    comparisons: lastF.comparisons, swaps: lastF.swaps, aux: null, tree: null, state: null,
  });
  return frames;
}

const mock = {
  list: async (): Promise<AlgoMeta[]> => MOCK_ALGOS,
  random: async (count: number, algoId?: string | null): Promise<RandomResult> => {
    void algoId;
    const n = Math.max(2, Math.min(count, 250));
    // 1 ~ 2N 에서 중복 없는 N개 (셔플 후 앞 n개)
    const pool = Array.from({ length: 2 * n }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { array: pool.slice(0, n), count: n, min: 1, max: 2 * n, cappedBy: null };
  },
  // mock: binary_tree 는 트리 frame 까지, 그 외는 bubble frame 으로 대체.
  sort: async (algoId: string, input: number[]): Promise<SortResult> => {
    if (algoId === "binary_tree") {
      const frames = appendSweep(mockBinaryTreeFrames(input));
      return {
        algoId, name: "Binary Tree Sort", complexity: "O(n log n)~O(n²)", gag: false,
        input, frames, frameCount: frames.length,
        comparisons: 0, swaps: frames[frames.length - 1]?.swaps ?? 0, truncated: false,
      };
    }
    if (algoId === "insertion") {
      const frames = appendSweep(mockInsertionFrames(input));
      return {
        algoId, name: "Insertion Sort", complexity: "O(n²)", gag: false,
        input, frames, frameCount: frames.length,
        comparisons: frames[frames.length - 1]?.comparisons ?? 0,
        swaps: frames[frames.length - 1]?.swaps ?? 0, truncated: false,
      };
    }
    const a = [...input];
    const frames: Frame[] = [];
    let comparisons = 0;
    let swaps = 0;
    const sortedSet = new Set<number>();
    const snap = (action: string, active: number[], note: string) =>
      frames.push({
        array: [...a], active, pivot: null, sorted: [...sortedSet].sort((x, y) => x - y),
        action, note, comparisons, swaps, aux: null,
      });
    snap("init", [], "초기 배열 (mock)");
    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < a.length - 1 - i; j++) {
        comparisons++;
        snap("compare", [j, j + 1], `[${j}] ↔ [${j + 1}] 비교`);
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swaps++;
          snap("swap", [j, j + 1], `[${j}] ⇄ [${j + 1}] 교환`);
        }
      }
      sortedSet.add(a.length - 1 - i);
    }
    sortedSet.add(0);
    snap("done", [], "정렬 완료 ✓ (mock: 실제 알고리즘은 Python 백엔드에서 동작)");
    appendSweep(frames);
    return {
      algoId, name: "Mock Bubble", complexity: "O(n²)", gag: false,
      input, frames, frameCount: frames.length, comparisons, swaps, truncated: false,
    };
  },
};
