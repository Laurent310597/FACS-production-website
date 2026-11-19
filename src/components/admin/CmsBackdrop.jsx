import { useEffect, useRef } from "react";
import { GRAIN_URL as GRAIN, waveArea } from "../../lib/waveShapes";
import WaveLayers from "../WaveLayers";

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
      <WaveLayers layers={LAYERS} className="facs-backdrop__waves" />
      <div className="facs-backdrop__grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
