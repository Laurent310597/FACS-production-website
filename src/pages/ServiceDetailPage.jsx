import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Layers3,
  Route,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { useLanguage } from "../components/LanguageContext";
import { getServiceContent, services } from "../data/services";

const sectionCardClass =
  "group rounded-[32px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(8,145,178,0.12)]";

function BulletList({ items }) {
  return (
    <div className="mt-6 space-y-4">
      {items.map((item) => (
        <div key={item} className="flex gap-4 rounded-3xl border border-white/10 bg-[#111827]/80 p-5 transition-all duration-300 hover:translate-x-1 hover:border-cyan-400/25 hover:bg-white/[0.05]">
          <CheckCircle2 className="mt-1 shrink-0 text-cyan-400" size={22} />
          <div className="leading-relaxed text-slate-300">{item}</div>
        </div>
      ))}
    </div>
  );
}

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";

  const rawService = services.find((item) => item.slug === slug);
  const service = getServiceContent(rawService, isVi);

  if (!service) return <Navigate to="/services" replace />;

  const Icon = service.icon;

  const labels = {
    back: isVi ? "Quay lại Dịch vụ" : "Back to Services",
    serviceDetail: isVi ? "Chi tiết dịch vụ" : "Service Detail",
    overview: isVi ? "Tổng quan" : "Overview",
    scope: isVi ? "Phạm vi dịch vụ" : "Scope of Services",
    typicalClients: isVi ? "Khách hàng phù hợp" : "Typical Clients",
    challenges: isVi ? "Thách thức thường gặp" : "Business Challenges",
    approach: isVi ? "Cách FACS tiếp cận" : "Our Approach",
    deliverables: isVi ? "Đầu ra bàn giao" : "Deliverables",
    whyFacs: isVi ? "Vì sao chọn FACS" : "Why FACS",
    strategicPerspective: isVi ? "Góc nhìn chiến lược" : "Strategic Perspective",
    whyMatters: isVi ? "Vì sao dịch vụ này quan trọng" : "Why This Service Matters",
    whatDelivers: isVi ? "FACS mang lại gì" : "What FACS Delivers",
    tailoredSolution: isVi ? "Cần một giải pháp thiết kế riêng?" : "Need A Tailored Solution?",
    discuss: isVi ? "Trao đổi dịch vụ này với FACS" : "Discuss This Service With FACS",
    ctaText: isVi
      ? "Đồng hành cùng FACS để thiết kế một mô hình vận hành thực tế, tuân thủ và phù hợp với doanh nghiệp của bạn."
      : "Partner with FACS to design a practical and compliant operating model for your enterprise.",
    schedule: isVi ? "Đặt lịch tư vấn" : "Schedule Consultation",
  };

  const detailSections = [
    {
      icon: Target,
      title: labels.overview,
      body: service.overview,
      variant: "paragraph",
    },
    {
      icon: Layers3,
      title: labels.scope,
      items: service.details,
      variant: "list",
    },
    {
      icon: UsersRound,
      title: labels.typicalClients,
      items: service.typicalClients,
      variant: "list",
    },
    {
      icon: AlertTriangle,
      title: labels.challenges,
      items: service.challenges,
      variant: "list",
    },
    {
      icon: Route,
      title: labels.approach,
      items: service.approach,
      variant: "list",
    },
    {
      icon: ClipboardCheck,
      title: labels.deliverables,
      items: service.deliverables,
      variant: "list",
    },
  ];

  const strategicCards = [
    { icon: Target, title: labels.whyMatters, body: service.whyChoose },
    { icon: Layers3, title: labels.whatDelivers, body: service.facsValue },
    { icon: Sparkles, title: labels.whyFacs, body: service.whyFacs },
  ];

  return (
    <PageTransition>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative overflow-hidden border-b border-cyan-200/15 py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
          <div className="absolute right-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-500/12 blur-[120px]" />

          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <Link to="/services" className="inline-flex items-center gap-2 text-slate-400 transition-all hover:text-cyan-300">
              <ArrowLeft size={18} /> {labels.back}
            </Link>

            <div className="mt-12 grid items-center gap-16 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" /> {labels.serviceDetail}
                </div>

                <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-[-3px] lg:text-7xl">{service.title}</h1>
                <p className="mt-10 text-xl leading-relaxed text-slate-400">{service.desc}</p>
              </motion.div>

              <motion.div whileHover={{ y: -10, scale: 1.01 }} transition={{ duration: 0.35 }} className="rounded-[40px] border border-white/10 bg-white/[0.045] p-10 backdrop-blur-xl hover:border-cyan-300/25 hover:shadow-[0_30px_90px_rgba(8,145,178,0.13)]">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.14)]">
                  <Icon size={40} className="text-cyan-400" />
                </div>

                <div className="mt-10">
                  <div className="text-cyan-300 text-base font-bold tracking-[0.03em]">{labels.scope}</div>
                  <BulletList items={service.details} />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-cyan-200/15 py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-5 font-medium text-cyan-400">{labels.strategicPerspective}</div>
              <h2 className="text-4xl font-bold leading-tight tracking-[-2px] lg:text-6xl">
                {labels.whyMatters}
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-slate-300">{service.whyChoose}</p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-3">
              {strategicCards.map((item) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -10, scale: 1.01 }}
                    transition={{ duration: 0.3 }}
                    className={sectionCardClass}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">
                      <CardIcon size={30} className="text-cyan-400" />
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold leading-snug">{item.title}</h3>
                    <p className="mt-5 leading-relaxed text-slate-400">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-cyan-200/15 py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-5 font-medium text-cyan-400">{isVi ? "Cấu trúc dịch vụ" : "Service Structure"}</div>
              <h2 className="text-4xl font-bold leading-tight tracking-[-2px] lg:text-6xl">
                {isVi ? "Từ vấn đề thực tế đến đầu ra có thể sử dụng" : "From Business Need To Practical Deliverables"}
              </h2>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              {detailSections.map((item) => {
                const CardIcon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -8, scale: 1.005 }}
                    transition={{ duration: 0.3 }}
                    className={sectionCardClass}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">
                      <CardIcon size={30} className="text-cyan-400" />
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold leading-snug">{item.title}</h3>
                    {item.variant === "paragraph" ? (
                      <p className="mt-5 text-lg leading-relaxed text-slate-400">{item.body}</p>
                    ) : (
                      <ul className="mt-6 space-y-4">
                        {item.items.map((point) => (
                          <li key={point} className="flex gap-3 text-slate-400">
                            <CheckCircle2 className="mt-1 shrink-0 text-cyan-400" size={18} />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-28">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/20 lg:p-20">
              <div className="max-w-3xl">
                <div className="mb-5 font-medium text-cyan-400">{labels.tailoredSolution}</div>
                <h2 className="text-4xl font-bold leading-tight lg:text-6xl">{labels.discuss}</h2>
                <p className="mt-8 text-lg leading-relaxed text-slate-300">{labels.ctaText}</p>
                <Link to="/contact" className="mt-10 inline-flex rounded-2xl bg-cyan-500 px-8 py-4 font-semibold text-[#06111f] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">
                  {labels.schedule}
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
