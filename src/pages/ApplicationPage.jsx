import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";
import { newSubmissionKey, submitWebsiteForm } from "../lib/formSubmissions";

export default function ApplicationPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [params] = useSearchParams();
  const selectedPosition = params.get("position") || "";
  const jobPostId = params.get("job") || "";
  const submissionKey = useRef(newSubmissionKey());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError("");
    try {
      await submitWebsiteForm(formElement, {
        type: "career",
        language,
        submissionKey: submissionKey.current,
        extra: { job_post_id: jobPostId },
      });
      setSuccess(true);
      submissionKey.current = newSubmissionKey();
      formElement.reset();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-32">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="max-w-5xl">
              <div className="mb-5 font-medium text-cyan-400">{isVi ? "Ứng tuyển tại FACS" : "Career Application"}</div>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-[-3px] text-balance lg:text-7xl">{isVi ? "Gửi hồ sơ ứng tuyển" : "Submit Your CV"}</h1>
              <p className="mt-10 max-w-4xl text-xl leading-relaxed text-slate-400">
                {isVi ? "Chia sẻ hồ sơ của bạn để FACS xem xét những cơ hội nghề nghiệp phù hợp." : "Share your profile with FACS for suitable professional opportunities."}
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            {success ? (
              <div className="mx-auto max-w-3xl rounded-[36px] border border-emerald-300/20 bg-emerald-300/8 p-9 text-center">
                <CheckCircle2 className="mx-auto text-emerald-300" size={46} />
                <h2 className="mt-5 text-2xl font-bold">{isVi ? "FACS đã nhận được hồ sơ của bạn" : "FACS has received your application"}</h2>
                <p className="mt-3 text-slate-300">{isVi ? "Email xác nhận sẽ được gửi tới địa chỉ bạn đã cung cấp. FACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất." : "A confirmation email will be sent to the address provided. FACS will get back to you as soon as possible."}</p>
                <Link to="/careers" className="mt-7 inline-flex rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-[#071421]">{isVi ? "Trở lại Tuyển dụng" : "Back to Careers"}</Link>
              </div>
            ) : (
              <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mx-auto max-w-4xl space-y-6 rounded-[40px] border border-white/10 bg-white/[0.045] p-8 backdrop-blur-xl lg:p-12">
                <div className="grid gap-6 md:grid-cols-2">
                  <input name="full_name" required placeholder={isVi ? "Họ và tên *" : "Full Name *"} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <input name="phone" required placeholder={isVi ? "Số điện thoại *" : "Phone Number *"} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <input name="email" required type="email" placeholder={isVi ? "Địa chỉ email *" : "Email Address *"} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <input name="position" defaultValue={selectedPosition} placeholder={isVi ? "Vị trí ứng tuyển" : "Applied Position"} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                </div>
                <textarea name="message" rows="6" placeholder={isVi ? "Lời nhắn đến FACS" : "Message To FACS"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <label className="mb-3 block text-slate-300">{isVi ? "Đính kèm CV *" : "Attach CV *"}</label>
                  <input name="cv" required type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="block w-full text-slate-400 file:mr-5 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-5 file:py-3 file:text-white hover:file:bg-cyan-400" />
                  <p className="mt-3 text-sm text-slate-500">{isVi ? "PDF, DOC hoặc DOCX — tối đa 5 MB." : "PDF, DOC or DOCX — maximum 5 MB."}</p>
                </div>
                <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-400">
                  <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" />
                  <span>{isVi ? "Tôi đồng ý để FACS thu thập và xử lý thông tin nhằm xem xét hồ sơ ứng tuyển." : "I consent to FACS collecting and processing my information for application review."} <Link to="/privacy" className="text-cyan-300 underline">{isVi ? "Chính sách bảo mật" : "Privacy Policy"}</Link></span>
                </label>
                <input name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />
                {error && <div className="rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
                <button disabled={submitting} type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 font-semibold transition-all hover:-translate-y-1 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? (isVi ? "Đang gửi..." : "Submitting...") : (isVi ? "Gửi hồ sơ" : "Submit Application")}
                </button>
              </motion.form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
