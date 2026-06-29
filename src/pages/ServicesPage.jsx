import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AnimatedCounter from "../components/AnimatedCounter";

import { motion } from "framer-motion";
import { BarChart3, Building2, CheckCircle2, ShieldCheck } from "lucide-react";

import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { getServiceContent, services } from "../data/services";
import { useLanguage } from "../components/LanguageContext";

export default function ServicesPage() {
  const location = useLocation();
  const { language } = useLanguage();
  const isVi = language === "vi";

  useEffect(() => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  return (
    <>
      <Navbar />

      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">

        {/* HERO */}
        <section className="relative py-32 border-b border-white/10 overflow-hidden">

          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"></div>

          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full"></div>

          <div className="container mx-auto px-6 lg:px-12 relative z-10">

            <div className="grid lg:grid-cols-2 gap-20 items-center">

              {/* LEFT */}
              <motion.div
                initial={{
                  opacity: 0,
                  y: 40,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  duration: 0.8,
                }}
              >

                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 text-base font-bold">

                  <div className="w-2 h-2 rounded-full bg-cyan-400"></div>

                  Enterprise Consulting Solutions

                </div>

                <h1 className="mt-8 text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px]">

                  Integrated Consulting
                  Infrastructure

                </h1>

                <p className="mt-10 text-slate-400 text-xl leading-relaxed">

                  Comprehensive accounting, taxation, legal, audit, ERP and operational consulting solutions designed for modern enterprises.

                </p>

                {/* STATS */}
                <div className="mt-12 flex gap-12">

                  <div>

                    <AnimatedCounter value="9" className="text-5xl font-bold" />

                    <div className="mt-2 text-slate-400">
                      Service Pillars
                    </div>

                  </div>

                  <div>

                    <AnimatedCounter value="360°" className="text-5xl font-bold" />

                    <div className="mt-2 text-slate-400">
                      Advisory Coverage
                    </div>

                  </div>

                </div>

              </motion.div>

              {/* RIGHT VISUAL */}
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}

                animate={{
                  opacity: 1,
                  scale: 1,
                }}

                transition={{
                  duration: 0.8,
                }}

                className="relative"
              >

                <div className="rounded-[40px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-10 h-[700px] flex flex-col justify-between">

                  {/* TOP */}
                  <div className="grid grid-cols-2 gap-6">

                    <div className="rounded-3xl bg-[#111827]/80 p-8 border border-white/10">

                      <ShieldCheck
                        size={40}
                        className="text-cyan-400"
                      />

                      <AnimatedCounter value="9" className="mt-6 block text-4xl font-bold" />

                      <div className="mt-2 text-slate-400">
                        Service Pillars
                      </div>

                    </div>

                    <div className="rounded-3xl bg-[#111827]/80 p-8 border border-white/10">

                      <BarChart3
                        size={40}
                        className="text-cyan-400"
                      />

                      <AnimatedCounter value="360°" className="mt-6 block text-4xl font-bold" />

                      <div className="mt-2 text-slate-400">
                        Advisory Coverage
                      </div>

                    </div>

                  </div>

                  {/* CENTER */}
                  <div className="rounded-[32px] bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/10 p-10">

                    <Building2
                      size={60}
                      className="text-cyan-400"
                    />

                    <div className="mt-8 text-3xl font-bold leading-snug">

                      Enterprise Financial
                      Intelligence

                    </div>

                    <p className="mt-5 text-slate-400 leading-relaxed">

                      Modern consulting systems designed to optimize operations, governance and sustainable business growth.

                    </p>

                  </div>

                  {/* BOTTOM */}
                  <div className="rounded-3xl bg-[#111827]/80 p-8 border border-white/10 flex items-center justify-between">

                    <div>

                      <div className="text-3xl font-bold">
                        Strategic Advisory
                      </div>

                      <div className="mt-3 text-slate-400">
                        Accounting · Tax · Legal · Governance
                      </div>

                    </div>

                    <CheckCircle2
                      size={50}
                      className="text-cyan-400"
                    />

                  </div>

                </div>

              </motion.div>

            </div>

          </div>

        </section>

        {/* SERVICES GRID */}
        <section className="py-32 border-b border-white/10">

          <div className="container mx-auto px-6 lg:px-12">

            <div className="max-w-4xl">

              <div className="text-cyan-300 mb-5 text-base lg:text-lg font-bold tracking-[0.03em]">
                What We Provide
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">

                Enterprise Consulting
                Solutions

              </h2>

            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-20">

              {services.map((service) => {
                const Icon = service.icon;
                const serviceContent = getServiceContent(service, isVi);

                return (
                  <motion.div
                    id={service.slug}
                    key={service.slug}

                    whileHover={{
                      y: -12,
                      scale: 1.015,
                    }}

                    transition={{
                      duration: 0.3,
                    }}

                    className="group rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-10 hover:border-cyan-400/30 hover:bg-white/[0.055] hover:shadow-[0_24px_80px_rgba(8,145,178,0.12)] transition-all duration-500"
                  >

                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-cyan-500/15">

                      <Icon
                        size={30}
                        className="text-cyan-400"
                      />

                    </div>

                    <h3 className="mt-8 text-3xl font-semibold leading-snug">
                      {serviceContent.title}
                    </h3>

                    <p className="mt-6 text-slate-400 leading-relaxed text-lg">
                      {serviceContent.desc}
                    </p>

                    <Link to={`/services/${service.slug}`} className="inline-block mt-10 text-cyan-400 hover:text-cyan-300 hover:translate-x-1 transition-all duration-300">

                      Learn More →

                    </Link>

                  </motion.div>
                );
              })}

            </div>

          </div>

        </section>

        {/* PROCESS */}
        <section className="py-32 border-b border-white/10">

          <div className="container mx-auto px-6 lg:px-12">

            <div className="grid lg:grid-cols-3 gap-8">

              {[
                {
                  number: "01",
                  title: "Assessment",
                  desc: "Analyze enterprise operations, compliance status and organizational structure.",
                },

                {
                  number: "02",
                  title: "Implementation",
                  desc: "Build scalable accounting, taxation and governance systems.",
                },

                {
                  number: "03",
                  title: "Optimization",
                  desc: "Continuously improve efficiency, transparency and operational performance.",
                },
              ].map((item, index) => (

                <motion.div
                  key={index}

                  whileHover={{
                    y: -10,
                  }}

                  className="rounded-[32px] border border-white/10 bg-white/[0.045] p-10 transition-all duration-300 hover:border-cyan-300/25 hover:bg-white/[0.055] hover:shadow-[0_24px_70px_rgba(34,211,238,0.10)]"
                >

                  <div className="text-cyan-400 text-5xl font-bold">
                    {item.number}
                  </div>

                  <h3 className="mt-8 text-3xl font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-6 text-slate-400 text-lg leading-relaxed">
                    {item.desc}
                  </p>

                </motion.div>

              ))}

            </div>

          </div>

        </section>

        {/* CTA */}
        <section className="py-32">

          <div className="container mx-auto px-6 lg:px-12">

            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 lg:p-24 backdrop-blur-xl">

              <div className="max-w-3xl">

                <div className="text-cyan-300 mb-5 text-base lg:text-lg font-bold tracking-[0.03em]">
                  Ready To Grow?
                </div>

                <h2 className="text-4xl lg:text-6xl font-bold leading-tight">

                  Build Smarter
                  Business Operations

                </h2>

                <p className="mt-8 text-slate-300 text-lg leading-relaxed">

                  Partner with FACS to modernize your financial and operational infrastructure.

                </p>

                <Link to="/contact" className="inline-flex mt-10 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 hover:-translate-y-1 transition-all duration-300 text-[#06111f] font-semibold hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">

                  Schedule Consultation

                </Link>

              </div>

            </div>

          </div>

        </section>

      </main>

      <Footer />
    </>
  );
}