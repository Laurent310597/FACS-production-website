import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Eye, ImagePlus, Loader2, Save, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import RichTextEditor from "../../components/admin/RichTextEditor";
import { insightCategories, slugify } from "../../lib/insights";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  slug: "",
  category: "business",
  title_en: "",
  title_vi: "",
  excerpt_en: "",
  excerpt_vi: "",
  content_en: "",
  content_vi: "",
  cover_image_url: "",
  cover_image_alt_en: "",
  cover_image_alt_vi: "",
  author_name: "FACS",
  featured: false,
  seo_title_en: "",
  seo_title_vi: "",
  seo_description_en: "",
  seo_description_vi: "",
  status: "draft",
  published_at: null,
};

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function cleanFileName(name = "image") {
  const extension = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
  const base = name.replace(/\.[^/.]+$/, "");
  return `${slugify(base) || "image"}${extension}`;
}

export default function AdminPostEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [activeLanguage, setActiveLanguage] = useState("vi");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) return;

    const fetchPost = async () => {
      const { data, error: fetchError } = await supabase.from("posts").select("*").eq("id", id).single();
      if (fetchError) {
        setError(`Không thể tải bài viết: ${fetchError.message}`);
      } else {
        setForm({ ...emptyForm, ...data });
        if (!data.title_vi && data.title_en) setActiveLanguage("en");
      }
      setLoading(false);
    };

    fetchPost();
  }, [id, isEditing]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const activeTitle = form[`title_${activeLanguage}`] || form.title_vi || form.title_en || "Bài viết chưa có tiêu đề";
  const activeExcerpt = form[`excerpt_${activeLanguage}`] || form.excerpt_vi || form.excerpt_en || "";
  const activeContent = form[`content_${activeLanguage}`] || form.content_vi || form.content_en || "";

  const safePreview = useMemo(() => DOMPurify.sanitize(activeContent), [activeContent]);

  const handleTitleChange = (value) => {
    const field = `title_${activeLanguage}`;
    setForm((current) => {
      const shouldGenerateSlug = !current.slug || current.slug === slugify(current.title_vi || current.title_en || "");
      return {
        ...current,
        [field]: value,
        slug: shouldGenerateSlug ? slugify(value) : current.slug,
      };
    });
  };

  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file hình ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh bìa không được vượt quá 5 MB.");
      return;
    }

    setUploading(true);
    setError("");
    const path = `covers/${Date.now()}-${cleanFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from("insight-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (uploadError) {
      setError(`Không thể tải ảnh: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("insight-images").getPublicUrl(path);
    updateField("cover_image_url", data.publicUrl);
    setUploading(false);
  };

  const savePost = async (nextStatus) => {
    setError("");

    const hasTitle = Boolean(form.title_vi.trim() || form.title_en.trim());
    const hasContent = Boolean(stripHtml(form.content_vi) || stripHtml(form.content_en));
    const finalSlug = slugify(form.slug || form.title_vi || form.title_en);

    if (!hasTitle) {
      setError("Vui lòng nhập tiêu đề tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!hasContent) {
      setError("Vui lòng nhập nội dung tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!finalSlug) {
      setError("Không thể tạo đường dẫn bài viết. Vui lòng nhập lại tiêu đề hoặc slug.");
      return;
    }

    setSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const publishedAt = nextStatus === "published" ? form.published_at || new Date().toISOString() : null;
    const payload = {
      ...form,
      slug: finalSlug,
      status: nextStatus,
      published_at: publishedAt,
      created_by: authData.session?.user?.id || null,
    };

    const request = isEditing
      ? supabase.from("posts").update(payload).eq("id", id)
      : supabase.from("posts").insert(payload);
    const { error: saveError } = await request;

    setSaving(false);

    if (saveError) {
      const message = saveError.code === "23505" ? "Đường dẫn bài viết đã tồn tại. Vui lòng đổi slug." : saveError.message;
      setError(`Không thể lưu bài viết: ${message}`);
      return;
    }

    navigate("/admin/posts", { replace: true });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-cyan-300" size={34} /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link to="/admin/posts" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={16} /> Trở lại danh sách</Link>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{isEditing ? "Chỉnh sửa bài viết" : "Viết bài mới"}</h1>
          <p className="mt-2 text-sm text-slate-400">Có thể chỉ nhập một ngôn ngữ; website sẽ tự dùng ngôn ngữ còn lại làm nội dung dự phòng.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPreviewOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100">
            <Eye size={18} /> {previewOpen ? "Ẩn xem trước" : "Xem trước"}
          </button>
          <button type="button" disabled={saving} onClick={() => savePost("draft")} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/25 bg-white/[0.04] px-5 py-3 font-semibold text-cyan-100 transition hover:bg-white/[0.08] disabled:opacity-50">
            <Save size={18} /> Lưu nháp
          </button>
          <button type="button" disabled={saving} onClick={() => savePost("published")} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Xuất bản
          </button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}

      <div className={`mt-7 grid gap-6 ${previewOpen ? "2xl:grid-cols-[minmax(0,1fr)_500px]" : ""}`}>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-xl font-semibold">Nội dung bài viết</h2>
                <p className="mt-1 text-sm text-slate-500">Chọn ngôn ngữ và nhập nội dung tương ứng.</p>
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-[#081321]/70 p-1">
                {[['vi', 'Tiếng Việt'], ['en', 'English']].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setActiveLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeLanguage === value ? "bg-cyan-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Tiêu đề {activeLanguage === "vi" ? "tiếng Việt" : "tiếng Anh"}</span>
                <input value={form[`title_${activeLanguage}`]} onChange={(event) => handleTitleChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Nhập tiêu đề bài viết..." : "Enter article title..."} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Mô tả ngắn</span>
                <textarea value={form[`excerpt_${activeLanguage}`]} onChange={(event) => updateField(`excerpt_${activeLanguage}`, event.target.value)} rows={3} maxLength={320} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Đoạn giới thiệu ngắn hiển thị trên thẻ bài viết..." : "Short introduction shown on the article card..."} />
                <span className="mt-1 block text-right text-xs text-slate-600">{form[`excerpt_${activeLanguage}`].length}/320</span>
              </label>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-200">Nội dung chính</span>
                <RichTextEditor key={activeLanguage} value={form[`content_${activeLanguage}`]} onChange={(value) => updateField(`content_${activeLanguage}`, value)} placeholder={activeLanguage === "vi" ? "Bắt đầu viết nội dung tại đây..." : "Start writing here..."} />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <h2 className="text-xl font-semibold">Thiết lập bài viết</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Đường dẫn bài viết (slug)</span>
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
                  <span className="border-r border-white/10 px-4 py-3.5 text-sm text-slate-500">facs.vn/insights/</span>
                  <input value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-white outline-none" placeholder="duong-dan-bai-viet" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Chuyên mục</span>
                <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none focus:border-cyan-300/35">
                  {insightCategories.map((category) => <option key={category.value} value={category.value}>{category.vi} / {category.en}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Tác giả</span>
                <input value={form.author_name} onChange={(event) => updateField("author_name", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none focus:border-cyan-300/35" />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081321]/60 px-4 py-4 md:col-span-2">
                <input type="checkbox" checked={form.featured} onChange={(event) => updateField("featured", event.target.checked)} className="h-4 w-4 accent-cyan-300" />
                <span><strong className="block text-sm">Đánh dấu bài nổi bật</strong><span className="mt-1 block text-xs text-slate-500">Dùng để ưu tiên bài viết trong các nâng cấp giao diện sau này.</span></span>
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <h2 className="text-xl font-semibold">Ảnh bìa</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#081321]/70">
                {form.cover_image_url ? <img src={form.cover_image_url} alt="Cover preview" className="h-full min-h-44 w-full object-cover" /> : <div className="px-6 text-center text-sm text-slate-600">Chưa có ảnh bìa</div>}
              </div>
              <div className="space-y-4">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-cyan-200/25 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                  {uploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadCover} disabled={uploading} className="hidden" />
                </label>
                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Hoặc dán URL ảnh</span>
                  <input value={form.cover_image_url || ""} onChange={(event) => updateField("cover_image_url", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder="https://..." />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input value={form.cover_image_alt_vi || ""} onChange={(event) => updateField("cover_image_alt_vi", event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder="Mô tả ảnh (VI)" />
                  <input value={form.cover_image_alt_en || ""} onChange={(event) => updateField("cover_image_alt_en", event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder="Image alt text (EN)" />
                </div>
                <p className="text-xs leading-relaxed text-slate-600">Định dạng hỗ trợ: JPG, PNG, WEBP, GIF. Kích thước tối đa: 5 MB.</p>
              </div>
            </div>
          </section>

          <details className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <summary className="cursor-pointer text-xl font-semibold">SEO nâng cao (không bắt buộc)</summary>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {['vi', 'en'].map((language) => (
                <div key={language} className="space-y-4 rounded-2xl border border-white/10 p-4">
                  <div className="font-semibold text-cyan-200">{language === 'vi' ? 'Tiếng Việt' : 'English'}</div>
                  <input value={form[`seo_title_${language}`] || ""} onChange={(event) => updateField(`seo_title_${language}`, event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none" placeholder="SEO title" />
                  <textarea value={form[`seo_description_${language}`] || ""} onChange={(event) => updateField(`seo_description_${language}`, event.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none" placeholder="Meta description" />
                </div>
              ))}
            </div>
          </details>
        </div>

        {previewOpen && (
          <aside className="h-fit overflow-hidden rounded-[28px] border border-cyan-200/15 bg-[#0b1625] 2xl:sticky 2xl:top-28">
            {form.cover_image_url && <img src={form.cover_image_url} alt="" className="h-56 w-full object-cover" />}
            <div className="p-7">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Bản xem trước · {activeLanguage.toUpperCase()}</div>
              <h2 className="mt-4 text-3xl font-bold leading-tight">{activeTitle}</h2>
              {activeExcerpt && <p className="mt-4 leading-relaxed text-slate-400">{activeExcerpt}</p>}
              <div className="mt-7 border-t border-white/10 pt-7">
                {safePreview ? <div className="facs-article" dangerouslySetInnerHTML={{ __html: safePreview }} /> : <p className="text-sm text-slate-600">Nội dung xem trước sẽ hiển thị tại đây.</p>}
              </div>
            </div>
          </aside>
        )}
      </div>
    </AdminLayout>
  );
}
