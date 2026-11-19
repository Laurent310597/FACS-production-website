import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function Rings({ id }) {
  return (
    <svg viewBox="0 0 600 600" className="site-side__rings" aria-hidden="true">
      <defs>
        <linearGradient id={`ring-${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#67E8F9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3B82F6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g className="site-side__spin">
        <circle cx="300" cy="300" r="290" fill="none" stroke={`url(#ring-${id})`} strokeWidth="1" />
        <circle cx="300" cy="300" r="290" fill="none" stroke="#67E8F9" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="60 1762" strokeLinecap="round" />
        <circle cx="300" cy="10" r="4" fill="#67E8F9" />
      </g>
      <g className="site-side__spin site-side__spin--rev">
        <circle cx="300" cy="300" r="220" fill="none" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="2 10" />
        <circle cx="520" cy="300" r="3" fill="#3B82F6" fillOpacity="0.9" />
      </g>
      <g className="site-side__spin site-side__spin--slow">
        <circle cx="300" cy="300" r="150" fill="none" stroke={`url(#ring-${id})`} strokeWidth="1" strokeOpacity="0.6" />
        <circle cx="300" cy="300" r="150" fill="none" stroke="#22D3EE" strokeOpacity="0.5" strokeWidth="1.5" strokeDasharray="120 822" strokeLinecap="round" />
      </g>
      <circle cx="300" cy="300" r="80" fill="none" stroke="#67E8F9" strokeOpacity="0.2" strokeWidth="1" />
    </svg>
  );
}

/**
 * Trang trí hai bên lề website (màn hình rộng): đường viền sáng có hạt sáng chạy dọc, vòng tròn đồng tâm xoay chậm
 * và xoay thêm theo thao tác cuộn trang. Không nhận chuột, không hiện trong CMS và trên màn hình hẹp.
 */
export default function SiteSideDecor() {
  const { pathname } = useLocation();
  const ref = useRef(null);
  const hidden = pathname.startsWith("/admin");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        el.style.setProperty("--scroll-rot", `${(y * 0.06).toFixed(2)}deg`);
        el.style.setProperty("--scroll-shift", `${(-y * 0.04).toFixed(1)}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [hidden]);

  if (hidden) return null;
  return (
    <div ref={ref} className="site-side" aria-hidden="true">
      <div className="site-side__col site-side__col--left">
        <span className="site-side__rail" />
        <span className="site-side__spark" />
        <div className="site-side__ring-wrap"><Rings id="l" /></div>
      </div>
      <div className="site-side__col site-side__col--right">
        <span className="site-side__rail" />
        <span className="site-side__spark site-side__spark--up" />
        <div className="site-side__ring-wrap"><Rings id="r" /></div>
      </div>
    </div>
  );
}
