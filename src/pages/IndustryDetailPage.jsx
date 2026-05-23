import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Layers3, Sparkles, Target } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { industries } from "../data/industries";
import { useLanguage } from "../components/LanguageContext";

export default function IndustryDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";
  const industry = industries.find((item) => item.slug === slug);

  if (!industry) return <Navigate to="/industries" replace />;

  const Icon = industry.icon;
  const title = isVi ? industry.titleVi : industry.title;
  const desc = isVi ? industry.descVi : industry.desc;
  const market = isVi ? industry.marketVi : industry.market;
  const challenges = isVi ? industry.challengesVi : industry.challenges;
  const value = isVi ? industry.valueVi : industry.value;

  const insightCards = [
    {
      icon: Target,
      title: isVi ? "Tổng quan thị trường" : "Market Overview",
      body: market,
    },
    {
      icon: Layers3,
      title: isVi ? "Thách thức trọng yếu" : "Key Challenges",
      body: isVi
        ? "Doanh nghiệp trong lĩnh vực này thường cần xử lý đồng thời yêu cầu về thuế, kế toán, chứng từ và hiệu quả vận hành."
        : "Businesses in this sector often need to manage tax, accounting, documentation and operational efficiency requirements at the same time.",
    },
    {
      icon: Sparkles,
      title: isVi ? "Vai trò của FACS" : "How FACS Supports",
      body: value,
    },
  ];

  return (
    <PageTransition>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">
        <section className="relative py-28 border-b border-cyan-200/15 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
          <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-cyan-500/12 blur-[120px] rounded-full" />

          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <Link to="/industries" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-300 transition-all">
              <ArrowLeft size={18} /> {isVi ? "Quay lại Lĩnh vực" : "Back to Industries"}
            </Link>

            <div className="grid lg:grid-cols-2 gap-16 items-center mt-12">
              <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 text-sm font-bold">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" /> {isVi ? "Chi tiết lĩnh vực" : "Industry Detail"}
                </div>

                <h1 className="mt-8 text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px]">{title}</h1>
                <p className="mt-10 text-slate-400 text-xl leading-relaxed">{desc}</p>
              </motion.div>

              <motion.div whileHover={{ y: -10, scale: 1.01 }} transition={{ duration: 0.35 }} className="rounded-[40px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-10 hover:border-cyan-300/25 hover:shadow-[0_30px_90px_rgba(8,145,178,0.13)]">
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.14)]">
                  <Icon size={40} className="text-cyan-400" />
                </div>

                <h2 className="mt-10 text-3xl font-bold leading-snug">
                  {isVi ? "Các vấn đề trọng tâm cần kiểm soát" : "Critical Areas To Control"}
                </h2>

                <div className="mt-8 space-y-5">
                  {challenges.map((item) => (
                    <div key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-[#111827]/80 p-5 hover:border-cyan-400/25 hover:bg-white/[0.05] hover:translate-x-1 transition-all duration-300">
                      <CheckCircle2 className="text-cyan-400 shrink-0 mt-1" size={22} />
                      <div className="text-slate-300 leading-relaxed">{item}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-28 border-b border-cyan-200/15">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="text-cyan-400 mb-5 font-bold text-base">
                {isVi ? "Góc nhìn chiến lược" : "Strategic Perspective"}
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight tracking-[-2px]">
                {isVi ? "Vì sao doanh nghiệp cần một đơn vị đồng hành" : "Why A Professional Partner Matters"}
              </h2>
              <p className="mt-8 text-slate-300 text-lg leading-relaxed">
                {isVi
                  ? "Trong môi trường kinh doanh tại Việt Nam, tối ưu chi phí thuế không chỉ là giảm số thuế phải nộp, mà là thiết kế giao dịch, chứng từ, hệ thống kế toán và quy trình vận hành theo cách vừa hiệu quả vừa tuân thủ."
                  : "In Vietnam, optimizing tax expense is not simply about reducing tax payable. It requires transaction design, documentation, accounting systems and operating processes that are both efficient and compliant."}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mt-16">
              {insightCards.map((item) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -10, scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    className="group rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 hover:border-cyan-400/30 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(8,145,178,0.12)] transition-all duration-500"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">
                      <CardIcon size={30} className="text-cyan-400" />
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-5 text-slate-400 leading-relaxed">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 lg:p-20 backdrop-blur-xl hover:border-cyan-400/20 transition-all duration-500">
              <div className="max-w-3xl">
                <div className="text-cyan-400 mb-5 font-bold text-base">
                  {isVi ? "Giải pháp theo lĩnh vực" : "Industry-Focused Solution"}
                </div>
                <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                  {isVi ? "Tối ưu thuế, kế toán và vận hành cùng FACS" : "Optimize Tax, Accounting And Operations With FACS"}
                </h2>
                <p className="mt-8 text-slate-300 text-lg leading-relaxed">
                  {isVi
                    ? "FACS đồng hành cùng doanh nghiệp xây dựng mô hình vận hành rõ ràng, hồ sơ chứng từ vững chắc và hệ thống quản trị phù hợp với đặc thù ngành nghề."
                    : "FACS works with enterprises to build clear operating models, strong documentation and management systems tailored to industry-specific requirements."}
                </p>
                <Link to="/contact" className="inline-flex mt-10 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 hover:-translate-y-1 transition-all duration-300 text-[#06111f] font-semibold hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">
                  {isVi ? "Trao đổi cùng FACS" : "Schedule Consultation"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageTransition>
  );
}
