import { motion } from "framer-motion";

// Chuyển trang êm: mờ dần + trượt rất nhẹ (không dùng làm mờ ảnh – nặng máy và gây giật trên trang dài).
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
