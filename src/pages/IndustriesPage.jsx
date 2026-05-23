import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { industries } from "../data/industries";
import { useLanguage } from "../components/LanguageContext";

export default function IndustriesPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";

  return (
    <>
      <Navbar />

      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">
        {/* HERO */}
        <section className="relative py-32 border-b border-white/10">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full" />

          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <div className="max-w-5xl">
              <div className="text-cyan-400 mb-5 font-bold text-base">
                {isVi ? "Lĩnh vực" : "Industries"}
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px]">
                {isVi ? "Chuyên môn sâu theo từng lĩnh vực" : "Specialized Expertise Across Industries"}
              </h1>

              <p className="mt-10 text-slate-400 text-xl leading-relaxed max-w-4xl">
                {isVi
                  ? "FACS cung cấp nền tảng tư vấn tài chính, thuế và pháp lý được thiết kế phù hợp với từng lĩnh vực doanh nghiệp tại Việt Nam."
                  : "FACS delivers tailored financial, taxation and legal consulting infrastructure across diverse industries and enterprise sectors."}
              </p>
            </div>
          </div>
        </section>

        {/* GRID */}
        <section className="py-32 border-b border-white/10">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
              {industries.map((industry) => {
                const Icon = industry.icon;

                return (
                  <motion.div
                    key={industry.slug}
                    whileHover={{ y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="group rounded-[32px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 hover:border-cyan-400/25 hover:bg-white/[0.055] hover:shadow-[0_26px_80px_rgba(8,145,178,0.12)] transition-all duration-500"
                  >
                    <Link to={`/industries/${industry.slug}`} className="block h-full">
                      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/15 group-hover:scale-105 transition-all duration-500">
                        <Icon size={30} className="text-cyan-400" />
                      </div>

                      <h3 className="mt-8 text-2xl font-semibold leading-snug">
                        {isVi ? industry.titleVi : industry.title}
                      </h3>

                      <p className="mt-5 text-slate-400 leading-relaxed">
                        {isVi ? industry.descVi : industry.desc}
                      </p>

                      <div className="mt-7 text-cyan-300 font-semibold text-sm opacity-90 group-hover:translate-x-1 transition-all duration-300">
                        {isVi ? "Xem chi tiết →" : "View industry insight →"}
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 lg:p-24 backdrop-blur-xl">
              <div className="max-w-3xl">
                <div className="text-cyan-400 mb-5 font-bold text-base">
                  {isVi ? "Tư vấn theo lĩnh vực" : "Industry-Focused Consulting"}
                </div>

                <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                  {isVi ? "Giải pháp hiện đại cho doanh nghiệp hiện đại" : "Modern Solutions For Modern Enterprises"}
                </h2>

                <p className="mt-8 text-slate-300 text-lg leading-relaxed">
                  {isVi
                    ? "Đồng hành cùng FACS để xây dựng hệ thống tài chính, thuế và vận hành có khả năng mở rộng, phù hợp với đặc thù ngành nghề của doanh nghiệp."
                    : "Partner with FACS to build scalable operational and financial systems tailored to your industry."}
                </p>

                <Link to="/contact" className="inline-flex mt-10 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 hover:-translate-y-1 transition-all duration-300 text-[#06111f] font-semibold hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">
                  {isVi ? "Trao đổi cùng FACS" : "Talk With FACS"}
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
