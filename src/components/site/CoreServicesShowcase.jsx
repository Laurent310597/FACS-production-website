import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { services } from "../../data/services";

// Khối "dịch vụ trọng tâm" kiểu cột chuyển ảnh: chọn cột nào thì ảnh nền đổi theo dịch vụ đó.
// Ảnh: Unsplash (miễn phí, Unsplash License) – Vitaly Gariev, Kelly Sikkema.
const unsplash = (id, w) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const CORE = [
  { slug: "accounting-reports", photo: "photo-1758873271740-f1fd6c6f1524", position: "50% 45%" },
  { slug: "tax-compliance", photo: "photo-1772588627354-ca3617853217", position: "50% 50%" },
  { slug: "corporate-legal", photo: "photo-1758518731462-d091b0b4ed0d", position: "50% 40%" },
  { slug: "payroll-insurance", photo: "photo-1758691737083-0e7fdbde0f05", position: "50% 35%" },
];
const AUTOPLAY_MS = 7000;

// Tách tên dịch vụ thành đúng 2 dòng để 4 tiêu đề căn lề giống nhau (không đổi chữ):
// có "&" thì xuống dòng sau "&", không thì chia đôi theo số chữ (dòng trên dài hơn khi bằng nhau).
function splitTitle(title) {
  const amp = title.indexOf(" & ");
  if (amp > 0) return [title.slice(0, amp + 2), title.slice(amp + 3)];
  const words = title.split(" ");
  let best = 1;
  let bestScore = Infinity;
  for (let k = 1; k < words.length; k += 1) {
    const top = words.slice(0, k).join(" ").length;
    const bottom = words.slice(k).join(" ").length;
    const score = Math.max(top, bottom) * 2 + (top < bottom ? 1 : 0);
    if (score < bestScore) { bestScore = score; best = k; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

export default function CoreServicesShowcase({ isVi }) {
  const items = CORE.map((item) => {
    const service = services.find((s) => s.slug === item.slug);
    return { ...item, title: isVi ? service.titleVi || service.title : service.title, desc: isVi ? service.descVi || service.desc : service.desc };
  });
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const go = useCallback((next) => setActive((next + CORE.length) % CORE.length), []);

  // Tự chuyển sau mỗi 7 giây; dừng khi rê chuột/đang chọn bằng bàn phím hoặc người dùng bật giảm chuyển động.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return undefined;
    timer.current = window.setTimeout(() => go(active + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer.current);
  }, [active, paused, go]);

  const current = items[active];

  return (
    <section
      className="svc-show relative overflow-hidden"
      aria-roledescription="carousel"
      aria-label={isVi ? "Dịch vụ trọng tâm" : "Core services"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="svc-show__media" aria-hidden="true">
        {items.map((item, index) => (
          <img
            key={item.slug}
            src={unsplash(item.photo, 1600)}
            srcSet={`${unsplash(item.photo, 800)} 800w, ${unsplash(item.photo, 1600)} 1600w, ${unsplash(item.photo, 2400)} 2400w`}
            sizes="100vw"
            alt=""
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            className={`svc-show__img${index === active ? " is-active" : ""}`}
            style={{ objectPosition: item.position }}
          />
        ))}
        <div className="svc-show__veil" />
      </div>

      <div className="svc-show__body container relative z-10 mx-auto px-6 lg:px-12">
        <div className="svc-show__eyebrow">
          <span>{isVi ? "Dịch vụ trọng tâm" : "Core services"}</span>
          <span className="svc-show__dot" aria-hidden="true" />
          <span className="svc-show__note">{isVi ? "4 dịch vụ thế mạnh FACS cung cấp thường xuyên nhất" : "The 4 strongest services FACS delivers most often"}</span>
        </div>

        <div className="svc-show__headline" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current.slug} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
              <h2 className="svc-show__title">
                {splitTitle(current.title).map((line, i) => (
                  <span key={line} className="svc-show__line">{i > 0 ? " " : ""}{line}</span>
                ))}
              </h2>
              <p className="svc-show__desc">{current.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="svc-show__actions">
          <Link to={`/services/${current.slug}`} className="svc-show__more">
            {isVi ? "Xem chi tiết dịch vụ" : "Explore this service"} <ArrowUpRight size={17} />
          </Link>
          <span className="svc-show__navs">
            <button type="button" className="svc-show__nav" onClick={() => go(active - 1)} aria-label={isVi ? "Dịch vụ trước" : "Previous service"}><ArrowLeft size={20} /></button>
            <button type="button" className="svc-show__nav" onClick={() => go(active + 1)} aria-label={isVi ? "Dịch vụ tiếp theo" : "Next service"}><ArrowRight size={20} /></button>
            <span className="svc-show__count">{String(active + 1).padStart(2, "0")}<span> / {String(items.length).padStart(2, "0")}</span></span>
          </span>
        </div>
      </div>

      <div className="svc-show__cols relative z-10" role="tablist" aria-label={isVi ? "Chọn dịch vụ" : "Choose a service"}>
        {items.map((item, index) => (
          <button
            key={item.slug}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={`svc-show__col${index === active ? " is-active" : ""}`}
            onClick={() => go(index)}
            onMouseEnter={() => go(index)}
          >
            <span className="svc-show__bar" aria-hidden="true">{index === active && !paused && <span key={active} className="svc-show__progress" style={{ animationDuration: `${AUTOPLAY_MS}ms` }} />}</span>
            <span className="svc-show__num">{String(index + 1).padStart(2, "0")}</span>
            <span className="svc-show__label">{item.title}</span>
            <ArrowRight size={18} className="svc-show__arrow" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
