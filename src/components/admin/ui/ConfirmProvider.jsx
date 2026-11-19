import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { ConfirmContext } from "./confirmContext";
import { btnDanger, btnPrimary, btnSecondary } from "./styles";

const DANGER_WORDS = /xó[aá]|xoá|vĩnh viễn|thu hồi|gỡ|huỷ|hủy/i;

function normalize(opts) {
  if (typeof opts !== "string") return { confirmText: "Đồng ý", ...opts, danger: opts?.danger ?? DANGER_WORDS.test(`${opts?.title || ""} ${opts?.message || ""}`) };
  // Chuỗi nhiều dòng: dòng đầu làm tiêu đề, phần còn lại làm nội dung.
  const [first, ...rest] = opts.split(/\n+/);
  return { title: first.trim(), message: rest.join("\n").trim(), confirmText: "Đồng ý", danger: DANGER_WORDS.test(opts) };
}

export default function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const okRef = useRef(null);

  const askConfirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setState(normalize(opts));
  }), []);

  const close = useCallback((value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => okRef.current?.focus(), 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={askConfirm}>
      {children}
      <MotionConfig reducedMotion="user">
        <AnimatePresence>
          {state && (
            <motion.div
              className="facs-cms fixed inset-0 z-[140] flex items-center justify-center bg-[#020812]/75 p-4 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => close(false)}
              role="alertdialog" aria-modal="true" aria-labelledby="facs-confirm-title"
            >
              <motion.div
                className="w-full max-w-md rounded-[20px] border border-white/[0.08] bg-cms-3 p-6 shadow-2xl"
                initial={{ opacity: 0, scale: 0.94, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${state.danger ? "bg-rose-500/15 text-rose-300" : "bg-brand/20 text-blue-300"}`}>
                    {state.danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
                  </span>
                  <div className="min-w-0">
                    <h3 id="facs-confirm-title" className="text-base font-semibold leading-snug text-ink-1">{state.title}</h3>
                    {state.message && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{state.message}</p>}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className={btnSecondary} onClick={() => close(false)}>Hủy</button>
                  <button ref={okRef} type="button" className={state.danger ? btnDanger : btnPrimary} onClick={() => close(true)}>{state.confirmText}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </ConfirmContext.Provider>
  );
}
