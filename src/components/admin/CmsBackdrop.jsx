import { useEffect, useRef } from "react";

// Hạt nhiễu rất nhẹ để nền tối không bị loang dải màu.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// Một dải sóng rộng 2 lần màn hình, lặp liền mạch để trôi ngang vô tận.
function contour(offset, amp, len, count = 2) {
  const w = 1600 * count;
  let d = "";
  for (let x = 0; x <= w; x += 20) {
    const y = offset + amp * Math.sin((x / len) * 2 * Math.PI) + amp * 0.35 * Math.sin((x / (len * 0.47)) * 2 * Math.PI);
    d += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
  }
  return d;
}
const LINES = Array.from({ length: 9 }, (_, i) => ({ d: contour(40 + i * 26, 18 + i * 2.2, 800), accent: i === 4 }));

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
      <svg className="facs-backdrop__lines" viewBox="0 0 3200 300" preserveAspectRatio="none">
        {LINES.map((line, i) => (
          <path
            key={i}
            d={line.d}
            fill="none"
            stroke={line.accent ? "#FF6B35" : "#2B5BFF"}
            strokeOpacity={line.accent ? 0.22 : 0.07 + i * 0.012}
            strokeWidth={line.accent ? 1.4 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="facs-backdrop__grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
