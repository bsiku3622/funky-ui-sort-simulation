// 학습 페이지용 인터랙티브 단계 실행기.
// 백엔드(또는 mock)의 frame 시퀀스를 재사용해 "다음 스텝"마다 막대가 변한다.
import { useEffect, useState } from "react";
import { Button } from "@studio-baeks/funky-ui";
import { sort } from "../lib/bridge";
import type { Frame } from "../lib/types";
import { BarCanvas } from "./BarCanvas";

const ACTION_LABEL: Record<string, string> = {
  init: "시작",
  compare: "비교",
  swap: "교환",
  overwrite: "덮어쓰기",
  select: "선택",
  pivot: "기준(pivot/gap)",
  done: "완료",
};

export function TutorialStepper({ algoId, example }: { algoId: string; example: number[] }) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  // 막대 높이 기준(Max). 실제로 정렬한 입력에서 뽑아 frame 데이터와 항상 일치시킨다.
  const [maxValue, setMaxValue] = useState(1);
  const exampleKey = example.join(",");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFrames([]);
    setIdx(0);
    sort(algoId, example).then((res) => {
      if (!alive) return;
      setFrames(res.frames);
      setMaxValue(Math.max(1, ...res.input));
      setIdx(0);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // algoId / example 이 바뀌면 다시 계산.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algoId, exampleKey]);

  const total = frames.length;
  const frame = frames[idx] ?? null;
  const go = (d: number) => setIdx((i) => Math.max(0, Math.min(total - 1, i + d)));
  const atEnd = idx >= total - 1;

  return (
    <div className="stepper">
      {/* 무대 높이는 모든 페이지에서 동일 (app.css의 .stepper__stage 고정 높이) */}
      <div className="stepper__stage">
        {loading ? (
          <div className="stepper__loading">불러오는 중…</div>
        ) : (
          <BarCanvas frame={frame} maxValue={maxValue} transMs={1} />
        )}
      </div>

      <div className="stepper__bar">
        <Button variant="neutral" size="sm" onClick={() => setIdx(0)} disabled={loading || idx === 0}>
          처음으로
        </Button>
        <Button variant="neutral" size="sm" onClick={() => go(-1)} disabled={loading || idx === 0}>
          ◀ 이전 스텝
        </Button>
        <Button variant="success" size="sm" onClick={() => go(1)} disabled={loading || atEnd}>
          다음 스텝 ▶
        </Button>
        <span className="stepper__count">{loading ? "…" : `${idx + 1} / ${total}`}</span>
        <span className="stepper__stat">
          비교 <b>{frame?.comparisons ?? 0}</b> · 교환 <b>{frame?.swaps ?? 0}</b>
        </span>
      </div>

      <div className={`stepper__note stepper__note--${frame?.action ?? "idle"}`}>
        {frame && <span className="stepper__tag">{ACTION_LABEL[frame.action] ?? frame.action}</span>}
        <span>{loading ? "예제 배열로 단계별 실행을 준비 중…" : frame?.note || "—"}</span>
      </div>
    </div>
  );
}
