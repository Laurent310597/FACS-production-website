import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "framer-motion";

export default function AnimatedCounter({ value, className = "", duration = 2200 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px -80px 0px", amount: 0.35 });
  const { target, suffix, decimals } = useMemo(() => {
    const text = String(value).trim();
    const match = text.match(/^([0-9]+(?:\.[0-9]+)?)(.*)$/);
    if (!match) return { target: 0, suffix: text, decimals: 0 };
    return {
      target: Number(match[1]),
      suffix: match[2] || "",
      decimals: match[1].includes(".") ? match[1].split(".")[1].length : 0,
    };
  }, [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    let frame;
    const start = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(target * easeOut(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}
