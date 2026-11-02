import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { Loader2, Mail, X } from "lucide-react";

export default function InsightSingleSendDialog({ preview, busy, error, onClose, onSend }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") { if (!busy) onClose(); return; }
      if (event.key !== "Tab") return;
      const buttons = Array.from(dialog.current?.querySelectorAll("button:not(:disabled)") || []);
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); previous?.focus?.(); };
  }, [busy, onClose]);

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-[140] flex items-center justify-center bg-[#020811]/90 p-3 backdrop-blur-md md:p-6">
      <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="single-send-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-cyan-200/20 bg-[#0b1625] shadow-2xl outline-none">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <h2 id="single-send-title" className="text-xl font-bold text-white">Xác nhận gửi riêng bài viết</h2>
            <p className="mt-2 break-words text-sm text-slate-300">{preview.subject}</p>
            <p className="mt-2 break-all text-sm font-semibold text-cyan-100">Bcc: {preview.contact.email}</p>
            <p className="mt-1 text-xs text-slate-400">To: tunguyen@facs.vn · Cc: không có · 1 khách hàng nhận bản tin</p>
          </div>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng gửi riêng" className="rounded-xl border border-white/10 p-2 text-slate-300 disabled:opacity-30"><X size={19} /></button>
        </div>
        <iframe title="Nội dung email gửi riêng" sandbox="" tabIndex={-1}
          srcDoc={DOMPurify.sanitize(preview.body_html || "", { WHOLE_DOCUMENT: true })}
          className="min-h-48 flex-1 bg-white" style={{ colorScheme: "light", height: "48vh" }} />
        {error && <p role="alert" className="px-5 pt-4 text-sm text-red-200">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 p-5">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 disabled:opacity-30">Hủy</button>
          <button type="button" disabled={busy} onClick={onSend} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071421] disabled:opacity-40">
            {busy ? <Loader2 size={17} className="animate-spin" /> : <Mail size={17} />} Gửi riêng cho khách hàng này
          </button>
        </div>
      </section>
    </div>
  );
}
