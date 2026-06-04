// 튜터 페이지용 시각화 컴포넌트. 색은 funky 토큰을 CSS 클래스로 매핑.
import type { ReactNode } from "react";
import { mergeLevels } from "./data";
import type { MemRow, RadixPass, TNode } from "./data";

// ── 메모리 변화 표 ──────────────────────────────────────
export function MemoryTable({
  rows,
  showIndex = true,
  activeLast = false,
}: {
  rows: MemRow[];
  showIndex?: boolean;
  activeLast?: boolean;
}) {
  const n = rows[0]?.cells.length ?? 0;
  return (
    <div className="memtable-wrap">
      <table className="memtable">
        {showIndex && (
          <thead>
            <tr>
              <th className="memtable__lab">index →</th>
              {Array.from({ length: n }, (_, i) => (
                <th key={i}>{i}</th>
              ))}
              <th className="memtable__note">설명</th>
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={activeLast && ri === rows.length - 1 ? "memrow--active" : undefined}>
              <th className="memtable__lab">{row.label}</th>
              {row.cells.map((c, ci) => (
                <td key={ci} className={`memcell ${c.mark ? `memcell--${c.mark}` : ""}`}>
                  {c.v}
                </td>
              ))}
              <td className="memtable__note">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 이진 트리 (BST / heap) ──────────────────────────────
function layout(root: TNode) {
  const pos = new Map<TNode, { x: number; depth: number }>();
  let counter = 0;
  let maxDepth = 0;
  const rec = (n: TNode | null, depth: number) => {
    if (!n) return;
    rec(n.l ?? null, depth + 1);
    pos.set(n, { x: counter++, depth });
    maxDepth = Math.max(maxDepth, depth);
    rec(n.r ?? null, depth + 1);
  };
  rec(root, 0);
  return { pos, total: counter, maxDepth };
}

export function TreeView({ root, caption }: { root: TNode | null; caption?: string }) {
  if (!root) return null;
  const { pos, total, maxDepth } = layout(root);
  const colW = 58;
  const rowH = 70;
  const r = 19;
  const padX = 16;
  const padY = 16;
  const W = total * colW + padX * 2;
  const H = (maxDepth + 1) * rowH + padY * 2;
  const px = (x: number) => padX + (x + 0.5) * colW;
  const py = (d: number) => padY + r + d * rowH;

  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const walk = (n: TNode) => {
    const p = pos.get(n)!;
    for (const ch of [n.l, n.r]) {
      if (ch) {
        const cp = pos.get(ch)!;
        edges.push({ x1: px(p.x), y1: py(p.depth), x2: px(cp.x), y2: py(cp.depth) });
        walk(ch);
      }
    }
  };
  walk(root);

  return (
    <figure className="treefig">
      <svg className="treeview" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={caption ?? "tree"}>
        {edges.map((e, i) => (
          <line key={i} className="tree-edge" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
        ))}
        {[...pos.entries()].map(([node, p], i) => (
          <g key={i}>
            <circle
              className={`tree-node ${node.mark ? `tree-node--${node.mark}` : ""}`}
              cx={px(p.x)}
              cy={py(p.depth)}
              r={r}
            />
            <text className="tree-text" x={px(p.x)} y={py(p.depth)} dominantBaseline="central" textAnchor="middle">
              {node.v}
            </text>
          </g>
        ))}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

// 힙: 배열 인덱스 매핑을 함께 보여준다.
export function HeapArrayMap({ a }: { a: number[] }) {
  return (
    <div className="heapmap">
      {a.map((v, i) => (
        <div key={i} className="heapmap__cell">
          <span className="heapmap__v">{v}</span>
          <span className="heapmap__i">[{i}]</span>
        </div>
      ))}
    </div>
  );
}

// ── 기수정렬 버킷 ───────────────────────────────────────
export function BucketGrid({ pass, index }: { pass: RadixPass; index: number }) {
  return (
    <div className="bucketpass">
      <div className="bucketpass__title">
        {index + 1}단계 · 자리값 {pass.exp} 기준 분배
      </div>
      <div className="buckets10">
        {pass.buckets.map((b, d) => (
          <div key={d} className="bkt">
            <span className="bkt__d">{d}</span>
            <span className="bkt__v">{b.length ? b.join("  ") : "·"}</span>
          </div>
        ))}
      </div>
      <div className="bucketpass__after">
        <b>모으기</b> → {pass.after.join("  ")}
      </div>
    </div>
  );
}

// ── 머지 분할/병합 ─────────────────────────────────────
function SegRow({ level, sorted }: { level: number[][]; sorted?: boolean }) {
  return (
    <div className="segrow">
      {level.map((seg, i) => (
        <span key={i} className={`seg ${sorted ? "seg--sorted" : ""}`}>
          {seg.join(" ")}
        </span>
      ))}
    </div>
  );
}

export function SplitMerge({ arr }: { arr: number[] }) {
  const levels = mergeLevels(arr);
  const merged = [...levels].reverse().map((level) => level.map((seg) => [...seg].sort((a, b) => a - b)));
  return (
    <div className="splitmerge">
      <div className="splitmerge__phase">① 분할 (divide) — 길이 1이 될 때까지 반으로</div>
      {levels.map((level, i) => (
        <SegRow key={`d${i}`} level={level} />
      ))}
      <div className="splitmerge__phase">② 병합 (merge) — 두 정렬리스트를 합치며 위로</div>
      {merged.map((level, i) => (
        <SegRow key={`m${i}`} level={level} sorted />
      ))}
    </div>
  );
}

// ── 복잡도 / 특징 카드 ─────────────────────────────────
export interface Complexity {
  best?: string;
  avg: string;
  worst?: string;
  space: string;
  stable: boolean;
  inPlace: boolean;
}
export function ComplexityCard({ c }: { c: Complexity }) {
  const chips: [string, string][] = [
    ["평균", c.avg],
    ...(c.best ? ([["최선", c.best]] as [string, string][]) : []),
    ...(c.worst ? ([["최악", c.worst]] as [string, string][]) : []),
    ["메모리", c.space],
    ["안정성", c.stable ? "stable" : "unstable"],
    ["제자리", c.inPlace ? "in-place" : "추가 메모리"],
  ];
  return (
    <div className="cxcard">
      {chips.map(([k, v]) => (
        <div key={k} className="cxchip">
          <span className="cxchip__k">{k}</span>
          <span className="cxchip__v">{v}</span>
        </div>
      ))}
    </div>
  );
}

// ── 공통 소품 ───────────────────────────────────────────
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="tlist">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Pseudo({ code }: { code: string }) {
  return <pre className="pseudo">{code}</pre>;
}

// 본문 설명 단락(친절한 ~이다 체 서술용).
export function Prose({ children }: { children: ReactNode }) {
  return <p className="tprose">{children}</p>;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="tsection">
      <h3 className="tsection__title">{title}</h3>
      {children}
    </section>
  );
}

export function ProsCons({ pros, cons }: { pros: string[]; cons: string[] }) {
  return (
    <div className="proscons">
      <div className="proscons__col proscons__col--pro">
        <h4>장점</h4>
        <ul>{pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </div>
      <div className="proscons__col proscons__col--con">
        <h4>단점</h4>
        <ul>{cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
      </div>
    </div>
  );
}
