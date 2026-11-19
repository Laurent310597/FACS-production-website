import { useEffect, useRef } from "react";

// Hạt nhiễu rất nhẹ để nền tối không bị loang dải màu.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Một mảng sóng rộng 2 lần màn hình (chu kỳ chia hết cho 1600 nên lặp liền mạch khi trôi ngang).
const SPAN = 3200;
const HEIGHT = 300;
function waveArea(base, amp, phase) {
  let crest = "";
  for (let x = 0; x <= SPAN; x += 16) {
    const t = (x / 1600) * 2 * Math.PI;
    const y = base - amp * Math.sin(2 * t + phase) - amp * 0.38 * Math.sin(5 * t + phase * 1.7);
    crest += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
  }
  return { crest, area: `${crest}L${SPAN} ${HEIGHT}L0 ${HEIGHT}Z` };
}
// Các lớp từ xa tới gần: lớp xa trôi chậm, lớp gần trôi nhanh hơn (tạo chiều sâu).
const LAYERS = [
  { id: "w1", color: "#2B5BFF", top: 0.2, line: 0.3, ...waveArea(90, 34, 0), dur: "140s" },
  { id: "w2", color: "#FF6B35", top: 0.13, line: 0.42, ...waveArea(130, 24, 1.4), dur: "110s", dir: "reverse" },
  { id: "w3", color: "#1F44D6", top: 0.24, line: 0.26, ...waveArea(165, 28, 2.6), dur: "85s" },
  { id: "w4", color: "#0A1536", top: 0.92, line: 0.32, ...waveArea(210, 20, 4.1), dur: "65s", dir: "reverse", edge: "#2B5BFF" },
];

/**
 * Nền CMS: lưới chấm mờ (sáng lên quanh con trỏ), các đường đồng mức trôi chậm ở cuối trang
 * (nối tiếp hình sóng của header), quầng sáng và hạt nhiễu. Nằm cố định phía sau, không nhận chuột.
 */
export default function CmsBackdrop() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(pointer: coarse)").matches) return undefined;
    let frame = 0;
    let x = 0;
    let y = 0;
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame)
        frame = requestAnimationFrame(() => {
          frame = 0;
          el.style.setProperty("--cx", `${x}px`);
          el.style.setProperty("--cy", `${y}px`);
          el.style.setProperty("--reveal", "1");
        });
    };
    const onLeave = () => el.style.setProperty("--reveal", "0");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="facs-backdrop" aria-hidden="true">
      <div className="facs-backdrop__grid" />
      <div className="facs-backdrop__grid facs-backdrop__grid--lit" />
      <div className="facs-backdrop__waves">
        {LAYERS.map((layer) => (
          <svg
            key={layer.id}
            className="facs-backdrop__wave"
            style={{ "--dur": layer.dur, "--dir": layer.dir || "normal" }}
            viewBox={`0 0 ${SPAN} ${HEIGHT}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`facs-${layer.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={layer.color} stopOpacity={layer.top} />
                <stop offset="1" stopColor={layer.color} stopOpacity={layer.top * 0.25} />
              </linearGradient>
            </defs>
            <path d={layer.area} fill={`url(#facs-${layer.id})`} />
            <path d={layer.crest} fill="none" stroke={layer.edge || layer.color} strokeOpacity={layer.line} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        ))}
      </div>
      <div className="facs-backdrop__grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
