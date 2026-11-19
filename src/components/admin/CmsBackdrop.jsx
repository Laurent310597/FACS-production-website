import { useEffect, useRef } from "react";
import { GRAIN_URL as GRAIN, waveArea } from "../../lib/waveShapes";
import WaveLayers from "../WaveLayers";
import DiagonalWaves, { ribbon } from "../site/DiagonalWaves";

// Các lớp từ xa tới gần: lớp xa trôi chậm, lớp gần trôi nhanh hơn (tạo chiều sâu).
const LAYERS = [
  { id: "w1", color: "#2B5BFF", top: 0.2, line: 0.3, ...waveArea(90, 34, 0), dur: "140s" },
  { id: "w2", color: "#FF6B35", top: 0.13, line: 0.42, ...waveArea(130, 24, 1.4), dur: "110s", dir: "reverse" },
  { id: "w3", color: "#1F44D6", top: 0.24, line: 0.26, ...waveArea(165, 28, 2.6), dur: "85s" },
  { id: "w4", color: "#0A1536", top: 0.92, line: 0.32, ...waveArea(210, 20, 4.1), dur: "65s", dir: "reverse", edge: "#2B5BFF" },
];

// Mảng sóng chéo (góc phải trên → góc trái dưới) theo bảng màu CMS: Electric là chủ đạo, một dải Sunset rất nhạt.
const DIAG = [
  { id: "c1", color: "#2B5BFF", alpha: 0.14, line: 0.32, ...ribbon(0.4, 30, 120), dur: "130s", bob: "12s", offset: "6%" },
  { id: "c2", color: "#1F44D6", alpha: 0.16, line: 0.26, ...ribbon(1.9, 26, 140), dur: "100s", bob: "14s", offset: "22%", dir: "reverse" },
  { id: "c3", color: "#FF6B35", alpha: 0.06, line: 0.18, ...ribbon(3.1, 32, 100), dur: "150s", bob: "10s", offset: "39%" },
  { id: "c4", color: "#4F7BFF", alpha: 0.1, line: 0.24, ...ribbon(4.3, 24, 130), dur: "115s", bob: "16s", offset: "55%", dir: "reverse" },
  { id: "c5", color: "#2B5BFF", alpha: 0.12, line: 0.28, ...ribbon(5.5, 30, 120), dur: "140s", bob: "11s", offset: "71%" },
];

/**
 * Nền CMS: lưới chấm mờ (sáng lên quanh con trỏ), mảng sóng chéo, các mảng sóng trôi chậm ở cuối trang
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
      <DiagonalWaves bands={DIAG} className="facs-backdrop__diag" />
      <WaveLayers layers={LAYERS} className="facs-backdrop__waves" />
      <div className="facs-backdrop__grain" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
