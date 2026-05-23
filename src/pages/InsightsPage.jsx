import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import taxImage from "../assets/insight-tax.svg";
import financeImage from "../assets/insight-finance.svg";
import legalImage from "../assets/insight-legal.svg";

const posts = [
  { title: "Enterprise Tax Strategy In 2026", category: "Tax", image: taxImage },
  { title: "Modern Financial Infrastructure", category: "Finance", image: financeImage },
  { title: "Corporate Governance Transformation", category: "Legal", image: legalImage },
];

export default function InsightsPage() {
  return (
    <main className="bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] min-h-screen text-white">
      <Navbar />
      <section className="py-32 border-b border-white/10">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl">
            <div className="text-cyan-400 mb-4">Insights</div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight text-balance">Strategic Business Intelligence</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mt-20">
            {posts.map((post, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="group rounded-[32px] overflow-hidden border border-white/10 bg-white/[0.045] hover:border-cyan-300/25 hover:shadow-[0_0_48px_rgba(34,211,238,0.14)] transition-all duration-300"
              >
                <div className="relative h-56 overflow-hidden bg-[#0d1726]">
                  <img src={post.image} alt={post.category} className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1726]/80 via-transparent to-transparent" />
                </div>

                <div className="p-8">
                  <div className="text-cyan-400 text-sm tracking-[0.16em] uppercase">{post.category}</div>
                  <h3 className="mt-4 text-2xl font-semibold leading-snug text-balance min-h-[64px]">{post.title}</h3>
                  <span className="mt-8 inline-block text-cyan-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-cyan-200">
                    Read Article →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
