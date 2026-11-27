import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const SIZE = 330; // đường kính khung vòng (px)
const R = 145; // bán kính vòng chặng
const C = SIZE / 2;
const GAP = 4; // khoảng hở giữa các chặng (độ)

const polar = (deg, r = R) => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};
const arc = (from, to, r = R) => {
  const [x1, y1] = polar(from, r);
  const [x2, y2] = polar(to, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

// Các phần (chặng) của trang: section cấp ngoài cùng, đủ cao, không nằm trong header/footer/CMS.
function readSections() {
  const all = [...document.querySelectorAll("section, main > header, body > div header.border-b")].filter((el) => {
    if (el.closest(".facs-cms, footer, nav, [role=dialog]")) return false;
    if (el.parentElement?.closest("section")) return false;
    return el.getBoundingClientRect().height > 160;
  });
  return all.map((el, i) => {
    const heading = el.querySelector("h1, h2");
    const text = (heading?.textContent || "").replace(/\s+/g, " ").trim();
    return { el, label: text.length > 34 ? `${text.slice(0, 32)}…` : text || `Phần ${i + 1}` };
  });
}

/**
 * Vòng định vị bên phải (màn hình từ 1440px): vòng chia thành các chặng ứng với từng phần của trang đang xem.
 * Cuộn tới đâu, vòng xoay để chặng tương ứng nằm ở kim chỉ (giữa màn hình); bấm vào chặng để nhảy tới phần đó.
 */
export default function SiteSideDecor() {
  const { pathname } = useLocation();
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/card/");
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(0);
  const ringRef = useRef(null);
  const sectionsRef = useRef([]);

  // Đọc lại danh sách chặng khi đổi trang, khi nội dung thay đổi và khi đổi kích thước cửa sổ.
  useEffect(() => {
    if (hidden) return undefined;
    let timer = 0;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = readSections();
        sectionsRef.current = next;
        setSections((prev) => (prev.length === next.length && prev.every((p, i) => p.label === next[i].label) ? prev : next));
      }, 250);
    };
    refresh();
    const later = setTimeout(refresh, 900);
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", refresh);
    return () => {
      clearTimeout(timer);
      clearTimeout(later);
      mo.disconnect();
      window.removeEventListener("resize", refresh);
    };
  }, [pathname, hidden]);

  // Cuộn trang → góc xoay của vòng.
  useEffect(() => {
    if (hidden || !sections.length) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const list = sectionsRef.current;
      if (!list.length || !ringRef.current) return;
      const line = window.innerHeight / 2;
      let progress = 0;
      for (let i = 0; i < list.length; i += 1) {
        const r = list[i].el.getBoundingClientRect();
        if (line >= r.top) progress = i + Math.min(1, (line - r.top) / Math.max(r.height, 1));
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) progress = list.length - 0.5;
      progress = Math.max(0.0001, Math.min(list.length - 0.0001, progress));
      const seg = 360 / list.length;
      ringRef.current.style.setProperty("--ring-rot", `${(-progress * seg).toFixed(2)}deg`);
      const idx = Math.floor(progress);
      setActive((a) => (a === idx ? a : idx));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [sections, hidden]);

  const jump = useCallback((i) => {
    const el = sectionsRef.current[i]?.el;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Bàn phím: Enter/Space tới phần đó; mũi tên lên/trái = phần trước, xuống/phải = phần sau; Home/End = đầu/cuối.
  const onSegKey = (e, i) => {
    const total = sectionsRef.current.length;
    let target = null;
    if (e.key === "Enter" || e.key === " ") target = i;
    else if (e.key === "ArrowDown" || e.key === "ArrowRight") target = Math.min(i + 1, total - 1);
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") target = Math.max(i - 1, 0);
    else if (e.key === "Home") target = 0;
    else if (e.key === "End") target = total - 1;
    if (target === null) return;
    e.preventDefault();
    jump(target);
    if (target !== i) ringRef.current?.querySelectorAll(".site-ring__seg")[target]?.focus({ preventScroll: true });
  };

  if (hidden || sections.length < 2) return null;
  const n = sections.length;
  const seg = 360 / n;

  return (
    <div className="site-side">
      <nav className="site-ring" aria-label="Các phần của trang">
        <div className="site-ring__label">
          <span className="site-ring__count">{String(active + 1).padStart(2, "0")}<span>/{String(n).padStart(2, "0")}</span></span>
        </div>
        <svg ref={ringRef} className="site-ring__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
          <defs>
            <linearGradient id="site-ring-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#67E8F9" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          {/* Vòng trang trí bên trong (tự xoay chậm) */}
          <g className="site-ring__spin">
            <circle cx={C} cy={C} r={R - 26} fill="none" stroke="#60A5FA" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="2 8" />
            <circle cx={C + R - 26} cy={C} r="2" fill="#60A5FA" />
          </g>
          <circle cx={C} cy={C} r={R - 52} fill="none" stroke="#67E8F9" strokeOpacity="0.1" />
          {/* Các chặng: xoay theo vị trí cuộn */}
          <g className="site-ring__rot">
            {sections.map((s, i) => {
              const from = 180 + i * seg + GAP / 2;
              const to = 180 + (i + 1) * seg - GAP / 2;
              const on = i === active;
              const [tx, ty] = polar(180 + (i + 0.5) * seg, R + 15);
              return (
                <g
                  key={`${i}-${s.label}`}
                  className="site-ring__seg"
                  role="button"
                  tabIndex={0}
                  aria-label={`${String(i + 1).padStart(2, "0")}/${String(n).padStart(2, "0")}: ${s.label}`}
                  aria-current={on ? "true" : undefined}
                  onClick={() => jump(i)}
                  onKeyDown={(e) => onSegKey(e, i)}
                >
                  <title>{s.label}</title>
                  <path d={arc(from, to)} fill="none" stroke="transparent" strokeWidth="22" />
                  <path d={arc(from, to)} fill="none" stroke={on ? "url(#site-ring-grad)" : "#67E8F9"} strokeOpacity={on ? 1 : 0.28} strokeWidth={on ? 3.5 : 1.8} strokeLinecap="round" />
                  <text
                    x={tx}
                    y={ty}
                    className="site-ring__num"
                    style={{ transformOrigin: `${tx.toFixed(1)}px ${ty.toFixed(1)}px` }}
                    fill={on ? "#CFFAFE" : "#67E8F9"}
                    fillOpacity={on ? 1 : 0.45}
                    fontSize="10.5"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </text>
                </g>
              );
            })}
          </g>
          {/* Kim chỉ cố định ở giữa màn hình */}
          <circle cx={C - R} cy={C} r="6" fill="#0d1726" stroke="#67E8F9" strokeWidth="2" />
          <circle cx={C - R} cy={C} r="2.2" fill="#67E8F9" />
        </svg>
      </nav>
    </div>
  );
}
