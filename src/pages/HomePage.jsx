import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import AnimatedCounter from "../components/AnimatedCounter";
import { motion } from "framer-motion";
import { services } from "../data/services";
import { useLanguage } from "../components/LanguageContext";
import { ShieldCheck, BarChart3, Building2, Handshake, BriefcaseBusiness, ArrowRight } from "lucide-react";

const labelClass = "text-cyan-300 mb-5 text-base lg:text-lg font-bold tracking-[0.03em]";
const containerClass = "container mx-auto px-6 lg:px-12";

export default function HomePage() {
  const { language } = useLanguage();
  const isVi = language === "vi";

  const insightCards = isVi
    ? [
        {
          no: "01",
          title: "Bối cảnh thị trường",
          text: "Doanh nghiệp tại Việt Nam đang vận hành trong môi trường đòi hỏi cao hơn về tài chính, thuế, pháp lý và quản trị ngay từ giai đoạn đầu.",
        },
        {
          no: "02",
          title: "Vì sao FACS ra đời",
          text: "FACS được xây dựng để giúp doanh nghiệp thay thế cách quản trị rời rạc bằng một nền tảng chuyên nghiệp, rõ ràng và có khả năng mở rộng.",
        },
        {
          no: "03",
          title: "Giá trị mang lại",
          text: "Chúng tôi giúp ban lãnh đạo giảm rủi ro tuân thủ, cải thiện chất lượng ra quyết định và xây dựng hệ thống vận hành hỗ trợ tăng trưởng bền vững.",
        },
      ]
    : [
        {
          no: "01",
          title: "Market Context",
          text: "Vietnamese enterprises are operating in a more demanding environment, where finance, tax, legal and governance decisions must be aligned from the beginning.",
        },
        {
          no: "02",
          title: "Why FACS Exists",
          text: "FACS was established to help businesses replace fragmented administration with clear, reliable and scalable professional infrastructure.",
        },
        {
          no: "03",
          title: "Value Delivered",
          text: "We help management reduce compliance risk, improve decision quality and build operating systems that support sustainable growth.",
        },
      ];

  const heroStats = [
    ["100+", isVi ? "Khách hàng doanh nghiệp" : "Enterprise Clients"],
    ["10+", isVi ? "Năm kinh nghiệm" : "Years of Experience"],
    ["8", isVi ? "Lĩnh vực chuyên sâu" : "Industry Sectors"],
    ["10+", isVi ? "Đối tác chiến lược" : "Strategic Partners"],
  ];

  const visualStats = [
    [ShieldCheck, "100%", isVi ? "Tuân thủ" : "Compliance"],
    [BarChart3, "3.2x", isVi ? "Hiệu quả vận hành" : "Efficiency"],
    [BriefcaseBusiness, "8", isVi ? "Lĩnh vực" : "Industry Sectors"],
    [Handshake, "10+", isVi ? "Đối tác" : "Strategic Partners"],
  ];

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-28 lg:py-32">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className={`${containerClass} relative z-10`}>
            <div className="grid items-center gap-16 lg:grid-cols-[1.02fr_0.98fr] xl:gap-20">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 3.2 }}>
                <div className={labelClass}>{isVi ? "Về FACS" : "About FACS"}</div>
                <h1 className="text-5xl font-bold leading-[1.05] tracking-[-3px] lg:text-7xl">
                  {isVi ? "Nền tảng tài chính chiến lược cho doanh nghiệp hiện đại" : "Strategic Financial Infrastructure For Modern Enterprises"}
                </h1>
                <p className="mt-10 max-w-4xl text-xl leading-relaxed text-slate-400">
                  {isVi
                    ? "FACS là đối tác tư vấn chiến lược toàn diện, cung cấp giải pháp kế toán, thuế, pháp lý và vận hành cho startup, doanh nghiệp vừa và nhỏ, cũng như doanh nghiệp đang tăng trưởng tại Việt Nam."
                    : "FACS is a comprehensive strategic consulting partner providing accounting, taxation, legal and enterprise operational solutions for startups, SMEs and growing businesses in Vietnam."}
                </p>
                <div className="mt-14 grid max-w-3xl grid-cols-2 gap-8 md:grid-cols-4">
                  {heroStats.map(([value, label]) => (
                    <div key={label} className="min-w-0">
                      <AnimatedCounter value={value} className="text-5xl font-bold" />
                      <div className="mt-3 text-sm leading-snug text-slate-300 md:text-base">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                  <Link to="/services" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-7 py-4 font-semibold text-[#06111f] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-[0_18px_42px_rgba(6,182,212,0.28)]">
                    {isVi ? "Khám phá dịch vụ" : "Explore Services"}<ArrowRight size={18} />
                  </Link>
                  <Link to="/industries" className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/25 bg-white/[0.035] px-7 py-4 font-semibold text-cyan-100 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/45 hover:bg-white/[0.07]">
                    {isVi ? "Xem lĩnh vực" : "View Industries"}
                  </Link>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 3.35 }} className="relative hidden lg:block">
                <div className="rounded-[40px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl xl:p-10">
                  <div className="grid grid-cols-2 gap-6">
                    {visualStats.map(([Icon, value, label]) => (
                      <div key={label} className="rounded-3xl border border-white/10 bg-[#111827]/80 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.055]">
                        <Icon size={38} className="text-cyan-400" />
                        <AnimatedCounter value={value} className="mt-6 block text-4xl font-bold" />
                        <div className="mt-2 text-slate-400">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-[32px] border border-cyan-400/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-9">
                    <Building2 size={56} className="text-cyan-400" />
                    <div className="mt-7 text-3xl font-bold leading-snug">{isVi ? "Năng lực tài chính doanh nghiệp" : "Enterprise Financial Intelligence"}</div>
                    <p className="mt-5 leading-relaxed text-slate-400">
                      {isVi
                        ? "Hệ thống tư vấn hiện đại được thiết kế để tối ưu vận hành, tăng cường tuân thủ và hỗ trợ tăng trưởng bền vững."
                        : "Modern consulting systems designed to optimize operations, compliance and sustainable growth."}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-28">
          <div className={containerClass}>
            <div className="grid gap-8 lg:grid-cols-3">
              {insightCards.map((card, i) => (
                <motion.div key={card.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.7, delay: i * 0.08 }} className="h-full rounded-[32px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-cyan-300/25">
                  <div className={labelClass}>{card.no}</div>
                  <h3 className="text-2xl font-bold">{card.title}</h3>
                  <p className="mt-5 leading-relaxed text-slate-400">{card.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-32">
          <div className={containerClass}>
            <div className="grid items-center gap-16 lg:grid-cols-2 xl:gap-20">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }}>
                <div className={labelClass}>{isVi ? "Sứ mệnh của chúng tôi" : "Our Mission"}</div>
                <h2 className="text-4xl font-bold leading-tight lg:text-5xl">{isVi ? "Kiến tạo nền tảng vận hành doanh nghiệp thông minh hơn" : "Building Smarter Business Infrastructure"}</h2>
                <p className="mt-8 text-lg leading-relaxed text-slate-400">
                  {isVi
                    ? "Chúng tôi thấu hiểu những thách thức doanh nghiệp gặp phải trong tài chính, thuế, tuân thủ pháp lý và quản trị vận hành."
                    : "We understand the challenges businesses face in finance, taxation, legal compliance and operational management."}
                </p>
                <p className="mt-6 text-lg leading-relaxed text-slate-400">
                  {isVi
                    ? "FACS được thành lập để đơn giản hóa sự phức tạp, tối ưu hệ thống và giúp doanh nghiệp tập trung vào tăng trưởng bền vững."
                    : "FACS was established to simplify complexity, optimize systems and empower enterprises to focus on sustainable growth."}
                </p>
              </motion.div>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }}>
                <div className="rounded-[40px] border border-white/10 bg-white/[0.045] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:p-10">
                  <div className="grid gap-6 sm:grid-cols-2">
                    {heroStats.map(([value, label]) => (
                      <div key={label} className="rounded-3xl border border-white/10 bg-[#111827]/80 p-8 transition-all duration-300 hover:border-cyan-300/20">
                        <div className="text-slate-400">{label}</div>
                        <AnimatedCounter value={value} className="mt-5 block text-6xl font-bold" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-32">
          <div className={containerClass}>
            <div className="max-w-4xl">
              <div className={labelClass}>{isVi ? "Chúng tôi làm gì" : "What We Do"}</div>
              <h2 className="text-4xl font-bold leading-tight lg:text-5xl">{isVi ? "Giải pháp tư vấn tích hợp" : "Integrated Consulting Solutions"}</h2>
            </div>
            <div className="mt-20 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.div key={service.slug} whileHover={{ y: -10 }} className="group h-full rounded-[32px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl transition-all duration-500 hover:border-cyan-400/25 hover:shadow-[0_24px_70px_rgba(34,211,238,0.10)]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 transition-all group-hover:bg-cyan-400/15"><Icon size={30} className="text-cyan-400" /></div>
                    <h3 className="mt-8 text-2xl font-semibold">{service.title}</h3>
                    <p className="mt-5 leading-relaxed text-slate-400">{service.desc}</p>
                    <Link to={`/services/${service.slug}`} className="mt-7 inline-flex items-center gap-2 font-semibold text-cyan-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-100">
                      {isVi ? "Tìm hiểu thêm" : "Learn More"}<ArrowRight size={16} />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-32">
          <div className={containerClass}>
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 backdrop-blur-xl lg:p-24">
              <div className="max-w-3xl">
                <div className={labelClass}>{isVi ? "Cùng kiến tạo giá trị" : "Let’s Build Together"}</div>
                <h2 className="text-4xl font-bold leading-tight lg:text-6xl">{isVi ? "Hiện đại hóa nền tảng vận hành doanh nghiệp" : "Modernize Your Business Infrastructure"}</h2>
                <p className="mt-8 text-lg leading-relaxed text-slate-300">
                  {isVi
                    ? "Đồng hành cùng FACS để đơn giản hóa vận hành, tăng cường tuân thủ và thúc đẩy tăng trưởng bền vững."
                    : "Partner with FACS to simplify operations, strengthen compliance and accelerate sustainable business growth."}
                </p>
                <Link to="/contact" className="mt-10 inline-flex rounded-2xl bg-cyan-500 px-8 py-4 font-semibold text-[#06111f] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-[0_18px_42px_rgba(6,182,212,0.26)]">
                  {isVi ? "Đặt lịch tư vấn" : "Schedule Consultation"}
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
