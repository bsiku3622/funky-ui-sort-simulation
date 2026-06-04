import type { CSSProperties } from "react";
import type { Frame, FrameTree, SNode } from "../lib/types";
import type { TNode } from "./tutorial/data";
import { TreeView } from "./tutorial/visuals";

interface Props {
  frame: Frame | null;
  maxValue: number;
  transMs: number; // 막대 색 전이 시간(ms). 속도가 빠를수록 짧게(거의 즉시).
}

// 변수 이름 정리: 키워드 회피용 끝 밑줄 제거 (pass_ → pass).
const cleanName = (n: string) => n.replace(/_$/, "");

// frame 의 각 인덱스 상태에 따라 막대에 줄 CSS 클래스를 정한다.
function barState(frame: Frame, i: number): string {
  // active(비교/교환/덮어쓰기)가 sorted/pivot 보다 우선 — 정렬 구간 안의 값을
  // 비교/이동할 때도 그 강조가 보이도록.
  if (frame.active.includes(i)) {
    if (frame.action === "swap") return "bar--swap";
    if (frame.action === "overwrite") return "bar--write";
    if (frame.action === "compare") return "bar--compare";
    return "bar--active";
  }
  if (frame.sorted.includes(i)) return "bar--sorted";
  if (frame.pivot === i) return "bar--pivot";
  return "bar--idle";
}

// ── 트리 패널 (binary_tree / heap) ──────────────────────────
function toTNode(s: SNode | null, highlight: number | null, mark: string): TNode | null {
  if (s === null) return null;
  return {
    v: s.v,
    l: toTNode(s.l, highlight, mark),
    r: toTNode(s.r, highlight, mark),
    mark: highlight !== null && s.v === highlight ? mark : undefined,
  };
}

const TREE_PHASE: Record<string, { mark: string; label: string; cls: string }> = {
  insert: { mark: "new", label: "BST 삽입 — 빈 자리에 넣음", cls: "insert" },
  compare: { mark: "cmp", label: "BST 삽입 — 자리 찾는 중 (비교)", cls: "compare" },
  visit: { mark: "cmp", label: "LNR 순회 — 노드로 내려가는 중", cls: "compare" },
  output: { mark: "visit", label: "LNR 순회 — 방문값을 배열에 출력", cls: "traverse" },
  traverse: { mark: "visit", label: "LNR 순회", cls: "traverse" },
  heap: { mark: "new", label: "최대 힙 — 아래로 정리(sift-down)", cls: "insert" },
};

function TreePanel({ tree }: { tree: FrameTree }) {
  const p = TREE_PHASE[tree.phase] ?? TREE_PHASE.insert;
  const root = toTNode(tree.root, tree.highlight, p.mark);
  return (
    <div className="viz__tree">
      <span className={`viz__phase viz__phase--${p.cls}`}>{p.label}</span>
      {root ? <TreeView root={root} /> : <span className="viz__empty">빈 트리</span>}
    </div>
  );
}

export function BarCanvas({ frame, maxValue, transMs }: Props) {
  const barsStyle = { "--bar-trans": `${transMs}ms` } as CSSProperties;

  if (!frame) {
    return (
      <div className="bars bars--empty">
        <span className="bars__hint">
          케이스 수를 정하고 <b>RANDOM</b> 으로 배열을 만든 뒤,
          가운데 <b>START</b> 를 눌러보세요.
        </span>
      </div>
    );
  }

  const n = frame.array.length;
  const showLabels = n <= 32; // 너무 많으면 숫자 라벨 생략
  const held = frame.state?.held ?? [];
  const scalars = frame.state?.scalars ?? [];

  // 인덱스 → 그 자리를 가리키는 포인터 이름들
  const ptrMap: Record<number, string[]> = {};
  for (const p of frame.state?.pointers ?? []) {
    (ptrMap[p.index] ??= []).push(cleanName(p.name));
  }
  const hasPtrs = (frame.state?.pointers ?? []).length > 0;

  const heightOf = (v: number) => (maxValue > 0 ? Math.max(0, (v / maxValue) * 100) : 0);

  // 손에 든 값(key/temp/pivot)을 배열 막대와 같은 스케일의 막대로 그린다.
  const heldBars = held.map((h, hi) => (
    <div key={`held-${hi}`} className={`bar bar--held ${h.active ? "bar--compare" : ""}`}>
      {showLabels && <span className="bar__val">{h.value}</span>}
      <div className="bar__track">
        <div className="bar__fill" style={{ height: `${heightOf(h.value)}%` }} />
      </div>
      <span className="bar__name">{cleanName(h.name)}</span>
      {hasPtrs && <span className="bar__ptrs" />}
    </div>
  ));

  const arrayBars = frame.array.map((v, i) => (
    <div key={i} className={`bar ${barState(frame, i)}`}>
      {showLabels && <span className="bar__val">{v}</span>}
      <div className="bar__track">
        <div className="bar__fill" style={{ height: `${heightOf(v)}%` }} />
      </div>
      {showLabels && <span className="bar__idx">{i}</span>}
      {hasPtrs && (
        <span className="bar__ptrs">
          {(ptrMap[i] ?? []).map((name) => (
            <span key={name} className={`ptr ptr--${name}`}>
              {name}
            </span>
          ))}
        </span>
      )}
    </div>
  ));

  const play = (
    <div className="play">
      {scalars.length > 0 && (
        <div className="scalars">
          {scalars.map((s) => (
            <span key={s.name} className="scalar">
              <span className="scalar__k">{cleanName(s.name)}</span>
              <span className="scalar__v">{s.value}</span>
            </span>
          ))}
        </div>
      )}
      <div className="bars" data-count={n} style={barsStyle}>
        {heldBars}
        {held.length > 0 && <div className="bars__divider" aria-hidden />}
        {arrayBars}
      </div>
    </div>
  );

  if (frame.tree) {
    return (
      <div className="viz viz--withtree">
        <TreePanel tree={frame.tree} />
        {play}
      </div>
    );
  }

  return play;
}
