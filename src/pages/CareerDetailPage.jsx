import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, ArrowRight, Briefcase, CalendarDays, Loader2, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";
import {
  formatApplicationDeadline,
  getEmploymentTypeLabel,
  getLocalizedJob,
  getWorkplaceTypeLabel,
} from "../lib/careers";
import { supabase } from "../lib/supabaseClient";

export default function CareerDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchJob = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (!active) return;
      if (error) console.error("Unable to load career opportunity:", error);
      setJob(data || null);
      setLoading(false);
    };

    fetchJob();
    return () => {
      active = false;
    };
  }, [slug]);

  const localized = useMemo(() => (job ? getLocalizedJob(job, language) : null), [job, language]);
  const safeContent = useMemo(() => DOMPurify.sanitize(localized?.content || ""), [localized?.content]);
  const deadline = formatApplicationDeadline(job?.application_deadline, language);

  useEffect(() => {
    if (!localized?.title) return;
    const previousTitle = document.title;
    document.title = `${localized.title} | FACS Careers`;
    return () => {
      document.title = previousTitle;
    };
  }, [localized?.title]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        {loading ? (
          <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-cyan-300" size={36} /></div>
        ) : !job || !localized ? (
          <section className="container mx-auto px-6 py-32 lg:px-12">
            <div className="mx-auto max-w-3xl rounded-[36px] border border-white/10 bg-white/[0.035] px-8 py-20 text-center">
              <h1 className="text-3xl font-bold">{isVi ? "Vị trí tuyển dụng không còn khả dụng" : "This career opportunity is no longer available"}</h1>
              <p className="mt-4 leading-relaxed text-slate-400">
                {isVi ? "Vị trí có thể đã được đóng, chưa được xuất bản hoặc đường dẫn không chính xác." : "The position may have been closed, unpublished, or the link may be incorrect."}
              </p>
              <Link to="/careers" className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-cyan-300/25 px-6 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
                <ArrowLeft size={17} /> {isVi ? "Quay lại Tuyển dụng" : "Back to Careers"}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="border-b border-white/10 py-24 md:py-32">
              <div className="container mx-auto px-6 lg:px-12">
                <Link to="/careers" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200">
                  <ArrowLeft size={16} /> {isVi ? "Quay lại danh sách tuyển dụng" : "Back to career opportunities"}
                </Link>
                <div className="mt-10 max-w-5xl">
                  {localized.department && <div className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{localized.department}</div>}
                  <h1 className="mt-5 text-balance text-5xl font-bold leading-[1.06] tracking-[-2px] lg:text-7xl">{localized.title}</h1>
                  {localized.summary && <p className="mt-8 max-w-4xl text-xl leading-relaxed text-slate-400">{localized.summary}</p>}
                  <div className="mt-9 flex flex-wrap gap-3">
                    {localized.location && <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"><MapPin size={16} /> {localized.location}</span>}
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"><Briefcase size={16} /> {getEmploymentTypeLabel(job.employment_type, language)}</span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"><Briefcase size={16} /> {getWorkplaceTypeLabel(job.workplace_type, language)}</span>
                    {deadline && <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"><CalendarDays size={16} /> {isVi ? "Hạn ứng tuyển" : "Apply by"}: {deadline}</span>}
                  </div>
                </div>
              </div>
            </section>

            <section className="py-20 md:py-28">
              <div className="container mx-auto grid gap-10 px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-12">
                <article className="rounded-[36px] border border-white/10 bg-white/[0.035] p-7 md:p-10 lg:p-12">
                  <div className="mb-8 text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">{isVi ? "Mô tả công việc" : "Job Description"}</div>
                  {safeContent ? (
                    <div className="facs-article" dangerouslySetInnerHTML={{ __html: safeContent }} />
                  ) : (
                    <p className="text-slate-400">{isVi ? "Nội dung chi tiết đang được cập nhật." : "Detailed information is being updated."}</p>
                  )}
                </article>

                <aside className="h-fit rounded-[32px] border border-cyan-200/15 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-7 lg:sticky lg:top-28">
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">{isVi ? "Ứng tuyển tại FACS" : "Apply To FACS"}</div>
                  <h2 className="mt-4 text-2xl font-bold">{isVi ? "Sẵn sàng cho bước tiếp theo?" : "Ready for your next step?"}</h2>
                  <p className="mt-4 leading-relaxed text-slate-400">
                    {isVi ? "Gửi hồ sơ để đội ngũ FACS xem xét và liên hệ với bạn về quy trình tuyển dụng." : "Submit your profile for the FACS team to review and contact you regarding the recruitment process."}
                  </p>
                  <Link
                    to={`/careers/apply?position=${encodeURIComponent(localized.title)}`}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                  >
                    {isVi ? "Ứng tuyển vị trí này" : "Apply For This Position"} <ArrowRight size={17} />
                  </Link>
                </aside>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
