import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

function handleApplicationSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = form.get("name") || "";
  const phone = form.get("phone") || "";
  const email = form.get("email") || "";
  const position = form.get("position") || "";
  const message = form.get("message") || "";
  const cv = form.get("cv");
  const subject = encodeURIComponent(`CV submission - ${position || "FACS candidate"} - ${name}`);
  const body = encodeURIComponent(`Full name: ${name}\nPhone: ${phone}\nEmail: ${email}\nPosition applied: ${position}\n\nMessage:\n${message}\n\nNote: Please attach the CV file before sending this email.${cv?.name ? `\nSelected CV file: ${cv.name}` : ""}`);
  window.location.href = `mailto:hr@facs.vn?subject=${subject}&body=${body}`;
}

export default function ApplicationPage() {
  const [params] = useSearchParams();
  const selectedPosition = params.get("position") || "";

  return (
    <>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden min-h-screen">
        <section className="relative py-32 border-b border-white/10">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full"></div>
          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <div className="max-w-5xl">
              <div className="text-cyan-400 mb-5 font-medium">Career Application</div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px] text-balance">Submit Your CV</h1>
              <p className="mt-10 text-slate-400 text-xl leading-relaxed max-w-4xl text-pretty">
                Share your profile with FACS and connect with our team for suitable professional opportunities.
              </p>
            </div>
          </div>
        </section>

        <section className="py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <motion.form onSubmit={handleApplicationSubmit} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="mx-auto max-w-4xl rounded-[40px] border border-white/10 bg-white/[0.045] backdrop-blur-xl p-8 lg:p-12 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <input name="name" required placeholder="Full Name" className="rounded-2xl bg-white/[0.045] border border-white/10 p-5 outline-none focus:border-cyan-300/50 transition-all" />
                <input name="phone" required placeholder="Phone Number" className="rounded-2xl bg-white/[0.045] border border-white/10 p-5 outline-none focus:border-cyan-300/50 transition-all" />
                <input name="email" required type="email" placeholder="Email Address" className="rounded-2xl bg-white/[0.045] border border-white/10 p-5 outline-none focus:border-cyan-300/50 transition-all" />
                <input name="position" defaultValue={selectedPosition} placeholder="Applied Position" className="rounded-2xl bg-white/[0.045] border border-white/10 p-5 outline-none focus:border-cyan-300/50 transition-all" />
              </div>
              <textarea name="message" rows="6" placeholder="Message To FACS" className="w-full rounded-2xl bg-white/[0.045] border border-white/10 p-5 outline-none focus:border-cyan-300/50 transition-all"></textarea>
              <div className="rounded-2xl bg-white/[0.035] border border-white/10 p-5">
                <label className="block text-slate-300 mb-3">Attach CV</label>
                <input name="cv" type="file" accept=".pdf,.doc,.docx" className="block w-full text-slate-400 file:mr-5 file:rounded-xl file:border-0 file:bg-cyan-500 file:px-5 file:py-3 file:text-white hover:file:bg-cyan-400 file:transition-all" />
                <p className="mt-3 text-sm text-slate-500">The form will prepare an email to hr@facs.vn. Please attach your CV again in your email application before sending.</p>
              </div>
              <button type="submit" className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.20)]">Submit Application</button>
            </motion.form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
