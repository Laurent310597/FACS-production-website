import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../components/LanguageContext";
import { newSubmissionKey, submitWebsiteForm } from "../lib/formSubmissions";

export default function ContactPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
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
        type: "contact",
        language,
        submissionKey: submissionKey.current,
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
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-32">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="max-w-5xl">
              <div className="mb-5 text-base font-bold text-cyan-300 lg:text-lg">{isVi ? "Liên hệ FACS" : "Contact FACS"}</div>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-[-3px] text-balance lg:text-7xl">{isVi ? "Cùng kiến tạo giá trị bền vững" : "Let’s Build Together"}</h1>
              <p className="mt-10 max-w-4xl text-xl leading-relaxed text-slate-400">
                {isVi ? "Liên hệ FACS để được tư vấn các giải pháp chiến lược về tài chính, thuế, pháp lý và vận hành doanh nghiệp." : "Contact FACS for strategic financial, taxation, legal and enterprise consulting solutions."}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-24 lg:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid gap-20 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }}>
                <h2 className="text-4xl font-bold">{isVi ? "Gửi thông tin tư vấn" : "Send Inquiry"}</h2>
                {success ? (
                  <div className="mt-10 rounded-[32px] border border-emerald-300/20 bg-emerald-300/8 p-8">
                    <CheckCircle2 className="text-emerald-300" size={42} />
                    <h3 className="mt-5 text-2xl font-bold">{isVi ? "FACS đã nhận được yêu cầu của bạn" : "FACS has received your inquiry"}</h3>
                    <p className="mt-3 leading-relaxed text-slate-300">{isVi ? "Email xác nhận sẽ được gửi tới địa chỉ bạn đã cung cấp. FACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất." : "A confirmation email will be sent to the address provided. FACS will get back to you as soon as possible."}</p>
                    <button type="button" onClick={() => setSuccess(false)} className="mt-6 rounded-2xl border border-white/15 px-5 py-3 font-semibold text-cyan-200">{isVi ? "Gửi yêu cầu khác" : "Send another inquiry"}</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                    <input name="full_name" required type="text" placeholder={isVi ? "Họ và tên *" : "Your Name *"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                    <div className="grid gap-6 md:grid-cols-2">
                      <input name="email" required type="email" placeholder={isVi ? "Địa chỉ email *" : "Email Address *"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                      <input name="phone" type="text" placeholder={isVi ? "Số điện thoại" : "Phone Number"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                      <input name="company_name" type="text" placeholder={isVi ? "Công ty" : "Company"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                      <input name="service_interest" type="text" placeholder={isVi ? "Dịch vụ quan tâm" : "Service of Interest"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                    </div>
                    <textarea name="message" required rows="6" placeholder={isVi ? "Nội dung cần tư vấn *" : "Message *"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                    <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-400">
                      <input name="consent" required type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" />
                      <span>{isVi ? "Tôi đồng ý để FACS thu thập và xử lý thông tin nhằm phản hồi yêu cầu này." : "I consent to FACS collecting and processing my information to respond to this inquiry."} <Link to="/privacy" className="text-cyan-300 underline">{isVi ? "Chính sách bảo mật" : "Privacy Policy"}</Link></span>
                    </label>
                    <input name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px opacity-0" />
                    {error && <div className="rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
                    <button disabled={submitting} type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-8 py-4 font-semibold text-[#06111f] transition-all hover:-translate-y-1 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">
                      {submitting && <Loader2 size={18} className="animate-spin" />}{submitting ? (isVi ? "Đang gửi..." : "Sending...") : (isVi ? "Gửi yêu cầu" : "Send Message")}
                    </button>
                    <p className="text-sm leading-relaxed text-slate-500">{isVi ? "Sau khi gửi, FACS sẽ lưu yêu cầu và gửi email xác nhận tự động cho bạn." : "After submission, FACS will save your inquiry and send you an automatic confirmation email."}</p>
                  </form>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }}>
                <div className="rounded-[40px] border border-white/10 bg-white/[0.045] p-10 backdrop-blur-xl">
                  <div className="space-y-8">
                    {[
                      [Phone, isVi ? "Điện thoại" : "Hotline", "(+84) 972 798 424"],
                      [Mail, "Email", "contact@facs.vn"],
                      [MapPin, isVi ? "Văn phòng chính" : "Head Office", isVi ? "31/3A Nguyễn Văn Lạc, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh" : "31/3A Nguyen Van Lac Street, Ward 21, Binh Thanh District, Ho Chi Minh City, Vietnam"],
                      [MapPin, isVi ? "Văn phòng chi nhánh" : "Branch Office", isVi ? "309 Bạch Đằng, Phường 2, Quận Bình Thạnh, Thành phố Hồ Chí Minh" : "309 Bach Dang Street, Ward 2, Binh Thanh District, Ho Chi Minh City, Vietnam"],
                    ].map(([Icon, label, value]) => (
                      <div key={`${label}-${value}`} className="flex gap-4 rounded-3xl border border-white/10 bg-[#111827]/60 p-5 transition-all hover:border-cyan-300/25 hover:bg-white/[0.055]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300"><Icon size={22} /></div>
                        <div><div className="text-slate-400">{label}</div><div className="mt-2 text-lg font-semibold leading-relaxed text-slate-100">{value}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
