import { useEffect, useRef } from "react";

/* ───────── B: quầng sáng trôi chậm ───────── */
function Aurora() {
  return (
    <div className="ib-aurora" aria-hidden="true">
      <span className="ib-aurora__blob ib-aurora__blob--1" />
      <span className="ib-aurora__blob ib-aurora__blob--2" />
      <span className="ib-aurora__blob ib-aurora__blob--3" />
    </div>
  );
}

/* ───────── C: mạng lưới tri thức (điểm nối điểm), dịch nhẹ theo cuộn trang ───────── */
function Network() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let pts = [];
    let frame = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 26000);
      pts = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, r: Math.random() * 1.6 + 0.8 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const shift = window.scrollY * 0.05;
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
      }
      for (let i = 0; i < pts.length; i += 1) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j += 1) {
          const b = pts[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 170) {
            ctx.strokeStyle = `rgba(103,232,249,${(1 - d / 170) * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y - shift);
            ctx.lineTo(b.x, b.y - shift);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(103,232,249,0.7)";
        ctx.beginPath();
        ctx.arc(p.x, p.y - shift, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="ib-network" aria-hidden="true" />;
}

/* ───────── D: đường đồng mức / sóng mảnh chạy dọc danh sách ───────── */
function Contours() {
  const lines = Array.from({ length: 22 }, (_, i) => {
    const base = 40 + i * 46;
    let d = "";
    for (let x = 0; x <= 3200; x += 20) {
      const t = (x / 1600) * 2 * Math.PI;
      const y = base + 14 * Math.sin(2 * t + i * 0.55) + 6 * Math.sin(5 * t + i * 1.3);
      d += `${x ? "L" : "M"}${x} ${y.toFixed(1)}`;
    }
    return { d, accent: i % 7 === 3 };
  });
  return (
    <div className="ib-contours" aria-hidden="true">
      <svg viewBox="0 0 3200 1080" preserveAspectRatio="none">
        {lines.map((l, i) => (
          <path key={i} d={l.d} fill="none" stroke={l.accent ? "#67E8F9" : "#3B82F6"} strokeOpacity={l.accent ? 0.45 : 0.2} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}

/**
 * Nền phía sau danh sách bài Insights.
 * variant: "b" quầng sáng trôi · "c" mạng lưới tri thức · "d" đường đồng mức.
 * glow (A): ảnh bìa của bài đang rê chuột, phóng to & làm mờ thành quầng sáng phía sau lưới.
 */
export default function InsightsBackdrop({ variant = "b", glow }) {
  return (
    <div className="ib" aria-hidden="true">
      {variant === "b" && <Aurora />}
      {variant === "c" && <Network />}
      {variant === "d" && <Contours />}
      <div
        className="ib-glow"
        style={{
          opacity: glow ? 0.6 : 0,
          left: glow ? `${glow.x}px` : undefined,
          top: glow ? `${glow.y}px` : undefined,
          backgroundImage: glow?.image ? `url("${glow.image}")` : undefined,
        }}
      />
    </div>
  );
}
