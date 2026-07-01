import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLanguage } from "../components/LanguageContext";
import {
  fallbackPosts,
  formatPostDate,
  getCategoryLabel,
  getLocalizedPost,
  insightCategories,
} from "../lib/insights";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
      <div className="h-56 animate-pulse bg-white/[0.06]" />
      <div className="space-y-4 p-8">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-7 w-4/5 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [posts, setPosts] = useState(isSupabaseConfigured ? [] : fallbackPosts);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;

    const fetchPosts = async (showLoading = false) => {
      if (!supabase) {
        setPosts(fallbackPosts);
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false });

      if (!active) return;
      if (error) {
        console.error("Unable to load Insights posts:", error);
        if (showLoading) setPosts(fallbackPosts);
      } else {
        setPosts(data || []);
      }
      setLoading(false);
    };

    const refreshOnFocus = () => fetchPosts(false);
    fetchPosts(true);
    const refreshTimer = window.setInterval(() => fetchPosts(false), 60000);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return posts.filter((post) => {
      const localized = getLocalizedPost(post, language);
      const matchesCategory = category === "all" || post.category === category;
      const matchesQuery = !normalized || `${localized.title} ${localized.excerpt}`.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [posts, query, category, language]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
      <Navbar />
      <section className="border-b border-white/10 py-24 md:py-32">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-4xl">
            <div className="mb-4 text-cyan-400">{isVi ? "Góc nhìn chuyên môn" : "Insights & Perspectives"}</div>
            <h1 className="text-balance text-5xl font-bold leading-tight lg:text-7xl">
              {isVi ? "Tri thức kinh doanh chiến lược" : "Strategic Business Intelligence"}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-slate-400">
              {isVi
                ? "Phân tích thực tiễn về kế toán, thuế, tài chính, pháp lý và quản trị dành cho doanh nghiệp tại Việt Nam."
                : "Practical perspectives on accounting, tax, finance, legal compliance and governance for enterprises in Vietnam."}
            </p>
          </div>

          <div className="mt-14 grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.035] p-4 lg:grid-cols-[minmax(260px,1fr)_auto]">
            <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/55 px-4 focus-within:border-cyan-300/35">
              <Search size={18} className="text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isVi ? "Tìm kiếm bài viết..." : "Search insights..."}
                className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              <button type="button" onClick={() => setCategory("all")} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${category === "all" ? "bg-cyan-300 text-[#071421]" : "border border-white/10 text-slate-300 hover:border-cyan-200/25 hover:text-white"}`}>
                {isVi ? "Tất cả" : "All"}
              </button>
              {insightCategories.map((item) => (
                <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${category === item.value ? "bg-cyan-300 text-[#071421]" : "border border-white/10 text-slate-300 hover:border-cyan-200/25 hover:text-white"}`}>
                  {item[language] || item.en}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {[0, 1, 2].map((item) => <PostSkeleton key={item} />)}
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="mt-12 rounded-[32px] border border-white/10 bg-white/[0.035] px-7 py-20 text-center">
              <div className="text-2xl font-semibold">{isVi ? "Chưa có bài viết phù hợp" : "No matching insights yet"}</div>
              <p className="mt-3 text-slate-500">{isVi ? "Hãy thử thay đổi từ khóa hoặc chuyên mục." : "Try a different keyword or category."}</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              {visiblePosts.map((post, index) => {
                const localized = getLocalizedPost(post, language);
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.24) }}
                    whileHover={{ y: -9 }}
                    className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.045] transition-all duration-300 hover:border-cyan-300/25 hover:shadow-[0_0_48px_rgba(34,211,238,0.14)]"
                  >
                    <Link to={`/insights/${localized.slug}`} className="block h-full">
                      <div className="relative h-56 overflow-hidden bg-[#0d1726]">
                        {post.cover_image_url ? (
                          <img src={post.cover_image_url} alt={localized.coverAlt} loading="lazy" className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_40%),linear-gradient(135deg,#0b1625,#142943)]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1726]/85 via-transparent to-transparent" />
                        {post.featured && <span className="absolute left-5 top-5 rounded-full border border-cyan-200/20 bg-[#0d1726]/75 px-3 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-xl">{isVi ? "Nổi bật" : "Featured"}</span>}
                      </div>

                      <div className="flex min-h-[290px] flex-col p-7 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm uppercase tracking-[0.16em] text-cyan-400">{getCategoryLabel(post.category, language)}</div>
                          {post.published_at && <div className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={14} /> {formatPostDate(post.published_at, language)}</div>}
                        </div>
                        <h2 className="mt-4 text-balance text-2xl font-semibold leading-snug">{localized.title}</h2>
                        {localized.excerpt && <p className="mt-4 line-clamp-3 leading-relaxed text-slate-400">{localized.excerpt}</p>}
                        <span className="mt-auto inline-flex items-center gap-2 pt-8 font-semibold text-cyan-400 transition-all duration-300 group-hover:gap-3 group-hover:text-cyan-200">
                          {isVi ? "Đọc bài viết" : "Read Article"} <ArrowRight size={17} />
                        </span>
                      </div>
                    </Link>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
