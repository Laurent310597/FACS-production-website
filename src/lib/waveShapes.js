// Hình sóng dùng chung cho nền CMS và website: mảng sóng rộng 2 lần màn hình,
// chu kỳ chia hết cho 1600 nên khi trôi ngang 50% sẽ lặp liền mạch.
export const WAVE_SPAN = 3200;
export const WAVE_HEIGHT = 300;

export function waveArea(base, amp, phase) {
  let crest = "";
  for (let x = 0; x <= WAVE_SPAN; x += 16) {
    const t = (x / 1600) * 2 * Math.PI;
    const y = base - amp * Math.sin(2 * t + phase) - amp * 0.38 * Math.sin(5 * t + phase * 1.7);
    crest += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
  }
  return { crest, area: `${crest}L${WAVE_SPAN} ${WAVE_HEIGHT}L0 ${WAVE_HEIGHT}Z` };
}

// Hạt nhiễu rất nhẹ để nền tối không bị loang dải màu.
export const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
