import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Tag, Text } from "@studio-baeks/funky-ui";
import { AlgoModal } from "./components/AlgoModal";
import { BarCanvas } from "./components/BarCanvas";
import { TutorialOverlay } from "./components/TutorialOverlay";
import { listAlgorithms, randomArray, sort, warmUp } from "./lib/bridge";
import { onEngineStatus, type EngineStatus } from "./lib/pyodideEngine";
import { ensureAudio, playValue } from "./lib/sound";
import type { AlgoMeta, Frame, SortResult } from "./lib/types";

// 속도 프리셋: frame 사이 지연(ms) + 막대 색 전이 시간(ms).
// 빠를수록 전이를 짧게(거의 즉시) 해야 직전 색과 안 섞이고 또렷이 보인다.
// ms = frame 사이 지연, trans = 막대 색 전이(ms), step = 한 틱에 건너뛸 frame 수
// (빠른 속도는 렌더 한계 때문에 step 으로 실제 진행을 빠르게 한다)
const SPEEDS = [
  { label: "0.5×", ms: 320, trans: 90, step: 1 },
  { label: "1×", ms: 140, trans: 40, step: 1 },
  { label: "2×", ms: 60, trans: 10, step: 1 },
  { label: "4×", ms: 22, trans: 1, step: 1 },
  { label: "20×", ms: 8, trans: 0, step: 3 },
  { label: "50×", ms: 6, trans: 0, step: 8 },
  { label: "100×", ms: 4, trans: 0, step: 16 },
];
const DEFAULT_SPEED = 1;

