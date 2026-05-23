import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "../components/LanguageContext";

function handleContactSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = form.get("name") || "";
  const email = form.get("email") || "";
  const phone = form.get("phone") || "";
  const message = form.get("message") || "";
  const subject = encodeURIComponent(`Website inquiry from ${name || "FACS client"}`);
  const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`);
  window.location.href = `mailto:contact@facs.vn?subject=${subject}&body=${body}`;
}

export default function ContactPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";

  return (
    <>
      <Navbar />
      <main className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <section className="relative border-b border-white/10 py-32">
          <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="container relative z-10 mx-auto px-6 lg:px-12">
            <div className="max-w-5xl">
              <div className="mb-5 text-base font-bold text-cyan-300 lg:text-lg">{isVi ? "Liên hệ FACS" : "Contact FACS"}</div>
              <h1 className="text-5xl font-bold leading-[1.05] tracking-[-3px] text-balance lg:text-7xl">
                {isVi ? "Cùng kiến tạo giá trị bền vững" : "Let’s Build Together"}
              </h1>
              <p className="mt-10 max-w-4xl text-xl leading-relaxed text-slate-400 text-pretty">
                {isVi
                  ? "Liên hệ FACS để được tư vấn các giải pháp chiến lược về tài chính, thuế, pháp lý và vận hành doanh nghiệp."
                  : "Contact FACS for strategic financial, taxation, legal and enterprise consulting solutions."}
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid gap-20 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8 }}>
                <h2 className="text-4xl font-bold">{isVi ? "Gửi thông tin tư vấn" : "Send Inquiry"}</h2>
                <form onSubmit={handleContactSubmit} className="mt-10 space-y-6">
                  <input name="name" required type="text" placeholder={isVi ? "Họ và tên" : "Your Name"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <input name="email" required type="email" placeholder={isVi ? "Địa chỉ email" : "Email Address"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <input name="phone" type="text" placeholder={isVi ? "Số điện thoại" : "Phone Number"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <textarea name="message" required rows="6" placeholder={isVi ? "Nội dung cần tư vấn" : "Message"} className="w-full rounded-2xl border border-white/10 bg-white/[0.045] p-5 outline-none transition-all focus:border-cyan-300/50" />
                  <button type="submit" className="rounded-2xl bg-cyan-500 px-8 py-4 font-semibold text-[#06111f] transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.20)]">
                    {isVi ? "Gửi yêu cầu" : "Send Message"}
                  </button>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {isVi
                      ? "Biểu mẫu sẽ mở ứng dụng email và chuẩn bị nội dung gửi đến contact@facs.vn."
                      : "This form opens your email application and prepares the message to contact@facs.vn for submission."}
                  </p>
                </form>
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
                      <div key={`${label}-${value}`} className="flex gap-4 rounded-3xl border border-white/10 bg-[#111827]/60 p-5 transition-all duration-300 hover:border-cyan-300/25 hover:bg-white/[0.055]">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300"><Icon size={22} /></div>
                        <div>
                          <div className="text-slate-400">{label}</div>
                          <div className="mt-2 text-lg font-semibold leading-relaxed text-slate-100">{value}</div>
                        </div>
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
