import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, Edit3, FilePlus2, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { getCategoryLabel, getLocalizedPost, slugify } from "../../lib/insights";
import { formatVietnamDateTime, getPublicationState } from "../../lib/publication";
import { supabase } from "../../lib/supabaseClient";

const statusStyles = {
  published: "bg-emerald-300/10 text-emerald-200",
  scheduled: "bg-violet-300/10 text-violet-200",
  draft: "bg-amber-300/10 text-amber-200",
};

const statusLabels = {
  published: "Đã xuất bản",
  scheduled: "Đã lên lịch",
  draft: "Bản nháp",
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const fetchPosts = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialPosts = async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      setPosts(data || []);
      setLoading(false);
    };

    loadInitialPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return posts.filter((post) => {
      const publicationState = getPublicationState(post, now);
      const matchesStatus = status === "all" || publicationState === status;
      const searchText = `${post.title_vi || ""} ${post.title_en || ""} ${post.slug || ""}`.toLowerCase();
      return matchesStatus && (!normalized || searchText.includes(normalized));
    });
  }, [posts, query, status, now]);

  const deletePost = async (post) => {
    const title = getLocalizedPost(post, "vi").title;
    if (!window.confirm(`Bạn có chắc muốn xóa bài “${title}”?`)) return;

    const { error: deleteError } = await supabase.from("posts").delete().eq("id", post.id);
    if (deleteError) {
      window.alert(`Không thể xóa bài: ${deleteError.message}`);
      return;
    }
    setPosts((current) => current.filter((item) => item.id !== post.id));
  };

  const duplicatePost = async (post) => {
    const baseTitle = post.title_vi || post.title_en || "Bản sao";
    const baseSlug = `${slugify(baseTitle)}-copy`;
    const copyNumbers = posts
      .map((item) => item.slug?.match(new RegExp(`^${baseSlug}-(\\d+)$`)))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    const copyNumber = Math.max(0, ...copyNumbers) + 1;
    const { data: sessionData } = await supabase.auth.getSession();
    const payload = {
      slug: `${baseSlug}-${copyNumber}`,
      category: post.category,
      title_vi: post.title_vi ? `${post.title_vi} - Bản sao` : null,
      title_en: post.title_en ? `${post.title_en} - Copy` : null,
      excerpt_vi: post.excerpt_vi,
      excerpt_en: post.excerpt_en,
      content_vi: post.content_vi,
      content_en: post.content_en,
      cover_image_url: post.cover_image_url,
      cover_image_alt_vi: post.cover_image_alt_vi,
      cover_image_alt_en: post.cover_image_alt_en,
      author_name: post.author_name,
      featured: false,
      seo_title_vi: post.seo_title_vi,
      seo_title_en: post.seo_title_en,
      seo_description_vi: post.seo_description_vi,
      seo_description_en: post.seo_description_en,
      status: "draft",
      published_at: null,
      created_by: sessionData.session?.user?.id || null,
    };

    const { error: duplicateError } = await supabase.from("posts").insert(payload);
    if (duplicateError) {
      window.alert(`Không thể nhân bản bài: ${duplicateError.message}`);
      return;
    }
    fetchPosts();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Quản lý nội dung</div>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Danh sách bài viết</h1>
          <p className="mt-2 text-sm text-slate-400">Tạo, lưu nháp, hẹn giờ hoặc đăng ngay bài viết trên trang Insights.</p>
        </div>
        <Link to="/admin/posts/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200">
          <FilePlus2 size={18} /> Viết bài mới
        </Link>
      </div>

      <div className="mt-7 grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_auto]">
        <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/35">
          <Search size={18} className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề hoặc đường dẫn..." className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="draft">Bản nháp</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035]">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" /></div>
        ) : error ? (
          <div className="p-8 text-red-200">Không thể tải bài viết: {error}</div>
        ) : filteredPosts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-xl font-semibold">Chưa có bài viết phù hợp</div>
            <p className="mt-2 text-sm text-slate-400">Hãy tạo bài đầu tiên hoặc thay đổi bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredPosts.map((post) => {
              const localized = getLocalizedPost(post, "vi");
              const publicationState = getPublicationState(post, now);
              return (
                <article key={post.id} className="grid gap-4 p-5 transition hover:bg-white/[0.025] md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-center md:p-6">
                  <div className="h-20 overflow-hidden rounded-2xl border border-white/10 bg-[#081321]">
                    {post.cover_image_url ? <img src={post.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-600">No image</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-200">{getCategoryLabel(post.category, "vi")}</span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${statusStyles[publicationState]}`}>
                        {statusLabels[publicationState]}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-semibold text-white">{localized.title}</h2>
                    <div className="mt-1 truncate text-sm text-slate-500">/insights/{post.slug}</div>
                    {publicationState === "scheduled" && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-violet-200">
                        <CalendarClock size={14} /> Tự động đăng lúc {formatVietnamDateTime(post.published_at)} (UTC+7)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <button type="button" onClick={() => duplicatePost(post)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Nhân bản"><Copy size={17} /></button>
                    <Link to={`/admin/posts/${post.id}/edit`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Chỉnh sửa"><Edit3 size={17} /></Link>
                    <button type="button" onClick={() => deletePost(post)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-red-300/30 hover:text-red-200" title="Xóa"><Trash2 size={17} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
