import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "./LanguageContext";
import { askPublicLegalAI, newAISessionId } from "../lib/aiAssistants";

const MAX_QUESTION_LENGTH = 1500;

const copy = {
  vi: {
    welcome: "Tra cứu pháp lý sơ bộ từ nguồn đã được FACS kiểm soát.",
    description: "AI chỉ sử dụng kho văn bản P1 đã phê duyệt và các mốc lịch pháp lý đã xác minh. Khi không đủ nguồn, hệ thống sẽ không tự suy đoán.",
    suggestions: [
      "Doanh nghiệp mới cần lưu ý những nghĩa vụ tuân thủ nào?",
      "Cách xác định một quy định đã có hiệu lực hay chưa?",
      "FACS có thể hỗ trợ doanh nghiệp FDI những dịch vụ gì?",
    ],
    consent: "Tôi hiểu đây là thông tin tham khảo sơ bộ, không phải ý kiến tư vấn; tôi sẽ không nhập dữ liệu mật, thông tin khách hàng hoặc dữ liệu cá nhân nhạy cảm.",
    placeholder: "Nhập câu hỏi pháp lý hoặc tuân thủ cơ bản...",
    thinking: "Đang đối chiếu kho nguồn đã duyệt...",
    sources: "Căn cứ được sử dụng",
    noSources: "Không có nguồn được viện dẫn.",
    clear: "Xóa cuộc trò chuyện",
    contact: "Chuyển nội dung này cho FACS",
    disclaimer: "Kết quả do AI tổng hợp để tham khảo sơ bộ. Cần rà soát hồ sơ và nguồn chính thức trước khi ra quyết định.",
    confidence: "Mức độ nguồn",
    high: "Cao",
    medium: "Trung bình",
    low: "Thấp",
  },
  en: {
    welcome: "Preliminary legal reference using FACS-controlled sources.",
    description: "The AI uses only approved P1 instruments and verified Legal Calendar entries. It will not guess when the controlled sources are insufficient.",
    suggestions: [
      "What compliance obligations should a new company consider?",
      "How can I tell whether a regulation is already effective?",
      "How can FACS support a foreign-invested enterprise?",
    ],
    consent: "I understand this is preliminary reference information, not advice, and I will not enter confidential, client or sensitive personal data.",
    placeholder: "Ask a basic legal or compliance question...",
    thinking: "Checking approved sources...",
    sources: "Sources used",
    noSources: "No source was cited.",
    clear: "Clear conversation",
    contact: "Send this issue to FACS",
    disclaimer: "AI-generated preliminary information must be checked against the relevant records and official sources before a decision is made.",
    confidence: "Source confidence",
    high: "High",
    medium: "Medium",
    low: "Low",
  },
};

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function Sources({ sources, label }) {
  const valid = (sources || [])
    .map((source) => ({ ...source, href: safeUrl(source.url) }))
    .filter((source) => source.href)
    .slice(0, 8);
  if (!valid.length) return null;

  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 grid gap-2">
        {valid.map((source) => (
          <a
            key={`${source.id}-${source.href}`}
            href={source.href}
            target="_blank"
            rel="noreferrer nofollow"
            className="rounded-xl border border-white/8 bg-black/10 px-3 py-2.5 text-xs leading-relaxed text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-100"
          >
            <span className="flex items-start gap-2">
              <span className="rounded-md bg-cyan-300/10 px-1.5 py-0.5 font-bold text-cyan-200">[{source.id}]</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-200">{source.title}</span>
                {(source.document_number || source.authority) && (
                  <span className="mt-0.5 block text-[11px] text-slate-500">
                    {[source.document_number, source.authority].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <ExternalLink size={12} className="mt-0.5 shrink-0 text-cyan-300" />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function LegalAIChat({ channel = "legal_page", compact = false, onContact }) {
  const { language } = useLanguage();
  const t = copy[language] || copy.en;
  const sessionId = useRef(newAISessionId());
  const endRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [consent, setConsent] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [asking, messages]);

  const send = async (value = question) => {
    const cleanQuestion = value.trim().slice(0, MAX_QUESTION_LENGTH);
    if (!cleanQuestion || asking || !consent) return;
    const history = messages.slice(-6).map((item) => ({ role: item.role, content: item.text }));
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: cleanQuestion }]);
    setQuestion("");
    setAsking(true);
    setError("");
    try {
      const result = await askPublicLegalAI({
        message: cleanQuestion,
        history,
        language,
        sessionId: sessionId.current,
        channel,
      });
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        text: result.answer,
        sources: result.sources || [],
        confidence: result.confidence || "low",
        followUps: result.follow_up_questions || [],
        provider: result.provider,
      }]);
    } catch (askError) {
      setError(askError.message || "AI is temporarily unavailable.");
    } finally {
      setAsking(false);
    }
  };

  const clear = () => {
    setMessages([]);
    setError("");
    sessionId.current = newAISessionId();
  };

  return (
    <div className={`flex min-h-0 flex-col ${compact ? "h-full" : "rounded-[30px] border border-cyan-200/15 bg-[#0a1422]/80 shadow-[0_28px_90px_rgba(0,0,0,0.28)]"}`}>
      <div className={`flex-1 overflow-y-auto ${compact ? "px-4 py-4" : "max-h-[620px] min-h-[430px] px-5 py-6 md:px-7"}`}>
        {!messages.length && (
          <div className="rounded-[24px] border border-cyan-200/12 bg-white/[0.035] p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
              <Sparkles size={21} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-white">{t.welcome}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.description}</p>
            <div className="mt-4 grid gap-2">
              {t.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={!consent}
                  onClick={() => send(suggestion)}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left text-sm leading-relaxed text-slate-300 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.05] hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-cyan-400 text-[#06111f]" : "rounded-bl-md border border-white/10 bg-white/[0.045] text-slate-200"}`}>
                <div className="whitespace-pre-wrap">{message.text}</div>
                {message.role === "assistant" && (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <span>{message.provider === "groq" ? "Groq · GPT-OSS" : "FACS Retrieval"}</span>
                      <span>·</span>
                      <span>{t.confidence}: {t[message.confidence] || t.low}</span>
                    </div>
                    <Sources sources={message.sources} label={t.sources} />
                    {message.followUps?.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {message.followUps.map((followUp) => (
                          <button key={followUp} type="button" onClick={() => send(followUp)} className="rounded-xl border border-cyan-200/12 px-3 py-2 text-left text-xs text-cyan-100 transition hover:bg-cyan-300/[0.07]">
                            {followUp}
                          </button>
                        ))}
                      </div>
                    )}
                    {onContact && (
                      <button type="button" onClick={() => onContact(message.text)} className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.05] px-3 py-2.5 text-left text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.1]">
                        {t.contact}<MessageCircle size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {asking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 rounded-[22px] rounded-bl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-slate-300">
                <Loader2 size={16} className="animate-spin text-cyan-300" />{t.thinking}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className={`border-t border-white/10 bg-[#081321]/85 ${compact ? "p-4" : "p-5"}`}>
        {!consent && (
          <label className="mb-3 flex items-start gap-2.5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.04] p-3 text-[11px] leading-relaxed text-slate-400">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-cyan-400" />
            <span>{t.consent} <Link to="/privacy" className="text-cyan-300 underline">Privacy</Link>.</span>
          </label>
        )}
        {error && <div className="mb-3 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-4 py-3 text-xs leading-relaxed text-red-200">{error}</div>}
        <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            disabled={!consent || asking}
            rows="1"
            aria-label={t.placeholder}
            placeholder={t.placeholder}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button type="submit" disabled={!consent || asking || !question.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400 text-[#06111f] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send">
            {asking ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
          </button>
        </form>
        <div className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-cyan-300/70" />
          <span>{t.disclaimer} <Link to="/terms" className="text-slate-400 underline">Terms</Link>.</span>
          {messages.length > 0 && <button type="button" onClick={clear} title={t.clear} aria-label={t.clear} className="ml-auto shrink-0 text-slate-500 hover:text-cyan-200"><Trash2 size={14} /></button>}
        </div>
      </div>
    </div>
  );
}
