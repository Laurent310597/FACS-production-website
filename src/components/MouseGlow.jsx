import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function MouseGlow() {
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const smoothX = useSpring(x, { stiffness: 175, damping: 24, mass: 0.25 });
  const smoothY = useSpring(y, { stiffness: 175, damping: 24, mass: 0.25 });

  useEffect(() => {
    const move = (event) => {
      setVisible(true);
      x.set(event.clientX - 180);
      y.set(event.clientY - 180);
    };
    const leave = () => setVisible(false);

    window.addEventListener("mousemove", move);
    document.body.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("mousemove", move);
      document.body.removeEventListener("mouseleave", leave);
    };
  }, [x, y]);

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[60] hidden h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.12),rgba(59,130,246,0.05)_35%,transparent_70%)] blur-xl lg:block"
      style={{ left: smoothX, top: smoothY, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    />
  );
}
