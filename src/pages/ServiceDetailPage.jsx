import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Layers3, Sparkles, Target } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageTransition from "../components/PageTransition";
import { services } from "../data/services";

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = services.find((item) => item.slug === slug);

  if (!service) return <Navigate to="/services" replace />;

  const Icon = service.icon;

  return (
    <PageTransition>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">
        <section className="relative py-28 border-b border-cyan-200/15 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/45 to-transparent" />
          <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-cyan-500/12 blur-[120px] rounded-full" />

          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <Link to="/services" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-300 transition-all">
              <ArrowLeft size={18} /> Back to Services
            </Link>

            <div className="grid lg:grid-cols-2 gap-16 items-center mt-12">
              <motion.div initial={{ opacity: 0, y: 35 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 text-sm">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" /> Service Detail
                </div>

                <h1 className="mt-8 text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px]">{service.title}</h1>
                <p className="mt-10 text-slate-400 text-xl leading-relaxed">{service.desc}</p>
              </motion.div>

              <motion.div whileHover={{ y: -10, scale: 1.01 }} transition={{ duration: 0.35 }} className="rounded-[40px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-10 hover:border-cyan-300/25 hover:shadow-[0_30px_90px_rgba(8,145,178,0.13)]">
                <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 flex items-center justify-center shadow-[0_0_40px_rgba(34,211,238,0.14)]">
                  <Icon size={40} className="text-cyan-400" />
                </div>

                <div className="mt-10 space-y-5">
                  {service.details.map((item) => (
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
              <div className="text-cyan-400 mb-5 font-medium">Strategic Perspective</div>
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight tracking-[-2px]">Why This Service Matters</h2>
              <p className="mt-8 text-slate-300 text-lg leading-relaxed">{service.whyChoose}</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mt-16">
              {[
                { icon: Target, title: "Why Choose This Service", body: service.whyChoose },
                { icon: Layers3, title: "What FACS Delivers", body: service.facsValue },
                { icon: Sparkles, title: "Why FACS", body: service.whyFacs },
              ].map((item) => {
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
                <div className="text-cyan-400 mb-5 font-medium">Need A Tailored Solution?</div>
                <h2 className="text-4xl lg:text-6xl font-bold leading-tight">Discuss This Service With FACS</h2>
                <p className="mt-8 text-slate-300 text-lg leading-relaxed">Partner with FACS to design a practical and compliant operating model for your enterprise.</p>
                <Link to="/contact" className="inline-flex mt-10 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 hover:-translate-y-1 transition-all duration-300 text-[#06111f] font-semibold hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">Schedule Consultation</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PageTransition>
  );
}
