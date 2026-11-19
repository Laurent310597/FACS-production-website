import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

const fmt = new Intl.NumberFormat("vi-VN");

/** Số đếm dần lên khi thẻ xuất hiện. Giá trị không phải số thì hiển thị nguyên văn. */
export default function CountUp({ value, duration = 0.9, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const isNumber = typeof value === "number" && Number.isFinite(value);

  useEffect(() => {
    if (!isNumber || !ref.current) return undefined;
    if (!inView || reduce) {
      ref.current.textContent = fmt.format(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = fmt.format(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, inView, reduce, duration, isNumber]);

  return <span ref={ref} className={`tabular-nums ${className}`}>{isNumber ? fmt.format(reduce ? value : 0) : value}</span>;
}
