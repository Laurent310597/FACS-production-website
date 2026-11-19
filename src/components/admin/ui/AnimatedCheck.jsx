import { motion } from "framer-motion";

/** Dấu tích vector tự vẽ: vòng tròn rồi nét tích. */
export default function AnimatedCheck({ size = 22, className = "text-emerald-300", delay = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <motion.circle
        cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.4 }} animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut", delay }}
      />
      <motion.path
        d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: delay + 0.35 }}
      />
    </svg>
  );
}
