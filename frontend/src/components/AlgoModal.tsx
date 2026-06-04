import { Modal, Tag, Text } from "@studio-baeks/funky-ui";
import type { AlgoMeta } from "../lib/types";

interface Props {
  open: boolean;
  algos: AlgoMeta[];
  currentId: string | null;
  onSelect: (algo: AlgoMeta) => void;
  onClose: () => void;
}

// 카테고리 표시 순서.
const ORDER: AlgoMeta["category"][] = [
  "quadratic",
  "efficient",
  "distribution",
  "gag",
];

const TAG_COLOR: Record<AlgoMeta["category"], "cyan" | "green" | "sky" | "pink"> = {
  quadratic: "cyan",
  efficient: "green",
  distribution: "sky",
  gag: "pink",
};

export function AlgoModal({ open, algos, currentId, onSelect, onClose }: Props) {
  const groups = ORDER.map((cat) => ({
    cat,
    label: algos.find((a) => a.category === cat)?.categoryLabel ?? cat,
    items: algos.filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header onClose={onClose}>정렬 알고리즘 선택</Modal.Header>
      <Modal.Body>
        <div className="algo-groups">
          {groups.map((g) => (
            <section key={g.cat} className="algo-group">
              <Text variant="chrome" className="algo-group__title">
                {g.label}
              </Text>
              <div className="algo-grid">
                {g.items.map((a) => {
                  const active = a.id === currentId;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`algo-card funky-pressable ${active ? "algo-card--active" : ""}`}
                      onClick={() => onSelect(a)}
                    >
                      <div className="algo-card__top">
                        <span className="algo-card__name">{a.name}</span>
                        <Tag color={TAG_COLOR[a.category]}>{a.complexity}</Tag>
                      </div>
                      <span className="algo-card__note">{a.note}</span>
                      {a.gag && (
                        <span className="algo-card__warn">
                          ⚠ 개그용 · 최대 {a.maxN}개
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
}
