import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const W = 1200;
const H = 14;
const MID = H / 2;
const STEP = 12;

function wavePath(amp, length, phase) {
  let d = "";
  for (let x = 0; x <= W; x += STEP) {
    const y = MID + amp * Math.sin((x / length) * 2 * Math.PI + phase);
    d += `${x ? "L" : "M"}${x} ${y.toFixed(2)}`;
  }
  return d;
}

/**
 * Đường ngăn cách dưới header: hai sóng Electric Blue và Sunset Orange lệch pha, trôi rất chậm.
 * Lặng dần khi cuộn trang, dâng một nhịp khi chuyển trang; đứng yên nếu máy bật giảm chuyển động.
 */
export default function HeaderWave() {
  const blue = useRef(null);
  const orange = useRef(null);
  const boost = useRef(0);
  const { pathname } = useLocation();

  useEffect(() => {
    boost.current = 1;
  }, [pathname]);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      blue.current?.setAttribute("d", wavePath(2.4, 300, 0));
      orange.current?.setAttribute("d", wavePath(1.8, 230, 1.5));
      return undefined;
    }
    let frame = 0;
    let last = 0;
    let t = 0;
    let calm = 1;
    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden || now - last < 33) return; // ~30 khung hình/giây là đủ mượt
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const target = window.scrollY > 24 ? 0.35 : 1;
      calm += (target - calm) * 0.08;
      boost.current *= 0.96;
      const gain = calm * (1 + boost.current * 1.6);
      t += dt * (0.55 + boost.current * 1.5);
      blue.current?.setAttribute("d", wavePath(2.6 * gain, 300, t));
      orange.current?.setAttribute("d", wavePath(2 * gain, 230, -t * 1.3 + 1.5));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg className="pointer-events-none absolute inset-x-0 -bottom-[7px] h-[14px] w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="facs-wave-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.12" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.88" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="facs-wave-mask">
          <rect width={W} height={H} fill="url(#facs-wave-fade)" />
        </mask>
      </defs>
      <g mask="url(#facs-wave-mask)" fill="none" strokeLinecap="round">
        <path ref={blue} d={wavePath(2.6, 300, 0)} stroke="#2B5BFF" strokeOpacity="0.8" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />
        <path ref={orange} d={wavePath(2, 230, 1.5)} stroke="#FF6B35" strokeOpacity="0.8" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}
