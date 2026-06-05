// 막대 값에 따라 음을 내는 사운드 (도레미파솔라시도 = C 장조 음계).
// 값이 높을수록 높은 음. Web Audio 로 짧은 비프음을 낸다.

let ctx: AudioContext | null = null;
let last = 0;

// C 장조 음계(도·레·미·파·솔·라·시)를 여러 옥타브로 펼친 주파수 표.
const SCALE: number[] = (() => {
  const steps = [0, 2, 4, 5, 7, 9, 11]; // 도 레 미 파 솔 라 시 (반음 오프셋)
  const C4 = 261.63; // 가운데 도 — 최저음을 여기로 (이전 C3 는 너무 낮았음)
  const out: number[] = [];
  for (let oct = 0; oct <= 2; oct++) {
    for (const s of steps) out.push(C4 * Math.pow(2, oct + s / 12));
  }
  out.push(C4 * Math.pow(2, 3)); // 맨 위 도(C7)
  return out;
})();

// 사용자 제스처(버튼 클릭) 안에서 호출해 오디오를 깨운다.
export function ensureAudio(): void {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* 오디오 미지원 환경은 조용히 무시 */
  }
}

// 값 → 음계 인덱스 → 주파수. 짧게 친다.
export function playValue(value: number, maxValue: number): void {
  if (!ctx) return;
  const t = performance.now();
  if (t - last < 18) return; // 너무 잦은 발음 방지(빠른 속도에서 과부하)
  last = t;

  try {
    if (ctx.state === "suspended") void ctx.resume(); // 절전으로 멈췄으면 다시 깨움

    const frac = maxValue > 1 ? (value - 1) / (maxValue - 1) : 0;
    const idx = Math.max(0, Math.min(SCALE.length - 1, Math.round(frac * (SCALE.length - 1))));
    const freq = SCALE[idx];

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle"; // 사각파보다 부드러움
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  } catch {
    /* 오디오 오류는 무시(시각화는 계속) */
  }
}
