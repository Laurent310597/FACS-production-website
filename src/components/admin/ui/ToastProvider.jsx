import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, Info, X } from "lucide-react";
import AnimatedCheck from "./AnimatedCheck";
import { ToastContext } from "./toastContext";

const DURATION = { success: 4500, info: 5000, error: 8000 };
const MAX = 4;
let seq = 0;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback((id, ms) => {
    clearTimeout(timers.current.get(id));
    timers.current.set(id, setTimeout(() => dismiss(id), ms));
  }, [dismiss]);

  const push = useCallback((kind, message) => {
    const text = String(message || "").trim();
    if (!text) return;
    const id = ++seq;
    setToasts((list) => {
      // Cùng nội dung đang hiện thì không hiện thêm bản trùng.
      if (list.some((t) => t.message === text && t.kind === kind)) return list;
      return [...list, { id, kind, message: text }].slice(-MAX);
    });
    schedule(id, DURATION[kind]);
  }, [schedule]);

  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <MotionConfig reducedMotion="user">
      <div className="pointer-events-none fixed bottom-5 right-5 z-[130] flex w-[min(92vw,380px)] flex-col gap-3" aria-live="polite" role="status">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
              onMouseLeave={() => schedule(t.id, 2500)}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border bg-[#0d1726]/95 p-4 pr-10 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
                t.kind === "error" ? "border-rose-300/30 text-rose-100" : t.kind === "info" ? "border-cyan-200/25 text-slate-100" : "border-emerald-300/30 text-emerald-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">
                  {t.kind === "success" ? <AnimatedCheck /> : t.kind === "error" ? <AlertTriangle size={20} className="text-rose-300" /> : <Info size={20} className="text-cyan-300" />}
                </span>
                <span className="whitespace-pre-line leading-relaxed">{t.message}</span>
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="absolute right-3 top-3 text-slate-500 hover:text-white" aria-label="Đóng thông báo">
                <X size={15} />
              </button>
              <motion.div
                className={`absolute bottom-0 left-0 h-0.5 ${t.kind === "error" ? "bg-rose-300/60" : t.kind === "info" ? "bg-cyan-300/60" : "bg-emerald-300/60"}`}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: DURATION[t.kind] / 1000, ease: "linear" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </MotionConfig>
    </ToastContext.Provider>
  );
}
