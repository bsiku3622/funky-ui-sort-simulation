// window.pywebview.api 래퍼.
// pywebview 창 안에서는 Python Api 를 직접 호출하고,
// 일반 브라우저(localhost:5173)로 열었을 땐 가벼운 JS mock 으로 폴백한다.

import type { AlgoMeta, Frame, RandomResult, SNode, SortResult } from "./types";

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

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

// pywebview 가 window.pywebview.api 를 주입할 때까지 기다린다(최대 timeout).
// pywebviewready 이벤트는 우리 리스너 등록 전에 이미 끝났을 수 있어 폴링도 병행.
const API_WAIT_MS = 5000;
async function waitForApi(): Promise<PyApi | null> {
  const start = Date.now();
  while (!window.pywebview?.api && Date.now() - start < API_WAIT_MS) {
    await sleep(40);
  }
  return window.pywebview?.api ?? null;
}

// api 호출은 브릿지가 워밍업 중이면 간헐적으로 실패할 수 있어 몇 번 재시도한다.
// 끝까지 api 가 없으면(=일반 브라우저) mock 으로 폴백.
async function withApi<T>(
  call: (api: PyApi) => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  const api = await waitForApi();
  if (!api) return fallback();
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

// ── 공개 API ──────────────────────────────────────────────
export function listAlgorithms(): Promise<AlgoMeta[]> {
  return withApi((api) => api.list_algorithms(), () => mock.list());
}

export function randomArray(count: number, algoId?: string | null): Promise<RandomResult> {
  return withApi((api) => api.random_array(count, algoId ?? null), () => mock.random(count, algoId));
}

export function sort(algoId: string, array: number[]): Promise<SortResult> {
  return withApi((api) => api.sort(algoId, array), () => mock.sort(algoId, array));
}

// ── 브라우저 전용 mock (Python 없이 레이아웃 확인용) ──────────
const MOCK_ALGOS: AlgoMeta[] = [
  { id: "bubble", name: "Bubble Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 60, nonNegative: false },
  { id: "insertion", name: "Insertion Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 60, nonNegative: false },
  { id: "binary_tree", name: "Binary Tree Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n log n)~O(n²)", note: "mock", gag: false, maxN: 60, nonNegative: false },
  { id: "selection", name: "Selection Sort", category: "quadratic", categoryLabel: "O(N²) 기본 정렬", complexity: "O(n²)", note: "mock", gag: false, maxN: 60, nonNegative: false },
  { id: "merge", name: "Merge Sort", category: "efficient", categoryLabel: "개선된 정렬", complexity: "O(n log n)", note: "mock", gag: false, maxN: 60, nonNegative: false },
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

const mock = {
  list: async (): Promise<AlgoMeta[]> => MOCK_ALGOS,
  random: async (count: number, algoId?: string | null): Promise<RandomResult> => {
    void algoId;
    const n = Math.max(2, Math.min(count, 60));
    const array = Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 95));
    return { array, count: n, min: 5, max: 99, cappedBy: null };
  },
  // mock: binary_tree 는 트리 frame 까지, 그 외는 bubble frame 으로 대체.
  sort: async (algoId: string, input: number[]): Promise<SortResult> => {
    if (algoId === "binary_tree") {
      const frames = mockBinaryTreeFrames(input);
      return {
        algoId, name: "Binary Tree Sort", complexity: "O(n log n)~O(n²)", gag: false,
        input, frames, frameCount: frames.length,
        comparisons: 0, swaps: frames[frames.length - 1]?.swaps ?? 0, truncated: false,
      };
    }
    if (algoId === "insertion") {
      const frames = mockInsertionFrames(input);
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
    return {
      algoId, name: "Mock Bubble", complexity: "O(n²)", gag: false,
      input, frames, frameCount: frames.length, comparisons, swaps, truncated: false,
    };
  },
};
