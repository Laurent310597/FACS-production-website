import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, ExternalLink, FileText, Loader2, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { askCmsAssistant } from "../../lib/aiAssistants";
import { supabase } from "../../lib/supabaseClient";
import facsLogoMark from "../../assets/facs-logo-mark.png";

const suggestions = [
  "Tóm tắt các việc đang cần ưu tiên trên CMS.",
  "Từ thư viện riêng, rà soát các rủi ro nội dung hiện tại.",
  "Gợi ý kế hoạch xuất bản và cập nhật trong tuần này.",
];

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function CmsSources({ sources }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Nguồn từ thư viện riêng</div>
      <div className="mt-2 grid gap-2">
        {sources.map((source) => {
          const href = safeUrl(source.url);
          const content = <><span className="rounded-md bg-violet-300/10 px-1.5 py-0.5 font-bold text-violet-200">[{source.id}]</span><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-200">{source.title}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{source.source_type === "file" ? source.file_name : href}</span></span>{href ? <ExternalLink size={11} className="shrink-0 text-violet-300" /> : <FileText size={11} className="shrink-0 text-violet-300" />}</>;
          return href
            ? <a key={`${source.id}-${source.document_id}`} href={href} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs text-slate-300">{content}</a>
            : <div key={`${source.id}-${source.document_id}`} className="flex items-start gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2 text-xs text-slate-300">{content}</div>;
        })}
      </div>
    </div>
  );
}

export default function AdminAssistant() {
  const location = useLocation();
  const endRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthorized(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthorized(Boolean(session));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [asking, messages]);

  if (!authorized || !location.pathname.startsWith("/admin") || location.pathname === "/admin/login") return null;

  const send = async (value = question) => {
    const cleanQuestion = value.trim().slice(0, 1800);
    if (!cleanQuestion || asking) return;
    const history = messages.slice(-8).map((item) => ({ role: item.role, content: item.text }));
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanQuestion }]);
    setQuestion("");
    setAsking(true);
    setError("");
    try {
      const result = await askCmsAssistant({ message: cleanQuestion, history, page: location.pathname });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", text: result.answer, model: result.model, sources: result.sources || [] }]);
    } catch (askError) {
      setError(askError.message || "Trợ lý CMS tạm thời chưa thể phản hồi.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9000]" data-no-translate>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Trợ lý CMS FACS"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="mb-3 flex h-[min(720px,calc(100dvh-2.5rem))] w-[calc(100vw-2.5rem)] max-w-[460px] flex-col overflow-hidden rounded-[30px] border border-violet-200/20 bg-[#0a1320]/98 text-white shadow-[0_32px_110px_rgba(0,0,0,0.64),0_0_42px_rgba(139,92,246,0.12)] backdrop-blur-2xl"
          >
            <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),transparent_48%),linear-gradient(135deg,#17172f,#0d1726)] px-5 py-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200/20 bg-white/[0.055]"><img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" /><span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#11152a] bg-emerald-400" /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="font-bold">Trợ lý điều hành CMS</h2><Sparkles size={14} className="text-violet-300" /></div><p className="mt-0.5 text-xs text-violet-100/65">OpenAI · thư viện riêng · chỉ đọc</p></div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.07] hover:text-white"><X size={18} /></button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {!messages.length && (
                <div className="rounded-[24px] border border-violet-200/12 bg-white/[0.035] p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><Bot size={20} /></div>
                  <h3 className="mt-4 text-lg font-bold">Tôi đang trực tuyến trong CMS</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">Tôi đọc trạng thái vận hành CMS và chỉ dùng thư viện URL/file do Tú biên soạn cho các nhận định chuyên môn. Tôi không truy cập nguồn mở của GROQ và không tự xuất bản, sửa hoặc xóa dữ liệu.</p>
                  <div className="mt-4 grid gap-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => send(item)} className="rounded-2xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-violet-300/25 hover:bg-violet-300/[0.06] hover:text-white">{item}</button>)}</div>
                </div>
              )}

              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-violet-300 text-[#111329]" : "rounded-bl-md border border-white/10 bg-white/[0.045] text-slate-200"}`}>
                      <div className="whitespace-pre-wrap">{message.text}</div>
                      {message.model && <><div className="mt-3 text-[10px] uppercase tracking-[0.12em] text-slate-500">OpenAI · {message.model} · private library · read-only</div><CmsSources sources={message.sources} /></>}
                    </div>
                  </div>
                ))}
                {asking && <div className="flex justify-start"><div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-slate-300"><Loader2 size={16} className="animate-spin text-violet-300" />Đang đọc CMS và thư viện riêng...</div></div>}
                <div ref={endRef} />
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#08111e]/95 p-4">
              {error && <div className="mb-3 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-relaxed text-red-200">{error}</div>}
              <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end gap-2">
                <textarea value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 1800))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} disabled={asking} rows="1" placeholder="Tôi cần bạn hỗ trợ..." aria-label="Yêu cầu trợ lý CMS" className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-300/40" />
                <button type="submit" disabled={asking || !question.trim()} aria-label="Gửi" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-300 text-[#101226] hover:bg-violet-200 disabled:opacity-40">{asking ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
              </form>
              <div className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-violet-300/70" /><span>Không nhập dữ liệu khách hàng, hồ sơ mật hoặc thông tin cá nhân. Mọi thay đổi vẫn do Tú phê duyệt.</span>{messages.length > 0 && <button type="button" onClick={() => { setMessages([]); setError(""); }} title="Xóa hội thoại" className="ml-auto shrink-0 hover:text-violet-200"><Trash2 size={14} /></button>}</div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} onClick={() => setOpen(true)} className="flex items-center gap-3 rounded-full border border-violet-200/25 bg-[#11152a]/95 p-2.5 pr-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.5),0_0_28px_rgba(139,92,246,0.16)] backdrop-blur-xl" aria-label="Mở trợ lý CMS">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-violet-300/12"><img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#11152a] bg-emerald-400" /></span>
          <span className="hidden text-left sm:block"><span className="block text-sm font-bold">Trợ lý CMS</span><span className="mt-0.5 block text-[11px] text-violet-100/65">OpenAI · thư viện riêng</span></span>
        </motion.button>
      )}
    </div>
  );
}
