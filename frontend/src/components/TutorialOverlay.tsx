import { Button, Tag, Text } from "@studio-baeks/funky-ui";
import type { AlgoMeta } from "../lib/types";
import { EX_RADIX, EX_SIMPLE } from "./tutorial/data";
import { TheoryNotes, TUTORIALS } from "./tutorial/tutorials";
import { TutorialStepper } from "./TutorialStepper";

// 단계 실행기에 쓸 예제 배열(짧게 — 스텝이 너무 길지 않도록).
function stepExample(id: string): number[] {
  if (id === "radix") return EX_RADIX;
  if (id === "bogo") return [40, 10, 30, 20];
  return EX_SIMPLE;
}

interface Props {
  open: boolean;
  algos: AlgoMeta[];
  current: AlgoMeta | null;
  onNavigate: (id: string) => void; // 튜터 페이지를 ◀▶ 로 넘길 때
  onClose: () => void;
}

export function TutorialOverlay({ open, algos, current, onNavigate, onClose }: Props) {
  if (!open || !current) return null;
  const t = TUTORIALS[current.id];
  const idx = algos.findIndex((a) => a.id === current.id);
  const go = (d: number) => {
    if (!algos.length) return;
    const ni = (idx + d + algos.length) % algos.length;
    onNavigate(algos[ni].id);
  };

  return (
    <div className="tutor" role="dialog" aria-modal="true">
      <div className="tutor__bar">
        <div className="tutor__nav">
          <Button variant="neutral" size="sm" onClick={() => go(-1)} aria-label="이전 알고리즘">
            ◀
          </Button>
          <div className="tutor__heading">
            <Text variant="chrome" className="tutor__eyebrow">
              학습 · {current.categoryLabel}
            </Text>
            <Text variant="heading" as="h2" className="tutor__title">
              {t?.title ?? current.name}
            </Text>
          </div>
          <Button variant="neutral" size="sm" onClick={() => go(1)} aria-label="다음 알고리즘">
            ▶
          </Button>
          <Tag color="cyan">{current.complexity}</Tag>
          <span className="tutor__count">
            {idx + 1} / {algos.length}
          </span>
        </div>
        <Button variant="danger" onClick={onClose}>
          닫기
        </Button>
      </div>
      <div className="tutor__body">
        <section className="tsection">
          <h3 className="tsection__title">직접 단계별로 — “다음 스텝”을 눌러보세요</h3>
          <p className="tnote">
            예제 배열 [{stepExample(current.id).join(", ")}] 에 이 알고리즘을 적용한 모습. 한 스텝씩 넘기며
            막대 색(노랑=비교, 분홍=교환, 주황=덮어쓰기, 보라=기준, 초록=확정)이 어떻게 바뀌는지 확인하세요.
          </p>
          <TutorialStepper algoId={current.id} example={stepExample(current.id)} />
        </section>
        {t ? t.render() : <p>준비 중입니다.</p>}

        <section className="tsection tutor__theory">
          <h3 className="tsection__title">더 알아보기 — 강의 이론 (모든 알고리즘 공통)</h3>
          <TheoryNotes />
        </section>
      </div>
    </div>
  );
}
