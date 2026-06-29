import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";
import {
  formatApplicationDeadline,
  getEmploymentTypeLabel,
  getLocalizedJob,
  getWorkplaceTypeLabel,
} from "../lib/careers";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

function JobSkeleton() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 lg:p-10">
      <div className="h-4 w-36 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="mt-5 h-8 w-3/4 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="mt-5 h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-3 h-4 w-2/3 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}

export default function CareersPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    let active = true;

    const fetchJobs = async (showLoading = false) => {
      if (!supabase) {
        setJobs([]);
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("Unable to load career opportunities:", error);
        setJobs([]);
      } else {
        setJobs(data || []);
      }
      setLoading(false);
    };

    const refreshOnFocus = () => fetchJobs(false);
    fetchJobs(true);
    const refreshTimer = window.setInterval(() => fetchJobs(false), 60000);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-32">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="max-w-5xl">
              <div className="mb-5 font-medium text-cyan-400">{isVi ? "Tuyển dụng" : "Careers"}</div>
              <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-[-3px] lg:text-7xl">
                {isVi ? "Kiến tạo tương lai cùng FACS" : "Build The Future With FACS"}
              </h1>
              <p className="mt-10 max-w-4xl text-pretty text-xl leading-relaxed text-slate-400">
                {isVi
                  ? "Gia nhập môi trường tư vấn hiện đại, nơi đề cao đổi mới, tư duy chiến lược và sự phát triển nghề nghiệp bền vững."
                  : "Join a modern consulting environment focused on innovation, strategic thinking and sustainable professional growth."}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-3">
              {[
                {
                  title: isVi ? "Đổi mới" : "Innovation",
                  desc: isVi
                    ? "Chúng tôi thúc đẩy hệ thống hiện đại, chuyển đổi số và cải tiến liên tục."
                    : "We embrace modern systems, digital transformation and continuous improvement.",
                },
                {
                  title: isVi ? "Chuyên nghiệp" : "Professionalism",
                  desc: isVi
                    ? "Chúng tôi duy trì tiêu chuẩn cao về chuyên môn, đạo đức và chất lượng tư vấn."
                    : "We maintain high standards in expertise, ethics and enterprise consulting.",
                },
                {
                  title: isVi ? "Phát triển" : "Growth",
                  desc: isVi
                    ? "Chúng tôi đầu tư vào học tập, năng lực lãnh đạo và lộ trình nghề nghiệp dài hạn."
                    : "We invest in learning, leadership development and long-term career growth.",
                },
              ].map((item) => (
                <motion.div
                  key={item.title}
                  whileHover={{ y: -10 }}
                  className="rounded-[32px] border border-white/10 bg-white/[0.045] p-10 transition-all duration-300 hover:border-cyan-300/25 hover:shadow-[0_0_42px_rgba(34,211,238,0.12)]"
                >
                  <h3 className="text-3xl font-bold">{item.title}</h3>
                  <p className="mt-6 text-pretty text-lg leading-relaxed text-slate-400">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="mb-5 font-medium text-cyan-400">{isVi ? "Vị trí đang tuyển" : "Open Positions"}</div>
              <h2 className="text-balance text-4xl font-bold leading-tight lg:text-5xl">
                {isVi ? "Khám phá cơ hội nghề nghiệp" : "Explore Career Opportunities"}
              </h2>
            </div>

            {loading ? (
              <div className="mt-16 grid gap-7 lg:grid-cols-2">
                {[0, 1].map((item) => <JobSkeleton key={item} />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="mt-16 rounded-[36px] border border-white/10 bg-white/[0.035] px-7 py-16 text-center md:px-12 md:py-20">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/8 text-cyan-200">
                  <Briefcase size={27} />
                </div>
                <h3 className="mt-6 text-2xl font-semibold md:text-3xl">
                  {isVi ? "Hiện chưa có vị trí tuyển dụng đang mở" : "There are currently no open positions"}
                </h3>
                <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-slate-400">
                  {isVi
                    ? "FACS luôn chào đón những hồ sơ phù hợp. Bạn có thể gửi CV để chúng tôi chủ động liên hệ khi có cơ hội phù hợp với kinh nghiệm và định hướng của bạn."
                    : "FACS always welcomes strong profiles. You may submit your CV, and we will contact you when a suitable opportunity aligns with your experience and career direction."}
                </p>
                <Link
                  to="/careers/apply"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 px-6 py-3 font-semibold text-cyan-100 transition hover:-translate-y-0.5 hover:bg-cyan-300/10"
                >
                  {isVi ? "Gửi hồ sơ ứng tuyển" : "Submit Your CV"} <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              <div className="mt-16 space-y-7">
                {jobs.map((job, index) => {
                  const localized = getLocalizedJob(job, language);
                  const deadline = formatApplicationDeadline(job.application_deadline, language);

                  return (
                    <motion.article
                      key={job.id}
                      initial={{ opacity: 0, y: 22 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.24) }}
                      whileHover={{ scale: 1.008 }}
                      className="rounded-[32px] border border-white/10 bg-white/[0.045] p-8 transition-all duration-300 hover:border-cyan-300/25 hover:shadow-[0_0_42px_rgba(34,211,238,0.12)] lg:p-10"
                    >
                      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          {localized.department && <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">{localized.department}</div>}
                          <h3 className="mt-3 text-balance text-3xl font-semibold">{localized.title}</h3>
                          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-400">
                            {localized.location && <span className="inline-flex items-center gap-2"><MapPin size={16} /> {localized.location}</span>}
                            <span className="inline-flex items-center gap-2"><Briefcase size={16} /> {getEmploymentTypeLabel(job.employment_type, language)} · {getWorkplaceTypeLabel(job.workplace_type, language)}</span>
                            {deadline && <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {isVi ? "Hạn ứng tuyển" : "Apply by"}: {deadline}</span>}
                          </div>
                          {localized.summary && <p className="mt-5 max-w-4xl leading-relaxed text-slate-400">{localized.summary}</p>}
                        </div>
                        <Link
                          to={`/careers/${job.slug}`}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 px-6 py-3 font-semibold transition-all hover:border-cyan-500 hover:bg-cyan-500"
                        >
                          {isVi ? "Xem chi tiết" : "More Details"} <ArrowRight size={17} />
                        </Link>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 backdrop-blur-xl lg:p-24">
              <div className="max-w-3xl">
                <div className="mb-5 font-medium text-cyan-400">{isVi ? "Gia nhập đội ngũ" : "Join Our Team"}</div>
                <h2 className="text-balance text-4xl font-bold leading-tight lg:text-6xl">
                  {isVi ? "Định hình tương lai của ngành tư vấn doanh nghiệp" : "Shape The Future Of Enterprise Consulting"}
                </h2>
                <p className="mt-8 text-pretty text-lg leading-relaxed text-slate-300">
                  {isVi
                    ? "Phát triển sự nghiệp trong môi trường tư vấn hiện đại, tập trung vào tác động thực tiễn, đổi mới và tăng trưởng bền vững."
                    : "Build your career in a modern consulting environment focused on impact, innovation and sustainable growth."}
                </p>
                <Link to="/careers/apply" className="mt-10 inline-flex rounded-2xl bg-cyan-500 px-8 py-4 transition-all hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.20)]">
                  {isVi ? "Gửi CV của bạn" : "Submit Your CV"}
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