export default function App() {
  const [algos, setAlgos] = useState<AlgoMeta[]>([]);
  const [current, setCurrent] = useState<AlgoMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  const [count, setCount] = useState(16);
  const [array, setArray] = useState<number[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const [result, setResult] = useState<SortResult | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED);
  const [busy, setBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(false);

  // 웹(Pyodide) 엔진 적재 상태. 데스크탑(pywebview)에선 계속 "idle" 이라 오버레이 안 뜸.
  const [engine, setEngine] = useState<{ status: EngineStatus; detail: string }>({
    status: "idle",
    detail: "",
  });
  useEffect(() => {
    const off = onEngineStatus((status, detail) => setEngine({ status, detail }));
    void warmUp(); // 웹이면 미리 데워둔다
    return off;
  }, []);

  // ── 초기 로드: 알고리즘 목록 + 첫 랜덤 배열 ──────────────
  // pywebview 브릿지 준비 타이밍이 들쭉날쭉해 목록이 비면 잠깐 뒤 재시도한다.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (let attempt = 0; alive && attempt < 8; attempt++) {
        try {
          const list = await listAlgorithms();
          if (!alive) return;
          if (list.length > 0) {
            setAlgos(list);
            const first = list.find((a) => a.id === "bubble") ?? list[0];
            setCurrent(first);
            const r = await randomArray(16, first.id);
            if (!alive) return;
            setArray(r.array);
            setCount(r.count);
            return;
          }
        } catch {
          /* 다음 시도로 */
        }
        await new Promise((res) => window.setTimeout(res, 300));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const frames: Frame[] = result?.frames ?? [];
  const maxValue = useMemo(
    () => Math.max(1, ...(array.length ? array : [1])),
    [array],
  );

  // 정렬 결과가 없을 땐 현재 배열을 정적 미리보기 frame 으로 보여준다.
  const previewFrame: Frame | null = useMemo(() => {
    if (!array.length) return null;
    return {
      array, active: [], pivot: null, sorted: [],
      action: "init", note: "준비됨 — START 를 누르세요",
      comparisons: 0, swaps: 0, aux: null,
    };
  }, [array]);

  const displayFrame: Frame | null = result ? frames[frameIdx] ?? null : previewFrame;
  const atEnd = result ? frameIdx >= frames.length - 1 : false;

  // ── 재생 타이머 ─────────────────────────────────────────
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => {
      // 빠른 속도는 한 틱에 step 만큼 건너뛰어 실제로 빨리 진행한다.
      const stepN = SPEEDS[speedIdx].step;
      setFrameIdx((i) => Math.min(i + stepN, frames.length - 1));
    }, SPEEDS[speedIdx].ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, frameIdx, atEnd, speedIdx, frames.length]);

  // ── 사운드: frame 이 바뀔 때 지금 건드리는 막대 값으로 음을 낸다(높은 값=높은 음) ──
  useEffect(() => {
    if (!soundOn || !result) return;
    const f = frames[frameIdx];
    const idx = f?.active?.[0];
    if (idx == null) return;
    const v = f.array[idx];
    if (v != null) playValue(v, maxValue);
  }, [frameIdx, soundOn, result, frames, maxValue]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) ensureAudio(); // 켤 때(제스처 안에서) 오디오 깨우기
  };

  // ── 동작 핸들러 ─────────────────────────────────────────
  const handleRandom = useCallback(
    async (n?: number) => {
      if (!current) return;
      setBusy(true);
      try {
        const r = await randomArray(n ?? count, current.id);
        setArray(r.array);
        setCount(r.count);
        setResult(null);
        setFrameIdx(0);
        setPlaying(false);
        setNotice(
          r.cappedBy
            ? `${r.cappedBy} 은(는) 최대 ${r.count}개까지만 다룹니다.`
            : null,
        );
      } finally {
        setBusy(false);
      }
    },
    [current, count],
  );

  // 정렬을 계산해 result 를 채운다(frame 0 = 초기 상태). 이미 있으면 그대로 반환.
  const computeResult = useCallback(async () => {
    if (result) return result;
    if (!current || !array.length) return null;
    setBusy(true);
    try {
      const res = await sort(current.id, array);
      setResult(res);
      setFrameIdx(0);
      setNotice(
        res.truncated ? "frame 이 많아 일부에서 시각화를 중단했습니다." : null,
      );
      return res;
    } finally {
      setBusy(false);
    }
  }, [result, current, array]);

  const handleStart = useCallback(async () => {
    setPlaying(false);
    const res = await computeResult();
    if (res) setPlaying(true);
  }, [computeResult]);

  const handleSelectAlgo = useCallback(
    async (algo: AlgoMeta) => {
      setCurrent(algo);
      setModalOpen(false);
      setResult(null);
      setFrameIdx(0);
      setPlaying(false);
      // 개그성 등 maxN 이 작은 알고리즘이면 현재 배열을 줄여 다시 만든다.
      if (array.length > algo.maxN) {
        await handleRandom(Math.min(count, algo.maxN));
      }
    },
    [array.length, count, handleRandom],
  );

  const onCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isNaN(v)) {
      setCount(2);
      return;
    }
    const max = current?.maxN ?? 60;
    setCount(Math.max(2, Math.min(v, Math.min(250, max))));
  };

  // 가운데 버튼: 재생 중이면 STOP(일시정지), 아니면 START/재생/다시.
  const handleCenter = () => {
    if (soundOn) ensureAudio(); // START 제스처 안에서 오디오 재개
    if (playing) {
      setPlaying(false);
      return;
    }
    if (!result) {
      handleStart();
      return;
    }
    if (atEnd) {
      setFrameIdx(0);
      setPlaying(true);
      return;
    }
    setPlaying(true);
  };
  // 알고리즘을 ◀ ▶ 로 하나씩 순환.
  const cycleAlgo = (d: number) => {
    if (!algos.length || !current) return;
    const idx = algos.findIndex((a) => a.id === current.id);
    const nextIdx = (idx + d + algos.length) % algos.length;
    handleSelectAlgo(algos[nextIdx]);
  };
  // 다음/이전 스텝 — START 를 안 눌렀어도 알아서 정렬을 계산하고 한 칸 이동.
  const step = async (d: number) => {
    setPlaying(false);
    if (!result) {
      const res = await computeResult();
      if (!res) return;
      setFrameIdx(Math.max(0, Math.min(res.frames.length - 1, d > 0 ? 1 : 0)));
      return;
    }
    setFrameIdx((i) => Math.max(0, Math.min(frames.length - 1, i + d)));
  };
  const reset = async () => {
    setPlaying(false);
    if (!result) {
      await computeResult(); // frame 0(초기 상태)로
      return;
    }
    setFrameIdx(0);
  };

  const stats = displayFrame;
  const aux = displayFrame?.aux ?? null;
  const centerLabel = busy
    ? "계산 중…"
    : playing
      ? "STOP"
      : !result
        ? "START"
        : atEnd
          ? "다시"
          : "재생";

  return (
    <div className="app">
      {/* ── 헤더 ── */}
      <header className="app__head">
        <div>
          <Text variant="chrome" className="app__eyebrow">
            25-059 백재원
          </Text>
          <Text variant="heading" as="h1" className="app__title">
            Sort Simulation
          </Text>
        </div>
        <div className="app__mode">
          <Button variant={soundOn ? "success" : "neutral"} onClick={toggleSound}>
            소리 {soundOn ? "ON" : "OFF"}
          </Button>
          <Button variant="warning" onClick={() => setTutorOpen(true)} disabled={!current}>
            학습
          </Button>
        </div>
      </header>

      {/* ── 컨트롤 바 ── */}
      <Card className="controls">
        <div className="controls__row">
          <div className="control">
            <Text variant="chrome" className="control__label">알고리즘</Text>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => cycleAlgo(-1)}
              disabled={!algos.length}
              aria-label="이전 알고리즘"
            >
              ◀
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              {current ? current.name : "선택…"}
            </Button>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => cycleAlgo(1)}
              disabled={!algos.length}
              aria-label="다음 알고리즘"
            >
              ▶
            </Button>
            {current && <Tag color="cyan">{current.complexity}</Tag>}
          </div>

          <div className="control control--speed">
            <Button variant="neutral" size="sm" onClick={reset} disabled={busy || !current || !array.length} className="control__reset">
              처음으로
            </Button>
            {SPEEDS.map((s, i) => (
              <Button
                key={s.label}
                size="sm"
                variant={i === speedIdx ? "primary" : "neutral"}
                onClick={() => setSpeedIdx(i)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
        {notice && <div className="controls__notice">{notice}</div>}
      </Card>

      {/* ── 시각화 무대 ── */}
      <Card className="stage" padded={false}>
        <BarCanvas frame={displayFrame} maxValue={maxValue} transMs={SPEEDS[speedIdx].trans} />
        {aux && (
          <div className="buckets">
            {aux.map((bucket, d) => (
              <div key={d} className="bucket">
                <span className="bucket__idx">{d}</span>
                <span className="bucket__items">{bucket.join(" ") || "·"}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── 액션 + 트랜스포트 ── */}
      <div className="action">
        <div className="action__side action__setup">
          <Text variant="chrome" className="control__label">케이스 수</Text>
          <Input
            type="number"
            min={2}
            max={Math.min(250, current?.maxN ?? 250)}
            value={count}
            onChange={onCountChange}
            className="control__count"
          />
          <Button
            variant="info"
            onClick={() => handleRandom()}
            disabled={busy || !current}
          >
            RANDOM
          </Button>
        </div>

        <div className="action__center">
          <Button
            variant="neutral"
            size="lg"
            className="action__step"
            onClick={() => step(-1)}
            disabled={busy || !current || !array.length}
          >
            ◀ 이전 스텝
          </Button>
          <Button
            variant={playing ? "danger" : "success"}
            size="lg"
            className="action__start"
            onClick={handleCenter}
            disabled={busy || !current || !array.length}
          >
            {centerLabel}
          </Button>
          <Button
            variant="neutral"
            size="lg"
            className="action__step"
            onClick={() => step(1)}
            disabled={busy || !current || !array.length}
          >
            다음 스텝 ▶
          </Button>
        </div>

        <div className="action__side action__stats">
          <StatChip label="비교" value={stats?.comparisons ?? 0} />
          <StatChip label="교환" value={stats?.swaps ?? 0} />
          <StatChip
            label="frame"
            value={result ? `${frameIdx + 1}/${frames.length}` : "—"}
          />
        </div>
      </div>

      {/* ── 현재 단계 설명 ── */}
      <div className="caption">
        <span className={`caption__dot caption__dot--${displayFrame?.action ?? "idle"}`} />
        <span className="caption__text">
          {displayFrame?.note || "대기 중"}
        </span>
      </div>

      <AlgoModal
        open={modalOpen}
        algos={algos}
        currentId={current?.id ?? null}
        onSelect={handleSelectAlgo}
        onClose={() => setModalOpen(false)}
      />

      <TutorialOverlay
        open={tutorOpen}
        algos={algos}
        current={current}
        onNavigate={(id) => setCurrent(algos.find((a) => a.id === id) ?? current)}
        onClose={() => setTutorOpen(false)}
      />

      {engine.status === "loading" && (
        <div className="engine-gate">
          <Card className="engine-gate__card">
            <div className="engine-gate__spinner" aria-hidden />
            <Text variant="heading" as="h2" className="engine-gate__title">
              Python 엔진 준비 중
            </Text>
            <Text className="engine-gate__detail">
              {engine.detail || "불러오는 중"} — 강의 기반 정렬 코드를 브라우저에서
              그대로 실행합니다.
            </Text>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="statchip">
      <span className="statchip__label">{label}</span>
      <span className="statchip__value">{value}</span>
    </div>
  );
}
