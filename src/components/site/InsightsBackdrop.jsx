// Nền phía sau danh sách Insights: mảng sóng chéo (D) + quầng sáng nhỏ theo ảnh bìa bài đang rê chuột (A).
import DiagonalWaves from "./DiagonalWaves";

export default function InsightsBackdrop({ glow }) {
  return (
    <div className="ib" aria-hidden="true">
      <DiagonalWaves />
      <div
        className="ib-glow"
        style={{
          opacity: glow ? 0.38 : 0,
          left: glow ? `${glow.x}px` : undefined,
          top: glow ? `${glow.y}px` : undefined,
          backgroundImage: glow?.image ? `url("${glow.image}")` : undefined,
        }}
      />
    </div>
  );
}
