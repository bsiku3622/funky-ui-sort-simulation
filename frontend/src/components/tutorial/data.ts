// 튜터 페이지용 예제 데이터 + 생성기 (순수 TS, JSX 없음).
// 강의 예제 배열을 그대로 써서 메모리 변화 표·트리·버킷을 만들어 낸다.

export interface Cell {
  v: number | string;
  mark?: string; // cmp | swap | key | sorted | pivot | min
}
export interface MemRow {
  label?: string;
  cells: Cell[];
  note?: string;
}
export interface TNode {
  v: number | string;
  l?: TNode | null;
  r?: TNode | null;
  mark?: string;
}
export interface RadixPass {
  exp: number;
  buckets: number[][];
  after: number[];
}

// ── 강의 예제 배열 ──────────────────────────────────────
export const EX_SIMPLE = [50, 60, 40, 35, 73, 52];
export const EX_DC = [85, 24, 63, 45, 17, 31, 96, 50];
export const EX_RADIX = [321, 269, 201, 707, 195, 400, 892, 563, 699, 499];
export const EX_BST = [50, 40, 60, 35, 49, 52, 73, 23, 26, 80, 91];
export const EX_HEAP = [50, 60, 40, 35, 73, 52];

const cells = (a: number[], mark?: (i: number) => string | undefined): Cell[] =>
  a.map((v, i) => ({ v, mark: mark?.(i) }));

// ── 비교 기반 정렬: 패스 단위 메모리 표 ──────────────────
export function bubbleRows(input: number[]): MemRow[] {
  const a = [...input];
  const n = a.length;
  const rows: MemRow[] = [{ label: "시작", cells: cells(a), note: "초기 배열" }];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
    const from = n - 1 - i;
    rows.push({
      label: `패스 ${i + 1}`,
      cells: cells(a, (idx) => (idx >= from ? "sorted" : undefined)),
      note: `최댓값 ${a[from]} 가 뒤에서 ${i + 1}번째로 확정`,
    });
  }
  rows[rows.length - 1].cells.forEach((c) => (c.mark = "sorted"));
  return rows;
}

export function insertionRows(input: number[]): MemRow[] {
  const a = [...input];
  const n = a.length;
  const rows: MemRow[] = [
    { label: "시작", cells: cells(a, (i) => (i === 0 ? "sorted" : undefined)), note: "첫 원소는 정렬된 것으로 간주" },
  ];
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
    const pos = j + 1;
    rows.push({
      label: `i=${i}`,
      cells: cells(a, (idx) => (idx === pos ? "key" : idx <= i ? "sorted" : undefined)),
      note: `key=${key} 를 앞 정렬구간에 삽입 → 자리 ${pos}`,
    });
  }
  return rows;
}

export function selectionRows(input: number[]): MemRow[] {
  const a = [...input];
  const n = a.length;
  const rows: MemRow[] = [{ label: "시작", cells: cells(a), note: "초기 배열" }];
  for (let i = 0; i < n - 1; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) if (a[j] < a[m]) m = j;
    if (m !== i) [a[i], a[m]] = [a[m], a[i]];
    rows.push({
      label: `i=${i}`,
      cells: cells(a, (idx) => (idx <= i ? "sorted" : undefined)),
      note: `남은 구간 최솟값 ${a[i]} 를 자리 ${i} 로`,
    });
  }
  rows[rows.length - 1].cells.forEach((c) => (c.mark = "sorted"));
  return rows;
}

export function shellRows(input: number[]): MemRow[] {
  const a = [...input];
  const n = a.length;
  const rows: MemRow[] = [{ label: "시작", cells: cells(a), note: "초기 배열" }];
  let gap = Math.floor(n / 2);
  while (gap > 0) {
    for (let i = gap; i < n; i++) {
      const key = a[i];
      let j = i;
      while (j >= gap && a[j - gap] > key) {
        a[j] = a[j - gap];
        j -= gap;
      }
      a[j] = key;
    }
    rows.push({ label: `gap=${gap}`, cells: cells(a), note: `${gap} 간격 부분리스트들을 삽입정렬` });
    gap = Math.floor(gap / 2);
  }
  rows[rows.length - 1].cells.forEach((c) => (c.mark = "sorted"));
  return rows;
}

