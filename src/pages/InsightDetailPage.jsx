import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, CalendarDays, Check, Clock3, Copy, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLanguage } from "../components/LanguageContext";
import {
  fallbackPosts,
  formatPostDate,
  getCategoryLabel,
  getLocalizedPost,
} from "../lib/insights";
import { supabase } from "../lib/supabaseClient";

function readingMinutes(html = "") {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.ceil(words / 220));
}

export default function InsightDetailPage() {
  const { slug } = useParams();
  const { language } = useLanguage();
  const isVi = language === "vi";
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchPost = async () => {
      if (!supabase) {
        const fallback = fallbackPosts.find((item) => item.slug === slug) || null;
        if (active) {
          setPost(fallback);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle();

      if (!active) return;
      if (error) console.error("Unable to load Insight article:", error);
      setPost(data || null);
      setLoading(false);
    };

    fetchPost();
    return () => {
      active = false;
    };
  }, [slug]);

  const localized = useMemo(() => (post ? getLocalizedPost(post, language) : null), [post, language]);
  const safeContent = useMemo(() => DOMPurify.sanitize(localized?.content || ""), [localized?.content]);

  useEffect(() => {
    if (!localized) return undefined;
    const previousTitle = document.title;
    const description = localized.seoDescription || localized.excerpt;
    document.title = `${localized.seoTitle || localized.title} | FACS`;

    let meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute("content") || "";
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    if (description) meta.setAttribute("content", description);

    return () => {
      document.title = previousTitle;
      if (meta) meta.setAttribute("content", previousDescription);
    };
  }, [localized]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0d1726] text-white">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" /></div>
        <Footer />
      </main>
    );
  }

  if (!post || !localized) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] text-white">
        <Navbar />
        <section className="container mx-auto px-6 py-28 text-center lg:px-12">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">404</div>
          <h1 className="mt-4 text-4xl font-bold md:text-6xl">{isVi ? "Không tìm thấy bài viết" : "Insight not found"}</h1>
          <p className="mx-auto mt-5 max-w-xl text-slate-400">{isVi ? "Bài viết có thể đã được chuyển về bản nháp hoặc đường dẫn không còn tồn tại." : "The article may have been moved to draft or the link is no longer available."}</p>
          <Link to="/insights" className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-6 py-3 font-bold text-[#071421]"><ArrowLeft size={18} /> {isVi ? "Trở lại Insights" : "Back to Insights"}</Link>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.09),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_52%,#132238_100%)] text-white">
      <Navbar />

      <article>
        <header className="border-b border-white/10">
          <div className="container mx-auto px-6 py-16 lg:px-12 lg:py-24">
            <Link to="/insights" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={16} /> {isVi ? "Tất cả bài viết" : "All Insights"}</Link>
            <div className="mt-10 max-w-4xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">{getCategoryLabel(post.category, language)}</div>
              <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.12] md:text-6xl lg:text-7xl">{localized.title}</h1>
              {localized.excerpt && <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-400 md:text-xl">{localized.excerpt}</p>}

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2"><UserRound size={16} /> {post.author_name || "FACS"}</span>
                {post.published_at && <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> {formatPostDate(post.published_at, language)}</span>}
                <span className="inline-flex items-center gap-2"><Clock3 size={16} /> {readingMinutes(localized.content)} {isVi ? "phút đọc" : "min read"}</span>
                <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 transition hover:text-cyan-200">{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? (isVi ? "Đã sao chép" : "Copied") : (isVi ? "Sao chép liên kết" : "Copy link")}</button>
              </div>
            </div>
          </div>
        </header>

        {post.cover_image_url && (
          <div className="container mx-auto px-6 pt-10 lg:px-12 lg:pt-14">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.025] p-2 shadow-[0_35px_110px_rgba(0,0,0,0.32)] sm:p-3">
              <img src={post.cover_image_url} alt={localized.coverAlt} className="h-auto w-full rounded-[26px] object-contain" />
            </div>
          </div>
        )}

        <div className="container mx-auto px-6 py-16 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-3xl">
            {safeContent ? (
              <div className="facs-article" dangerouslySetInnerHTML={{ __html: safeContent }} />
            ) : (
              <p className="text-slate-500">{isVi ? "Bài viết chưa có nội dung trong ngôn ngữ này." : "This article does not have content in this language yet."}</p>
            )}

            <div className="mt-16 flex flex-col justify-between gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">FACS Insights</div>
                <div className="mt-2 text-sm text-slate-500">{isVi ? "Góc nhìn chuyên môn cho quyết định kinh doanh vững chắc hơn." : "Professional perspectives for more confident business decisions."}</div>
              </div>
              <Link to="/contact" className="inline-flex justify-center rounded-2xl border border-cyan-200/25 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300 hover:text-[#071421]">{isVi ? "Trao đổi cùng FACS" : "Talk With FACS"}</Link>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </main>
  );
}
