import { useEffect } from "react";

/**
 * Chuyển động chung cho website công khai (gắn một lần ở App):
 * - .site-card: ánh sáng theo con trỏ; .site-tile: nghiêng 3D theo con trỏ;
 * - .site-card hiện dần khi cuộn tới (bỏ qua thẻ đã có hiệu ứng framer-motion riêng);
 * - gợn sóng khi bấm .site-cta / .site-ripple.
 * Không áp dụng cho CMS (.facs-cms) – CMS có bộ chuyển động riêng.
 */
export default function useSiteMotion() {
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    let frame = 0;
    let last = null;

    const apply = () => {
      frame = 0;
      let el = last?.target instanceof Element ? last.target.closest(".site-card, .site-tile") : null;
      while (el) {
        const r = el.getBoundingClientRect();
        const x = last.clientX - r.left;
        const y = last.clientY - r.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        if (el.classList.contains("site-tile") && !reduce) {
          el.style.setProperty("--rx", `${((0.5 - y / r.height) * 6).toFixed(2)}deg`);
          el.style.setProperty("--ry", `${((x / r.width - 0.5) * 8).toFixed(2)}deg`);
        }
        el = el.parentElement?.closest(".site-card, .site-tile") || null;
      }
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onDown = (e) => {
      if (reduce || e.button !== 0) return;
      const host = e.target instanceof Element ? e.target.closest(".site-cta, .site-ripple") : null;
      if (!host || host.disabled || host.closest(".facs-cms")) return;
      const r = host.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.className = "facs-ripple";
      dot.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${size}px;height:${size}px`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 650);
    };
    document.addEventListener("pointerdown", onDown);

    let io = null;
    let mo = null;
    if (!reduce && "IntersectionObserver" in window) {
      root.classList.add("site-reveal");
      io = new IntersectionObserver(
        (entries) => {
          entries
            .filter((en) => en.isIntersecting)
            .forEach((en, i) => {
              const el = en.target;
              el.style.transitionDelay = `${Math.min(i, 6) * 80}ms`;
              el.classList.add("is-in");
              io.unobserve(el);
              setTimeout(() => (el.style.transitionDelay = ""), 1000);
            });
        },
        { rootMargin: "0px 0px -8% 0px" },
      );
      const consider = (el) => {
        if (el.classList.contains("is-in") || el.closest(".facs-cms")) return;
        // Thẻ do framer-motion điều khiển (có opacity/transform inline) thì để framer lo, chỉ đánh dấu đã hiện.
        if (el.style.opacity !== "" || el.style.transform !== "") {
          el.classList.add("is-in");
          return;
        }
        io.observe(el);
      };
      const watch = (scope) => scope.querySelectorAll?.(".site-card:not(.is-in)").forEach(consider);
      // Chờ một khung hình để framer-motion kịp gắn style ban đầu.
      requestAnimationFrame(() => watch(document.body));
      mo = new MutationObserver((records) => {
        requestAnimationFrame(() => {
          for (const rec of records)
            rec.addedNodes.forEach((n) => {
              if (!(n instanceof Element)) return;
              if (n.matches(".site-card:not(.is-in)")) consider(n);
              watch(n);
            });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(frame);
      io?.disconnect();
      mo?.disconnect();
      root.classList.remove("site-reveal");
    };
  }, []);
}