// ── 퀵정렬: 첫 분할(partition) 추적 ─────────────────────
export function quickPartitionRows(input: number[]): MemRow[] {
  const a = [...input];
  const hi = a.length - 1;
  const pivot = a[hi];
  const rows: MemRow[] = [
    { label: "pivot", cells: cells(a, (i) => (i === hi ? "pivot" : undefined)), note: `pivot = ${pivot} (맨 끝 원소)` },
  ];
  let l = 0;
  let r = hi - 1;
  while (true) {
    while (l <= r && a[l] < pivot) l++;
    while (l <= r && a[r] > pivot) r--;
    if (l >= r) break;
    [a[l], a[r]] = [a[r], a[l]];
    rows.push({
      label: "교환",
      cells: cells(a, (i) => (i === l ? "swap" : i === r ? "swap" : i === hi ? "pivot" : undefined)),
      note: `왼쪽 큰 값 a[${l}] ↔ 오른쪽 작은 값 a[${r}]`,
    });
    l++;
    r--;
  }
  [a[l], a[hi]] = [a[hi], a[l]];
  rows.push({
    label: "배치",
    cells: cells(a, (i) => (i === l ? "sorted" : i < l ? "min" : undefined)),
    note: `pivot 을 자리 ${l} 에 → 왼쪽은 모두 작고 오른쪽은 모두 큼`,
  });
  return rows;
}

// ── 머지정렬: 분할 레벨 ─────────────────────────────────
export function mergeLevels(arr: number[]): number[][][] {
  let level: number[][] = [arr];
  const levels: number[][][] = [level];
  while (level.some((seg) => seg.length > 1)) {
    const next: number[][] = [];
    for (const seg of level) {
      if (seg.length > 1) {
        const mid = Math.floor(seg.length / 2);
        next.push(seg.slice(0, mid));
        next.push(seg.slice(mid));
      } else next.push(seg);
    }
    levels.push(next);
    level = next;
  }
  return levels;
}

// ── 기수정렬: 자리값별 버킷 분배 ────────────────────────
export function radixPasses(input: number[]): RadixPass[] {
  let a = [...input];
  const maxv = Math.max(...a);
  const passes: RadixPass[] = [];
  let exp = 1;
  while (Math.floor(maxv / exp) > 0) {
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    for (const v of a) buckets[Math.floor(v / exp) % 10].push(v);
    const after = ([] as number[]).concat(...buckets);
    passes.push({ exp, buckets, after: [...after] });
    a = after;
    exp *= 10;
  }
  return passes;
}

// ── 트리 빌더 ───────────────────────────────────────────
export function buildBST(values: number[]): TNode | null {
  let root: TNode | null = null;
  const ins = (node: TNode | null, v: number): TNode => {
    if (!node) return { v, l: null, r: null };
    if (v < (node.v as number)) node.l = ins(node.l ?? null, v);
    else node.r = ins(node.r ?? null, v);
    return node;
  };
  for (const v of values) root = ins(root, v);
  return root;
}

export function inorder(n: TNode | null): (number | string)[] {
  return n ? [...inorder(n.l ?? null), n.v, ...inorder(n.r ?? null)] : [];
}

export function buildMaxHeap(input: number[]): number[] {
  const a = [...input];
  const n = a.length;
  const sift = (start: number, end: number) => {
    let root = start;
    while (2 * root + 1 < end) {
      let c = 2 * root + 1;
      if (c + 1 < end && a[c + 1] > a[c]) c++;
      if (a[root] < a[c]) {
        [a[root], a[c]] = [a[c], a[root]];
        root = c;
      } else break;
    }
  };
  for (let s = Math.floor(n / 2) - 1; s >= 0; s--) sift(s, n);
  return a;
}

// 값을 하나씩 힙에 삽입(push 후 sift-up)하며 만든 최대 힙 배열.
export function heapInsert(values: number[]): number[] {
  const a: number[] = [];
  for (const v of values) {
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p] < a[i]) {
        [a[p], a[i]] = [a[i], a[p]];
        i = p;
      } else break;
    }
  }
  return a;
}

export function heapArrayToTree(a: number[]): TNode | null {
  const build = (i: number): TNode | null =>
    i < a.length ? { v: a[i], l: build(2 * i + 1), r: build(2 * i + 2) } : null;
  return build(0);
}
