import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useLocation } from "react-router-dom";

/**
 * Vệt sáng mềm đi theo con trỏ trên website.
 * Hiệu năng: dời bằng transform (x/y, chạy trên GPU) thay vì left/top; vệt đã là gradient mềm nên không cần filter blur;
 * không gắn trình nghe chuột trong CMS.
 */
export default function MouseGlow() {
  // Không hiện vệt sáng theo chuột trong CMS quản trị (gây phân tâm khi làm việc với bảng biểu).
  const isAdmin = useLocation().pathname.startsWith("/admin");
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const smoothX = useSpring(x, { stiffness: 175, damping: 24, mass: 0.25 });
  const smoothY = useSpring(y, { stiffness: 175, damping: 24, mass: 0.25 });

  useEffect(() => {
    if (isAdmin) return undefined;
    const move = (event) => {
      if (event.pointerType === "touch") return;
      setVisible(true);
      x.set(event.clientX - 210);
      y.set(event.clientY - 210);
    };
    const leave = () => setVisible(false);

    window.addEventListener("pointermove", move, { passive: true });
    document.body.addEventListener("mouseleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.body.removeEventListener("mouseleave", leave);
    };
  }, [isAdmin, x, y]);

  if (isAdmin) return null;
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] hidden h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.11),rgba(59,130,246,0.045)_38%,transparent_70%)] will-change-transform lg:block"
      style={{ x: smoothX, y: smoothY, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.25 }}
    />
  );
}
