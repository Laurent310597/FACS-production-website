import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const jobs = [
  { title: "Senior Tax Consultant", type: "Full-time", location: "Ho Chi Minh City" },
  { title: "Accounting Specialist", type: "Full-time", location: "Ho Chi Minh City" },
  { title: "Corporate Legal Consultant", type: "Full-time", location: "Hybrid" },
  { title: "Business Development Executive", type: "Full-time", location: "Remote" },
];

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white overflow-hidden">
        <section className="relative py-32 border-b border-white/10">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full"></div>
          <div className="container mx-auto px-6 lg:px-12 relative z-10">
            <div className="max-w-5xl">
              <div className="text-cyan-400 mb-5 font-medium">Careers</div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-[-3px] text-balance">Build The Future With FACS</h1>
              <p className="mt-10 text-slate-400 text-xl leading-relaxed max-w-4xl text-pretty">
                Join a modern consulting environment focused on innovation, strategic thinking and sustainable enterprise growth.
              </p>
            </div>
          </div>
        </section>

        <section className="py-32 border-b border-white/10">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid lg:grid-cols-3 gap-8">
              {[
                { title: "Innovation", desc: "We embrace modern systems, digital transformation and continuous improvement." },
                { title: "Professionalism", desc: "We maintain high standards in expertise, ethics and enterprise consulting." },
                { title: "Growth", desc: "We invest in learning, leadership development and long-term career growth." },
              ].map((item, index) => (
                <motion.div key={index} whileHover={{ y: -10 }} className="rounded-[32px] border border-white/10 bg-white/[0.045] p-10 hover:border-cyan-300/25 hover:shadow-[0_0_42px_rgba(34,211,238,0.12)] transition-all duration-300">
                  <h3 className="text-3xl font-bold">{item.title}</h3>
                  <p className="mt-6 text-slate-400 leading-relaxed text-lg text-pretty">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 border-b border-white/10">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-4xl">
              <div className="text-cyan-400 mb-5 font-medium">Open Positions</div>
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight text-balance">Explore Career Opportunities</h2>
            </div>

            <div className="mt-20 space-y-8">
              {jobs.map((job, index) => (
                <motion.div key={index} whileHover={{ scale: 1.01 }} className="rounded-[32px] border border-white/10 bg-white/[0.045] p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:border-cyan-300/25 hover:shadow-[0_0_42px_rgba(34,211,238,0.12)] transition-all duration-300">
                  <div>
                    <h3 className="text-3xl font-semibold text-balance">{job.title}</h3>
                    <div className="mt-4 flex gap-4 text-slate-400"><div>{job.type}</div><div>•</div><div>{job.location}</div></div>
                  </div>
                  <Link to={`/careers/apply?position=${encodeURIComponent(job.title)}`} className="px-6 py-3 rounded-2xl border border-cyan-400/20 hover:bg-cyan-500 hover:border-cyan-500 transition-all text-center">
                    More Details
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="rounded-[48px] border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 p-12 lg:p-24 backdrop-blur-xl">
              <div className="max-w-3xl">
                <div className="text-cyan-400 mb-5 font-medium">Join Our Team</div>
                <h2 className="text-4xl lg:text-6xl font-bold leading-tight text-balance">Shape The Future Of Enterprise Consulting</h2>
                <p className="mt-8 text-slate-300 text-lg leading-relaxed text-pretty">
                  Build your career in a modern consulting environment focused on impact, innovation and sustainable growth.
                </p>
                <Link to="/careers/apply" className="inline-flex mt-10 px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(34,211,238,0.20)]">
                  Submit Your CV
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
