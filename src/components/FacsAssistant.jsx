import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageCircle, Search, Send, Sparkles, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "./LanguageContext";
import LegalAIChat from "./LegalAIChat";
import { newSubmissionKey, submitWebsiteForm } from "../lib/formSubmissions";
import facsLogoMark from "../assets/facs-logo-mark.png";

const copy = {
  vi: {
    launcher: "Tra cứu & liên hệ",
    title: "Trợ lý Tư vấn FACS",
    subtitle: "Web search nguồn duyệt · GROQ",
    ai: "Tra cứu tư vấn",
    contact: "Nhắn FACS",
    contactTitle: "Gửi yêu cầu cho đội ngũ FACS",
    contactBody: "Nội dung sẽ được lưu trên CMS và chuyển đến đội ngũ phụ trách để phản hồi.",
    name: "Họ và tên *",
    email: "Email *",
    phone: "Số điện thoại",
    company: "Công ty",
    message: "Nội dung cần hỗ trợ *",
    consent: "Tôi đồng ý để FACS xử lý thông tin nhằm phản hồi yêu cầu này.",
    submit: "Gửi yêu cầu",
    sending: "Đang gửi...",
    success: "FACS đã nhận được yêu cầu.",
    again: "Gửi yêu cầu khác",
  },
  en: {
    launcher: "Search & contact",
    title: "FACS Advisory Assistant",
    subtitle: "Approved-source web search · GROQ",
    ai: "Advisory search",
    contact: "Message FACS",
    contactTitle: "Send an inquiry to the FACS team",
    contactBody: "Your message will be recorded in the CMS and routed to the responsible team.",
    name: "Full name *",
    email: "Email *",
    phone: "Phone number",
    company: "Company",
    message: "How can we help? *",
    consent: "I consent to FACS processing this information to respond to my inquiry.",
    submit: "Send inquiry",
    sending: "Sending...",
    success: "FACS has received your inquiry.",
    again: "Send another inquiry",
  },
};

export default function FacsAssistant() {
  const location = useLocation();
  const { language } = useLanguage();
  const t = copy[language] || copy.en;
  const submissionKey = useRef(newSubmissionKey());
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("ai");
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (location.pathname.startsWith("/admin")) return null;

  const switchToContact = (text = "") => {
    setDraft(text ? `${language === "en" ? "I would like FACS to review this issue" : "Tôi cần FACS rà soát vấn đề sau"}:\n${text}` : "");
    setTab("contact");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (working) return;
    const form = event.currentTarget;
    setWorking(true);
    setError("");
    try {
      await submitWebsiteForm(form, {
        type: "contact",
        language,
        submissionKey: submissionKey.current,
        extra: { service_interest: "FACS Advisory AI Assistant" },
      });
      setSuccess(true);
      setDraft("");
      submissionKey.current = newSubmissionKey();
      form.reset();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[8000] sm:bottom-6 sm:right-6" data-no-translate>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={t.title}
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            className="flex h-[min(780px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[450px] flex-col overflow-hidden rounded-[30px] border border-cyan-200/20 bg-[#0b1422]/97 text-white shadow-[0_30px_100px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
          >
            <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_48%),linear-gradient(135deg,#101f35,#0d1726)] px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.055]">
                  <img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1726] bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><h2 className="font-bold">{t.title}</h2><Sparkles size={14} className="text-cyan-300" /></div>
                  <p className="mt-0.5 text-xs text-cyan-100/65">{t.subtitle}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.07] hover:text-white"><X size={18} /></button>
              </div>
              <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {[["ai", Search, t.ai], ["contact", MessageCircle, t.contact]].map(([value, Icon, label]) => (
                  <button key={value} type="button" onClick={() => setTab(value)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === value ? "bg-cyan-400 text-[#07111e]" : "text-slate-400 hover:text-white"}`}><Icon size={15} />{label}</button>
                ))}
              </div>
            </header>

            {tab === "ai" ? (
              <div className="min-h-0 flex-1"><LegalAIChat channel="popup" compact onContact={switchToContact} /></div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-6">
                {success ? (
                  <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/[0.055] p-6">
                    <CheckCircle2 size={34} className="text-emerald-300" />
                    <h3 className="mt-4 text-xl font-bold">{t.success}</h3>
                    <button type="button" onClick={() => setSuccess(false)} className="mt-5 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-cyan-200">{t.again}</button>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold">{t.contactTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.contactBody}</p>
                    <form onSubmit={submit} className="mt-5 space-y-3">
                      <input name="full_name" required placeholder={t.name} aria-label={t.name} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
                      <div className="grid grid-cols-2 gap-3">
                        <input name="email" type="email" required placeholder={t.email} aria-label={t.email} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
                        <input name="phone" placeholder={t.phone} aria-label={t.phone} className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
                      </div>
                      <input name="company_name" placeholder={t.company} aria-label={t.company} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
                      <textarea key={draft} name="message" required rows="5" defaultValue={draft} placeholder={t.message} aria-label={t.message} className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/40" />
                      <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-400"><input name="consent" required type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan-400" /><span>{t.consent} <Link to="/privacy" className="text-cyan-300 underline" onClick={() => setOpen(false)}>Privacy</Link>.</span></label>
                      <input name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />
                      {error && <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">{error}</div>}
                      <button type="submit" disabled={working} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-[#06111f] hover:bg-cyan-300 disabled:opacity-50">{working ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{working ? t.sending : t.submit}</button>
                    </form>
                  </>
                )}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button type="button" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -3 }} onClick={() => setOpen(true)} className="group flex items-center gap-3 rounded-full border border-cyan-200/25 bg-[#0d1726]/95 p-2.5 pr-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.48),0_0_32px_rgba(34,211,238,0.18)] backdrop-blur-xl" aria-label={t.launcher}>
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/12"><img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" /><span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d1726] bg-emerald-400" /></span>
          <span className="hidden text-left sm:block"><span className="block text-sm font-bold">{t.title}</span><span className="mt-0.5 block text-[11px] text-cyan-100/65">{t.launcher}</span></span>
        </motion.button>
      )}
    </div>
  );
}
