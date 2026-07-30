import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { askFACSAssistant, newAssistantSessionId } from "../lib/assistant";
import { newSubmissionKey, submitWebsiteForm } from "../lib/formSubmissions";
import facsLogoMark from "../assets/facs-logo-mark.png";

const MAX_QUESTION_LENGTH = 1200;

const copy = {
  vi: {
    launcher: "Tra cứu & liên hệ",
    title: "Trợ lý FACS",
    subtitle: "FACS và nguồn chính thức",
    searchTab: "Tra cứu",
    contactTab: "Nhắn FACS",
    welcomeTitle: "Tôi có thể hỗ trợ bạn tra cứu nhanh",
    welcomeBody:
      "Hỏi về dịch vụ FACS hoặc thông tin tham khảo trong lĩnh vực kế toán, thuế, pháp lý doanh nghiệp, lao động và quản trị.",
    suggestions: [
      "FACS cung cấp những dịch vụ nào?",
      "Doanh nghiệp mới cần lưu ý nghĩa vụ thuế gì?",
      "Tôi cần hỗ trợ thành lập doanh nghiệp tại Việt Nam",
    ],
    consent:
      "Tôi hiểu nội dung AI chỉ để tham khảo và đồng ý để câu hỏi được xử lý theo Chính sách bảo mật. Tôi sẽ không nhập dữ liệu mật, dữ liệu cá nhân nhạy cảm hoặc thông tin khách hàng.",
    placeholder: "Nhập vấn đề bạn muốn tra cứu...",
    send: "Gửi câu hỏi",
    thinking: "Đang tra cứu nguồn phù hợp...",
    disclaimer:
      "Nội dung do AI tổng hợp, không phải ý kiến tư vấn chuyên môn. Hãy kiểm tra nguồn và liên hệ FACS trước khi ra quyết định.",
    sources: "Nguồn tham khảo",
    contactPrompt: "Cần tư vấn theo tình huống cụ thể?",
    contactAction: "Gửi tin nhắn cho FACS",
    clear: "Xóa cuộc trò chuyện",
    contactTitle: "Gửi tin nhắn trực tiếp đến FACS",
    contactBody:
      "Tin nhắn sẽ được lưu trên hệ thống và chuyển đến đội ngũ FACS để phản hồi.",
    name: "Họ và tên *",
    email: "Email *",
    phone: "Số điện thoại",
    company: "Công ty",
    message: "Nội dung cần hỗ trợ *",
    contactConsent:
      "Tôi đồng ý để FACS thu thập và xử lý thông tin nhằm phản hồi yêu cầu này.",
    sending: "Đang gửi...",
    submit: "Gửi tin nhắn",
    successTitle: "FACS đã nhận được tin nhắn",
    successBody: "Email xác nhận sẽ được gửi tới địa chỉ bạn đã cung cấp.",
    another: "Gửi tin nhắn khác",
    quickContact: "Liên hệ nhanh",
    privacy: "Chính sách bảo mật",
    terms: "Điều khoản sử dụng",
    close: "Đóng trợ lý FACS",
    offline:
      "Trợ lý AI hiện chưa thể phản hồi. Bạn có thể chuyển sang mục “Nhắn FACS” để được hỗ trợ.",
  },
  en: {
    launcher: "Search & contact",
    title: "FACS Assistant",
    subtitle: "FACS and official sources",
    searchTab: "Search",
    contactTab: "Message FACS",
    welcomeTitle: "I can help you with a quick reference search",
    welcomeBody:
      "Ask about FACS services or general reference information on accounting, tax, corporate legal, labour and governance matters.",
    suggestions: [
      "What services does FACS provide?",
      "What tax obligations should a new company consider?",
      "I need support setting up a company in Vietnam",
    ],
    consent:
      "I understand AI content is for reference only and consent to my question being processed under the Privacy Policy. I will not enter confidential, sensitive personal or client information.",
    placeholder: "Enter the issue you want to look up...",
    send: "Send question",
    thinking: "Checking relevant sources...",
    disclaimer:
      "AI-generated reference content is not professional advice. Verify the sources and contact FACS before making a decision.",
    sources: "Reference sources",
    contactPrompt: "Need advice for your specific situation?",
    contactAction: "Send FACS a message",
    clear: "Clear conversation",
    contactTitle: "Send a message directly to FACS",
    contactBody:
      "Your message will be recorded securely and forwarded to the FACS team for follow-up.",
    name: "Full name *",
    email: "Email *",
    phone: "Phone number",
    company: "Company",
    message: "How can we help? *",
    contactConsent:
      "I consent to FACS collecting and processing my information to respond to this inquiry.",
    sending: "Sending...",
    submit: "Send message",
    successTitle: "FACS has received your message",
    successBody: "A confirmation email will be sent to the address provided.",
    another: "Send another message",
    quickContact: "Quick contact",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    close: "Close FACS Assistant",
    offline:
      "The AI assistant is temporarily unavailable. Please switch to “Message FACS” for assistance.",
  },
};

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderCitedText(text, citations = []) {
  const normalized = citations
    .map((citation, index) => ({
      ...citation,
      href: safeExternalUrl(citation.url),
      start: Number(citation.start_index),
      end: Number(citation.end_index),
      key: `${citation.url}-${citation.start_index}-${index}`,
    }))
    .filter(
      (citation) =>
        citation.href &&
        Number.isInteger(citation.start) &&
        Number.isInteger(citation.end) &&
        citation.start >= 0 &&
        citation.end > citation.start &&
        citation.end <= text.length,
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (!normalized.length) return text;

  const nodes = [];
  let cursor = 0;
  normalized.forEach((citation) => {
    if (citation.start < cursor) return;
    if (citation.start > cursor) nodes.push(text.slice(cursor, citation.start));
    nodes.push(
      <a
        key={citation.key}
        href={citation.href}
        target="_blank"
        rel="noreferrer nofollow"
        title={citation.title || citation.href}
        className="rounded-sm text-cyan-200 underline decoration-cyan-300/55 underline-offset-2 hover:text-cyan-100"
      >
        {text.slice(citation.start, citation.end)}
      </a>,
    );
    cursor = citation.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function SourceList({ sources, label }) {
  const safeSources = sources
    .map((source) => ({ ...source, href: safeExternalUrl(source.url) }))
    .filter((source) => source.href)
    .slice(0, 6);

  if (!safeSources.length) return null;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="space-y-2">
        {safeSources.map((source, index) => (
          <a
            key={`${source.href}-${index}`}
            href={source.href}
            target="_blank"
            rel="noreferrer nofollow"
            className="flex items-start gap-2 text-xs leading-relaxed text-cyan-200/90 transition-colors hover:text-cyan-100"
          >
            <ExternalLink size={12} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{source.title || new URL(source.href).hostname}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function FacsAssistant() {
  const { language } = useLanguage();
  const location = useLocation();
  const t = copy[language] || copy.en;
  const isVi = language === "vi";
  const sessionId = useRef(newAssistantSessionId());
  const submissionKey = useRef(newSubmissionKey());
  const questionInput = useRef(null);
  const conversationEnd = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [assistantConsent, setAssistantConsent] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [contactDraft, setContactDraft] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);

  const latestQuestion = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user")?.text || "",
    [messages],
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open && activeTab === "search") {
      window.setTimeout(() => questionInput.current?.focus(), 120);
    }
  }, [activeTab, open]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [asking, messages]);

  if (location.pathname.startsWith("/admin")) return null;

  const switchToContact = () => {
    const draft = latestQuestion
      ? isVi
        ? `Tôi cần FACS hỗ trợ về vấn đề sau:\n${latestQuestion}`
        : `I would like FACS to assist with the following matter:\n${latestQuestion}`
      : "";
    setContactDraft(draft);
    setActiveTab("contact");
    setAssistantError("");
  };

  const sendQuestion = async (value = question) => {
    const cleanQuestion = value.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!cleanQuestion || asking || !assistantConsent) return;

    const history = messages.slice(-6).map(({ role, text }) => ({ role, content: text }));
    const userMessage = { id: window.crypto.randomUUID(), role: "user", text: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setAsking(true);
    setAssistantError("");

    try {
      const result = await askFACSAssistant({
        message: cleanQuestion,
        history,
        language,
        sessionId: sessionId.current,
      });
      setMessages((current) => [
        ...current,
        {
          id: window.crypto.randomUUID(),
          role: "assistant",
          text: result.answer,
          citations: result.citations || [],
          sources: result.sources || [],
        },
      ]);
    } catch (error) {
      setAssistantError(error.message || t.offline);
    } finally {
      setAsking(false);
    }
  };

  const handleQuestionSubmit = (event) => {
    event.preventDefault();
    sendQuestion();
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    if (contactSubmitting) return;
    const formElement = event.currentTarget;
    setContactSubmitting(true);
    setContactError("");

    try {
      await submitWebsiteForm(formElement, {
        type: "contact",
        language,
        submissionKey: submissionKey.current,
        extra: { service_interest: "FACS AI Assistant" },
      });
      setContactSuccess(true);
      setContactDraft("");
      submissionKey.current = newSubmissionKey();
      formElement.reset();
    } catch (error) {
      setContactError(error.message);
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[8000] sm:bottom-6 sm:right-6" data-no-translate>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={t.title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="flex h-[min(760px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-[440px] flex-col overflow-hidden rounded-[30px] border border-cyan-200/20 bg-[#0b1422]/95 text-white shadow-[0_30px_100px_rgba(0,0,0,0.62),0_0_45px_rgba(34,211,238,0.12)] backdrop-blur-2xl"
          >
            <header className="relative border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_45%),linear-gradient(135deg,#101f35,#0d1726)] px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.055]">
                  <img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d1726] bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-lg font-bold">{t.title}</h2>
                    <Sparkles size={15} className="text-cyan-300" />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-cyan-100/70">{t.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t.close}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition-colors hover:border-cyan-200/30 hover:bg-white/[0.07] hover:text-white"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/20 p-1">
                {[
                  ["search", Search, t.searchTab],
                  ["contact", MessageCircle, t.contactTab],
                ].map(([tab, Icon, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      activeTab === tab
                        ? "bg-cyan-400 text-[#07111e] shadow-[0_8px_22px_rgba(34,211,238,0.22)]"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
            </header>

            {activeTab === "search" ? (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                  {!messages.length && (
                    <div className="rounded-[24px] border border-cyan-200/12 bg-white/[0.035] p-5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                        <Bot size={21} />
                      </div>
                      <h3 className="mt-4 text-lg font-bold">{t.welcomeTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.welcomeBody}</p>
                      <div className="mt-4 space-y-2">
                        {t.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={!assistantConsent}
                            onClick={() => sendQuestion(suggestion)}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-sm leading-relaxed text-slate-300 transition-all hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                            message.role === "user"
                              ? "rounded-br-md bg-cyan-400 text-[#07111e]"
                              : "rounded-bl-md border border-white/10 bg-white/[0.045] text-slate-200"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
                            {message.role === "assistant"
                              ? renderCitedText(message.text, message.citations)
                              : message.text}
                          </div>
                          {message.role === "assistant" && (
                            <>
                              <SourceList sources={message.sources || []} label={t.sources} />
                              <button
                                type="button"
                                onClick={switchToContact}
                                className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.055] px-3 py-2.5 text-left text-xs text-cyan-100 transition-colors hover:bg-cyan-300/[0.1]"
                              >
                                <span>
                                  <span className="block font-semibold">{t.contactPrompt}</span>
                                  <span className="mt-0.5 block text-cyan-100/65">{t.contactAction}</span>
                                </span>
                                <MessageCircle size={16} className="shrink-0" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {asking && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-slate-300">
                          <Loader2 size={17} className="animate-spin text-cyan-300" />
                          {t.thinking}
                        </div>
                      </div>
                    )}
                    <div ref={conversationEnd} />
                  </div>
                </div>

                <div className="border-t border-white/10 bg-[#0a1320]/95 p-4">
                  {!assistantConsent && (
                    <label className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.045] p-3 text-[11px] leading-relaxed text-slate-400">
                      <input
                        type="checkbox"
                        checked={assistantConsent}
                        onChange={(event) => setAssistantConsent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400"
                      />
                      <span>
                        {t.consent}{" "}
                        <Link to="/privacy" className="text-cyan-300 underline" onClick={() => setOpen(false)}>
                          {t.privacy}
                        </Link>
                        .
                      </span>
                    </label>
                  )}

                  {assistantError && (
                    <div className="mb-3 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-relaxed text-red-200">
                      {assistantError || t.offline}
                      <button
                        type="button"
                        onClick={switchToContact}
                        className="ml-1 font-semibold text-cyan-200 underline"
                      >
                        {t.contactAction}
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleQuestionSubmit} className="flex items-end gap-2">
                    <textarea
                      ref={questionInput}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendQuestion();
                        }
                      }}
                      disabled={!assistantConsent || asking}
                      rows="1"
                      placeholder={t.placeholder}
                      aria-label={t.placeholder}
                      className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-cyan-300/45 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!assistantConsent || asking || !question.trim()}
                      aria-label={t.send}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-[#06111f] transition-all hover:-translate-y-0.5 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {asking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>

                  <div className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
                    <ShieldCheck size={13} className="mt-0.5 shrink-0 text-cyan-300/70" />
                    <span>
                      {t.disclaimer}{" "}
                      <Link to="/terms" className="text-slate-400 underline" onClick={() => setOpen(false)}>
                        {t.terms}
                      </Link>
                    </span>
                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMessages([]);
                          setAssistantError("");
                          sessionId.current = newAssistantSessionId();
                        }}
                        aria-label={t.clear}
                        title={t.clear}
                        className="ml-auto shrink-0 text-slate-500 transition-colors hover:text-cyan-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                {contactSuccess ? (
                  <div className="rounded-[24px] border border-emerald-300/20 bg-emerald-300/[0.055] p-6">
                    <CheckCircle2 size={38} className="text-emerald-300" />
                    <h3 className="mt-4 text-xl font-bold">{t.successTitle}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.successBody}</p>
                    <button
                      type="button"
                      onClick={() => setContactSuccess(false)}
                      className="mt-5 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-cyan-200"
                    >
                      {t.another}
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xl font-bold">{t.contactTitle}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.contactBody}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {[
                        [Mail, "mailto:contact@facs.vn", "Email"],
                        [Phone, "tel:+84972798424", isVi ? "Điện thoại" : "Call"],
                        [MessageCircle, "https://m.me/61550646023438", "Messenger"],
                        [MessageCircle, "https://zalo.me/0972798424", "Zalo"],
                      ].map(([Icon, href, label]) => (
                        <a
                          key={label}
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noreferrer" : undefined}
                          className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-2 py-3 text-[11px] text-slate-300 transition-all hover:border-cyan-300/30 hover:text-cyan-100"
                        >
                          <Icon size={17} />
                          {label}
                        </a>
                      ))}
                    </div>

                    <form onSubmit={handleContactSubmit} className="mt-5 space-y-3">
                      <input
                        name="full_name"
                        required
                        type="text"
                        placeholder={t.name}
                        aria-label={t.name}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/45"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          name="email"
                          required
                          type="email"
                          placeholder={t.email}
                          aria-label={t.email}
                          className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/45"
                        />
                        <input
                          name="phone"
                          type="text"
                          placeholder={t.phone}
                          aria-label={t.phone}
                          className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/45"
                        />
                      </div>
                      <input
                        name="company_name"
                        type="text"
                        placeholder={t.company}
                        aria-label={t.company}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/45"
                      />
                      <textarea
                        key={contactDraft}
                        name="message"
                        required
                        rows="4"
                        defaultValue={contactDraft}
                        placeholder={t.message}
                        aria-label={t.message}
                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-cyan-300/45"
                      />
                      <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-400">
                        <input name="consent" required type="checkbox" className="mt-0.5 h-4 w-4 accent-cyan-400" />
                        <span>
                          {t.contactConsent}{" "}
                          <Link to="/privacy" className="text-cyan-300 underline" onClick={() => setOpen(false)}>
                            {t.privacy}
                          </Link>
                        </span>
                      </label>
                      <input
                        name="website"
                        tabIndex="-1"
                        autoComplete="off"
                        aria-hidden="true"
                        className="absolute -left-[10000px] h-px w-px opacity-0"
                      />
                      {contactError && (
                        <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
                          {contactError}
                        </div>
                      )}
                      <button
                        disabled={contactSubmitting}
                        type="submit"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-[#06111f] transition-all hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {contactSubmitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                        {contactSubmitting ? t.sending : t.submit}
                      </button>
                    </form>
                  </>
                )}

                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {t.quickContact}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-slate-400">
                    contact@facs.vn · (+84) 972 798 424
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(true)}
          aria-label={t.launcher}
          aria-expanded={open}
          className="group flex items-center gap-3 rounded-full border border-cyan-200/25 bg-[#0d1726]/95 p-2.5 pr-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.48),0_0_32px_rgba(34,211,238,0.18)] backdrop-blur-xl"
        >
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/12">
            <img src={facsLogoMark} alt="" className="h-8 w-8 object-contain" />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0d1726] bg-emerald-400" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold">{t.title}</span>
            <span className="mt-0.5 block text-[11px] text-cyan-100/65">{t.launcher}</span>
          </span>
        </motion.button>
      )}
    </div>
  );
}
