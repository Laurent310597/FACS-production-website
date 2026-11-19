import { GRAIN_URL, waveArea } from "../../lib/waveShapes";
import WaveLayers from "../WaveLayers";

// Sóng theo màu website (cyan / xanh dương / nền navy) – không dùng cam (cam chỉ dành cho nút kêu gọi hành động).
const LAYERS = [
  { id: "s1", color: "#22D3EE", top: 0.16, line: 0.32, ...waveArea(95, 32, 0.4), dur: "150s" },
  { id: "s2", color: "#3B82F6", top: 0.2, line: 0.3, ...waveArea(140, 26, 1.9), dur: "105s", dir: "reverse" },
  { id: "s3", color: "#0EA5E9", top: 0.14, line: 0.22, ...waveArea(175, 24, 3.1), dur: "80s" },
  { id: "s4", color: "#0d1726", top: 0.95, line: 0.35, ...waveArea(220, 18, 4.4), dur: "62s", dir: "reverse", edge: "#67E8F9" },
];

/**
 * Nền phần đầu trang (hero) dùng cho mọi trang: mảng sóng trôi chậm ở đáy và hạt nhiễu nhẹ.
 * Đặt làm con đầu tiên của section/header có `relative overflow-hidden`; nội dung cần `relative z-10`.
 */
export default function SiteBackdrop() {
  return (
    <div className="site-backdrop" aria-hidden="true">
      <WaveLayers layers={LAYERS} className="site-backdrop__waves" />
      <div className="site-backdrop__grain" style={{ backgroundImage: GRAIN_URL }} />
    </div>
  );
}
