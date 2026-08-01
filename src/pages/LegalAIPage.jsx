import { BookOpenCheck, CheckCircle2, FileSearch, Scale, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import LegalAIChat from "../components/LegalAIChat";
import { useLanguage } from "../components/LanguageContext";

const content = {
  vi: {
    eyebrow: "FACS Advisory Intelligence",
    title: "AI hỗ trợ pháp lý, thuế, kế toán & tuân thủ",
    intro: "Tham khảo sơ bộ các vấn đề pháp lý doanh nghiệp, thuế, kế toán, lao động, bảo hiểm và tuân thủ tại Việt Nam bằng Groq AI, trên cơ sở kho nguồn do FACS kiểm soát.",
    badge: "Nguồn P1 đã phê duyệt · Có dẫn nguồn · Không tự suy đoán",
    howTitle: "Cơ chế kiểm soát câu trả lời",
    items: [
      ["Chỉ dùng nguồn đã duyệt", "Văn bản P1 và trích đoạn pháp lý phải được FACS kiểm tra, đánh dấu cho phép trích dẫn và phê duyệt trước khi AI sử dụng."],
      ["Phân biệt hiệu lực", "Câu trả lời phải nhận diện quy định đang có hiệu lực, chưa có hiệu lực, hết hiệu lực hoặc chỉ là hướng dẫn tham khảo."],
      ["Chuyển chuyên gia khi cần", "Tình huống cụ thể, giao dịch trọng yếu hoặc vấn đề có rủi ro sẽ được chuyển sang đội ngũ FACS để rà soát hồ sơ."],
    ],
    noteTitle: "Giới hạn quan trọng",
    note: "Công cụ này không hình thành quan hệ luật sư–khách hàng hoặc hợp đồng dịch vụ, không thay thế ý kiến tư vấn và không nên được dùng làm căn cứ duy nhất để kê khai, ký kết, xử lý tranh chấp hay thực hiện hành động không thể đảo ngược.",
  },
  en: {
    eyebrow: "FACS Advisory Intelligence",
    title: "AI-assisted legal, tax, accounting & compliance guidance",
    intro: "Use Groq AI for preliminary reference on Vietnamese corporate law, tax, accounting, labour, insurance and compliance, grounded in a FACS-controlled knowledge base.",
    badge: "Approved P1 sources · Source-linked · No unsupported guessing",
    howTitle: "How answers are controlled",
    items: [
      ["Approved sources only", "P1 instruments and legal extracts must be checked, citation-enabled and approved by FACS before the AI may use them."],
      ["Effective-status distinction", "Answers must distinguish effective, not-yet-effective, expired and non-binding guidance materials."],
      ["Professional escalation", "Specific facts, material transactions and higher-risk issues are referred to the FACS team for a records-based review."],
    ],
    noteTitle: "Important limitation",
    note: "This tool does not create a lawyer–client or professional engagement, does not replace advice and should not be the sole basis for filing, contracting, dispute handling or any irreversible action.",
  },
};

export default function LegalAIPage() {
  const { language } = useLanguage();
  const page = content[language] || content.en;
  const icons = [BookOpenCheck, Scale, ShieldCheck];

  return (
    <div className="min-h-screen bg-[#0d1726] text-white">
      <Navbar />
      <main>
        <section className="relative overflow-hidden border-b border-cyan-200/10 py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="container relative mx-auto px-6 lg:px-12">
            <div className="grid items-center gap-10 xl:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80"><Sparkles size={15} />{page.eyebrow}</div>
                <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{page.title}</h1>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">{page.intro}</p>
                <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] px-4 py-2 text-sm text-emerald-200"><CheckCircle2 size={16} />{page.badge}</div>
              </div>
              <div className="rounded-[30px] border border-cyan-200/15 bg-white/[0.035] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.24)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><FileSearch size={23} /></div>
                <h2 className="mt-5 text-2xl font-bold">{page.howTitle}</h2>
                <div className="mt-5 space-y-4">
                  {page.items.map(([title, body], index) => {
                    const Icon = icons[index];
                    return <div key={title} className="flex gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-cyan-300"><Icon size={17} /></span><div><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p></div></div>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto grid gap-7 px-6 py-12 lg:px-12 lg:py-16 xl:grid-cols-[minmax(0,1fr)_320px]">
          <LegalAIChat channel="legal_page" />
          <aside className="h-fit rounded-[28px] border border-amber-200/12 bg-amber-200/[0.035] p-6 xl:sticky xl:top-28">
            <ShieldCheck size={25} className="text-amber-200" />
            <h2 className="mt-4 text-lg font-bold">{page.noteTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{page.note}</p>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
