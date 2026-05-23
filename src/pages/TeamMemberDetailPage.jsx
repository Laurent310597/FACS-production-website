import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Award, BriefcaseBusiness, CheckCircle2, Mail, Phone, ShieldCheck, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";
import { leadership } from "../data/team";

export default function TeamMemberDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";
  const member = leadership.find((item) => item.slug === slug) || leadership[0];
  const displayName = isVi ? member.nameVi : member.nameEn;

  const credentials = isVi ? member.credentialsVi : member.credentials;
  const strengths = isVi ? member.strengthsVi : member.strengths;
  const focus = isVi ? member.focusVi : member.focus;

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.13),transparent_32%),linear-gradient(135deg,#0d1726_0%,#101b2f_50%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-24 lg:py-32">
          <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-400/8 px-4 py-2 text-sm font-bold text-cyan-200 transition-all duration-300 hover:bg-cyan-300 hover:text-[#06111f]">
              <ArrowLeft size={16} /> {isVi ? "Trở về đội ngũ" : "Back to leadership"}
            </Link>

            <div className="mt-12 grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
              <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="relative">
                <div className="absolute -inset-4 rounded-[44px] bg-cyan-400/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-[40px] border border-cyan-200/15 bg-white/[0.045] shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
                  <img src={member.photo} alt={displayName} className="h-[560px] w-full object-cover object-top" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d1726] via-[#0d1726]/70 to-transparent p-8 pt-28">
                    <div className="text-3xl font-bold leading-tight">{displayName}</div>
                    <div className="mt-3 text-cyan-300">{isVi ? member.roleVi : member.role}</div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
                <div className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-base font-bold text-cyan-300">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" /> {isVi ? "Hồ sơ lãnh đạo" : "Leadership Profile"}
                </div>
                <h1 className="mt-7 text-5xl font-bold leading-[1.04] tracking-[-2px] text-balance lg:text-7xl">{isVi ? member.headlineVi : member.headline}</h1>
                <p className="mt-8 max-w-4xl text-lg leading-relaxed text-slate-300 text-pretty lg:text-xl">{isVi ? member.summaryVi : member.summary}</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
                    <Award className="text-cyan-300" size={28} />
                    <div className="mt-4 text-2xl font-bold">{isVi ? member.experienceVi : member.experience}</div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6">
                    <ShieldCheck className="text-cyan-300" size={28} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {credentials.map((item) => <span key={item} className="rounded-full border border-cyan-200/15 bg-cyan-400/10 px-3 py-1 text-sm font-bold text-cyan-100">{item}</span>)}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-24">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[36px] border border-white/10 bg-white/[0.045] p-8 lg:p-10">
                <div className="flex items-center gap-3 text-cyan-300">
                  <BriefcaseBusiness size={26} />
                  <div className="text-lg font-bold">{isVi ? "Năng lực chuyên môn" : "Professional Strengths"}</div>
                </div>
                <div className="mt-7 space-y-4">
                  {strengths.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-[#111827]/55 p-4 text-slate-300">
                      <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-cyan-300" />
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-cyan-400/10 to-blue-500/8 p-8 lg:p-10">
                <div className="flex items-center gap-3 text-cyan-300">
                  <Sparkles size={26} />
                  <div className="text-lg font-bold">{isVi ? "Lĩnh vực trọng tâm" : "Advisory Focus"}</div>
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  {focus.map((item) => (
                    <span key={item} className="rounded-full border border-cyan-200/18 bg-[#0d1726]/50 px-4 py-2 text-sm font-bold text-cyan-100">{item}</span>
                  ))}
                </div>
                <div className="mt-10 rounded-3xl border border-cyan-200/15 bg-[#0d1726]/52 p-6">
                  <div className="text-2xl font-bold">{isVi ? "Kết nối tư vấn" : "Connect for advisory"}</div>
                  <p className="mt-4 leading-relaxed text-slate-400">{isVi ? "Trao đổi cùng FACS để được tư vấn giải pháp phù hợp với nhu cầu quản trị, kế toán, thuế và vận hành của doanh nghiệp." : "Contact FACS to discuss practical solutions for your enterprise management, accounting, tax and operating needs."}</p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 font-semibold text-slate-200 transition-all duration-300 hover:bg-cyan-300 hover:text-[#06111f]"><Phone size={18} />{member.phone}</a>
                    <a href={`mailto:${member.email}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 font-semibold text-slate-200 transition-all duration-300 hover:bg-cyan-300 hover:text-[#06111f]"><Mail size={18} />{member.email}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
