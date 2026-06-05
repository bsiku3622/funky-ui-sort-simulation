// 백엔드(registry.py)가 내려주는 데이터 형태와 1:1로 맞춘 타입.

// 트리 기반 정렬(binary_tree 등)이 frame 마다 함께 보내는 트리 상태.
export interface SNode {
  v: number;
  l: SNode | null;
  r: SNode | null;
}
export interface FrameTree {
  root: SNode | null;
  highlight: number | null;
  phase: string; // "insert" | "traverse" | "compare" | "visit" | "output" | "heap"
}

// 알고리즘의 내부 변수 상태.
export interface FrameState {
  held: { name: string; value: number; active: boolean }[]; // 손에 든 값(key/temp/pivot) → 막대
  pointers: { name: string; index: number }[]; // 인덱스 변수(i/j/min/l/r/k) → 막대 아래 라벨
  scalars: { name: string; value: number | string }[]; // 그 외 수치(gap/exp/pass) → 칩
}

export interface Frame {
  array: number[];
  active: number[];
  pivot: number | null;
  sorted: number[];
  action: string;
  note: string;
  comparisons: number;
  swaps: number;
  aux: number[][] | null;
  tree?: FrameTree | null;
  state?: FrameState | null;
}

export interface AlgoMeta {
  id: string;
  name: string;
  category: "quadratic" | "efficient" | "distribution" | "gag";
  categoryLabel: string;
  complexity: string;
  note: string;
  gag: boolean;
  maxN: number;
  nonNegative: boolean;
}

export interface SortResult {
  algoId: string;
  name: string;
  complexity: string;
  gag: boolean;
  input: number[];
  frames: Frame[];
  frameCount: number;
  comparisons: number;
  swaps: number;
  truncated: boolean;
  infinite?: boolean; // bogo 처럼 끝나지 않는 정렬이면 true → frame 수를 ∞ 로 표시
}

export interface RandomResult {
  array: number[];
  count: number;
  min: number;
  max: number;
  cappedBy: string | null;
}
