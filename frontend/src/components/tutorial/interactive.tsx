// 학습 페이지용 인터랙티브 단계 요소 — 메모리 표 / 트리 노드 삽입.
import { useState } from "react";
import { Button } from "@studio-baeks/funky-ui";
import { buildBST, heapArrayToTree, heapInsert } from "./data";
import type { MemRow, TNode } from "./data";
import { MemoryTable, TreeView } from "./visuals";

function StepBar({
  idx,
  total,
  set,
  extra,
}: {
  idx: number;
  total: number;
  set: (n: number) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="stepper__bar">
      <Button variant="neutral" size="sm" onClick={() => set(0)} disabled={idx === 0}>
        처음으로
      </Button>
      <Button variant="neutral" size="sm" onClick={() => set(Math.max(0, idx - 1))} disabled={idx === 0}>
        ◀ 이전 스텝
      </Button>
      <Button variant="success" size="sm" onClick={() => set(Math.min(total - 1, idx + 1))} disabled={idx >= total - 1}>
        다음 스텝 ▶
      </Button>
      <span className="stepper__count">
        {idx + 1} / {total}
      </span>
      {extra && <span className="stepper__stat">{extra}</span>}
    </div>
  );
}

// ── 메모리 변화 표를 한 행씩 펼치며 보기 ──────────────────
export function InteractiveMemoryTable({ rows }: { rows: MemRow[] }) {
  const [idx, setIdx] = useState(0);
  const cur = rows[idx];
  const shown = rows.slice(0, idx + 1);
  return (
    <div className="stepper">
      <div className="stepper__tablewrap">
        <MemoryTable rows={shown} activeLast />
      </div>
      <StepBar idx={idx} total={rows.length} set={setIdx} />
      <div className="stepper__note">
        {cur?.label && <span className="stepper__tag">{cur.label}</span>}
        <span>{cur?.note ?? "—"}</span>
      </div>
    </div>
  );
}

// ── 트리에 노드를 하나씩 삽입하며 보기 ────────────────────
function markValue(node: TNode | null, value: number, mark = "new") {
  if (!node) return;
  if (node.v === value) node.mark = mark;
  markValue(node.l ?? null, value, mark);
  markValue(node.r ?? null, value, mark);
}

export function InteractiveTreeInsert({ values, mode }: { values: number[]; mode: "bst" | "heap" }) {
  const [idx, setIdx] = useState(0);
  const prefix = values.slice(0, idx + 1);
  const justInserted = values[idx];
  const root = mode === "bst" ? buildBST(prefix) : heapArrayToTree(heapInsert(prefix));
  if (root) markValue(root, justInserted);
  const note =
    mode === "bst"
      ? `값 ${justInserted} 삽입 — 루트부터 작으면 왼쪽 / 크면 오른쪽으로 내려가 빈 자리에 매단다.`
      : `값 ${justInserted} 삽입 — 맨 끝에 넣고 부모보다 크면 위로 올라간다(sift-up).`;
  return (
    <div className="stepper">
      <div className="stepper__stage stepper__stage--tree">
        <TreeView root={root} />
      </div>
      <StepBar idx={idx} total={values.length} set={setIdx} />
      <div className="stepper__note stepper__note--insert">
        <span className="stepper__tag">삽입 {idx + 1}</span>
        <span>{note}</span>
      </div>
    </div>
  );
}
