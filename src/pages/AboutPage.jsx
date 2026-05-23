import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AnimatedCounter from "../components/AnimatedCounter";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ShieldCheck, Briefcase, BarChart3, Target, Eye, Gem, Mail, Phone, ArrowRight } from "lucide-react";
import { useLanguage } from "../components/LanguageContext";
import { leadership } from "../data/team";

const values = [
  "Accuracy and integrity",
  "Compliance and transparency",
  "Timely and responsive execution",
  "Professional and optimized delivery",
  "Client partnership and care",
  "Practical and cost-effective solutions",
  "Dedicated and dynamic service mindset",
  "Personalized and simplified implementation",
];


export default function AboutPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const getName = (member) => (isVi ? member.nameVi : member.nameEn);

  return (
    <>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">
        <section className="relative py-32 border-b border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full" />
          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 text-base font-bold">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  Trusted By 100+ Enterprises
                </div>
                <h1 className="mt-8 text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px] text-balance">
                  Strategic Financial Infrastructure For Modern Enterprises
                </h1>
                <p className="mt-10 text-slate-400 text-xl leading-relaxed text-pretty max-w-4xl">
                  FACS is a strategic consulting partner delivering accounting, taxation, legal and operational solutions designed for sustainable enterprise growth.
                </p>
                <div className="mt-12 grid grid-cols-2 gap-8 max-w-lg">
                  <div>
                    <AnimatedCounter value="100+" className="text-5xl font-bold" />
                    <div className="mt-2 text-slate-400">Enterprise Clients</div>
                  </div>
                  <div>
                    <AnimatedCounter value="10+" className="text-5xl font-bold" />
                    <div className="mt-2 text-slate-400">Years of Experience</div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="relative">
                <div className="rounded-[40px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 lg:p-10 min-h-[640px] flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-3xl bg-[#111827]/80 p-7 border border-white/10">
                      <ShieldCheck size={40} className="text-cyan-400" />
                      <AnimatedCounter value="8" className="mt-6 block text-4xl font-bold" />
                      <div className="mt-2 text-slate-400">Industry Sectors</div>
                    </div>
                    <div className="rounded-3xl bg-[#111827]/80 p-7 border border-white/10">
                      <Building2 size={40} className="text-cyan-400" />
                      <AnimatedCounter value="10+" className="mt-6 block text-4xl font-bold" />
                      <div className="mt-2 text-slate-400">Strategic Partners</div>
                    </div>
                  </div>
                  <div className="rounded-[32px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/10 p-9">
                    <BarChart3 size={60} className="text-cyan-400" />
                    <div className="mt-8 text-3xl font-bold leading-snug text-balance">Enterprise Financial Intelligence</div>
                    <p className="mt-5 text-slate-400 leading-relaxed text-pretty">Modern consulting systems designed to optimize operations, compliance and sustainable growth.</p>
                  </div>
                  <div className="rounded-3xl bg-[#111827]/80 p-7 border border-white/10 flex items-center justify-between gap-6">
                    <div>
                      <div className="text-3xl font-bold text-balance">Strategic Advisory</div>
                      <div className="mt-3 text-slate-400">Accounting · Tax · Legal · Governance</div>
                    </div>
                    <Briefcase size={50} className="text-cyan-400 shrink-0" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-32 border-b border-white/10">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-2 gap-20 items-start">
              <div>
                <div className="text-cyan-300 mb-5 text-base lg:text-lg font-bold tracking-[0.03em]">About FACS</div>
                <h2 className="text-4xl lg:text-5xl font-bold leading-tight text-balance">A trusted comprehensive strategic partner</h2>
              </div>
              <div className="space-y-7 text-slate-400 text-lg leading-relaxed text-pretty">
                <p>FACS is built to support startups, small and medium-sized enterprises and growing businesses with integrated financial, legal and operational consulting solutions.</p>
                <p>We listen to each client’s operating context, identify practical needs and design tailored solutions that help simplify complexity, strengthen compliance and improve management confidence.</p>
                <p>From accounting and tax to corporate legal advisory and governance infrastructure, FACS works alongside enterprises to establish a more transparent, disciplined and scalable business foundation.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 border-b border-white/10">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-3 gap-8">
              {[
                { icon: Eye, label: "Our Vision", title: "To become a trusted strategic partner for sustainable growth", desc: "FACS aims to accompany enterprises from formation to growth by simplifying compliance, improving transparency and supporting operational excellence." },
                { icon: Target, label: "Our Mission", title: "To deliver professional, practical and timely solutions", desc: "We provide integrated consulting support that helps businesses save time, control costs and focus on their core growth agenda." },
                { icon: Gem, label: "Our Core Values", title: "Professionalism, transparency and dedicated partnership", desc: "Our work is grounded in accuracy, integrity, responsiveness and a service mindset that places long-term client value at the center." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div key={item.label} whileHover={{ y: -8 }} transition={{ duration: 0.3 }} className="h-full rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 hover:border-cyan-400/25 hover:shadow-[0_0_40px_rgba(34,211,238,0.10)]">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                      <Icon size={28} className="text-cyan-400" />
                    </div>
                    <div className="mt-7 text-cyan-300 text-base font-bold tracking-[0.14em] uppercase">{item.label}</div>
                    <h3 className="mt-4 text-2xl font-semibold leading-snug text-balance">{item.title}</h3>
                    <p className="mt-5 text-slate-400 leading-relaxed text-pretty">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10 rounded-[32px] border border-white/10 bg-[#111827]/60 p-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {values.map((value) => (
                  <motion.div
                    key={value}
                    whileHover={{ y: -5, scale: 1.015 }}
                    transition={{ duration: 0.25 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-slate-300 text-sm leading-snug text-pretty cursor-default hover:border-cyan-300/35 hover:bg-cyan-400/[0.055] hover:text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.12)] transition-all duration-300"
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-cyan-300/0 transition-all duration-300 group-hover:bg-cyan-300/80" />
                    <span className="relative z-10 block transition-transform duration-300 group-hover:translate-x-1">{value}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="text-cyan-300 mb-5 text-base lg:text-lg font-bold tracking-[0.03em]">Leadership Team</div>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight text-balance">Experienced leadership for professional enterprise advisory</h2>
              <p className="mt-8 text-slate-400 text-lg leading-relaxed text-pretty">Our leadership team combines financial, tax, legal, client relationship and operational advisory experience to help clients make confident decisions with clarity and discipline.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-16">
              {leadership.map((member) => (
                <motion.article key={member.slug} whileHover={{ y: -10 }} transition={{ duration: 0.3 }} className="group h-full overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.045] backdrop-blur-xl transition-all duration-500 hover:border-cyan-300/25 hover:shadow-[0_0_50px_rgba(34,211,238,0.12)]">
                  <Link to={`/about/team/${member.slug}`} className="block h-full">
                    <div className="relative h-[420px] overflow-hidden bg-[#1f242c]">
                      <img src={member.photo} alt={getName(member)} className="h-full w-full object-cover object-top transition-all duration-700 group-hover:scale-105" />
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d1726] to-transparent" />
                    </div>
                    <div className="p-8">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold leading-tight text-balance">{getName(member)}</h3>
                        <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 text-cyan-300 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-cyan-300 group-hover:text-[#06111f]">
                          <ArrowRight size={18} />
                        </span>
                      </div>
                      <p className="mt-4 text-cyan-300 font-medium leading-snug text-pretty min-h-[56px]">{isVi ? member.titleVi : member.title}</p>
                      <p className="mt-3 text-slate-400 leading-relaxed text-pretty min-h-[56px]">{isVi ? member.roleVi : member.role}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {(isVi ? member.credentialsVi : member.credentials).map((item) => (
                          <span key={item} className="rounded-full border border-cyan-200/15 bg-cyan-400/8 px-3 py-1 text-xs font-bold text-cyan-100">{item}</span>
                        ))}
                      </div>
                      <div className="mt-7 space-y-3 text-slate-400">
                        <span className="flex items-center gap-3"><Phone size={17} className="text-cyan-400" />{member.phone}</span>
                        <span className="flex items-center gap-3"><Mail size={17} className="text-cyan-400" />{member.email}</span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
