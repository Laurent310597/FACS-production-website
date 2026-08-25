import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Eye,
  ImagePlus,
  Link2,
  Loader2,
  Save,
  Send,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import RichTextEditor from "../../components/admin/RichTextEditor";
import { insightCategories, slugify } from "../../lib/insights";
import {
  formatVietnamDateTime,
  getMinimumVietnamDateTimeInput,
  getPublicationState,
  isoToVietnamDateTimeInput,
  vietnamDateTimeInputToIso,
} from "../../lib/publication";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  slug: "",
  slug_vi: "",
  slug_en: "",
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
  author_name_vi: "FACS",
  author_name_en: "FACS",
  featured: false,
  seo_title_en: "",
  seo_title_vi: "",
  seo_description_en: "",
  seo_description_vi: "",
  status: "draft",
  published_at: null,
  email_delivery_mode: "disabled",
};

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function cleanFileName(name = "image") {
  const extension = name.includes(".") ? `.${name.split(".").pop().toLowerCase()}` : "";
  const base = name.replace(/\.[^/.]+$/, "");
  return `${slugify(base) || "image"}${extension}`;
}

function normalizeLoadedPost(data) {
  const legacySlug = data.slug || "";
  const legacyAuthor = data.author_name || "FACS";
  return {
    ...emptyForm,
    ...data,
    slug_vi: data.slug_vi || legacySlug,
    slug_en: data.slug_en || legacySlug,
    author_name_vi: data.author_name_vi || legacyAuthor,
    author_name_en: data.author_name_en || legacyAuthor,
  };
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
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    if (!isEditing) return;

    const fetchPost = async () => {
      const { data, error: fetchError } = await supabase.from("posts").select("*").eq("id", id).single();
      if (fetchError) {
        setError(`Không thể tải bài viết: ${fetchError.message}`);
      } else {
        setForm(normalizeLoadedPost(data));
        setScheduleAt(isoToVietnamDateTimeInput(data.published_at));
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
  const activeAuthor = form[`author_name_${activeLanguage}`] || form.author_name || "FACS";
  const activeSlug = form[`slug_${activeLanguage}`] || form.slug || "";
  const activeLanguageLabel = activeLanguage === "vi" ? "Tiếng Việt" : "English";

  const safePreview = useMemo(() => DOMPurify.sanitize(activeContent), [activeContent]);

  const handleTitleChange = (value) => {
    const titleField = `title_${activeLanguage}`;
    const slugField = `slug_${activeLanguage}`;
    setForm((current) => {
      const currentSlug = current[slugField] || "";
      const previousAutoSlug = slugify(current[titleField] || "");
      const shouldGenerateSlug = !currentSlug || currentSlug === previousAutoSlug || currentSlug === current.slug;
      return {
        ...current,
        [titleField]: value,
        [slugField]: shouldGenerateSlug ? slugify(value) : currentSlug,
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

  const savePost = async (action) => {
    setError("");

    const hasTitle = Boolean((form.title_vi || "").trim() || (form.title_en || "").trim());
    const hasContent = Boolean(stripHtml(form.content_vi || "") || stripHtml(form.content_en || ""));
    const proposedSlugVi = slugify(form.slug_vi || form.title_vi || "");
    const proposedSlugEn = slugify(form.slug_en || form.title_en || "");
    const finalSlugVi = proposedSlugVi || proposedSlugEn;
    const finalSlugEn = proposedSlugEn || proposedSlugVi;
    const finalLegacySlug = isEditing && form.slug ? slugify(form.slug) : finalSlugVi || finalSlugEn;

    if (!hasTitle) {
      setError("Vui lòng nhập tiêu đề tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!hasContent) {
      setError("Vui lòng nhập nội dung tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!finalSlugVi || !finalSlugEn || !finalLegacySlug) {
      setError("Không thể tạo đường dẫn bài viết. Vui lòng nhập tiêu đề hoặc slug cho ít nhất một ngôn ngữ.");
      return;
    }

    let nextStatus = "draft";
    let publishedAt = null;

    if (action === "publish") {
      nextStatus = "published";
      publishedAt = new Date().toISOString();
    }

    if (action === "schedule") {
      publishedAt = vietnamDateTimeInputToIso(scheduleAt);
      if (!publishedAt) {
        setError("Vui lòng chọn ngày và giờ đăng bài.");
        return;
      }
      if (new Date(publishedAt).getTime() <= Date.now() + 30000) {
        setError("Thời gian hẹn đăng phải muộn hơn thời điểm hiện tại ít nhất 1 phút.");
        return;
      }
      nextStatus = "published";
    }

    const authorVi = (form.author_name_vi || "").trim() || (form.author_name_en || "").trim() || (form.author_name || "").trim() || "FACS";
    const authorEn = (form.author_name_en || "").trim() || authorVi;
    const legacyAuthor = (form.author_name || "").trim() || authorVi || authorEn;

    setSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const payload = {
      slug: finalLegacySlug,
      slug_vi: finalSlugVi,
      slug_en: finalSlugEn,
      category: form.category,
      title_en: form.title_en,
      title_vi: form.title_vi,
      excerpt_en: form.excerpt_en,
      excerpt_vi: form.excerpt_vi,
      content_en: form.content_en,
      content_vi: form.content_vi,
      cover_image_url: form.cover_image_url,
      cover_image_alt_en: form.cover_image_alt_en,
      cover_image_alt_vi: form.cover_image_alt_vi,
      author_name: legacyAuthor,
      author_name_vi: authorVi,
      author_name_en: authorEn,
      featured: form.featured,
      seo_title_en: form.seo_title_en,
      seo_title_vi: form.seo_title_vi,
      seo_description_en: form.seo_description_en,
      seo_description_vi: form.seo_description_vi,
      status: nextStatus,
      published_at: publishedAt,
      email_delivery_mode: form.email_delivery_mode || "disabled",
      created_by: authData.session?.user?.id || null,
    };

    const request = isEditing
      ? supabase.from("posts").update(payload).eq("id", id)
      : supabase.from("posts").insert(payload);
    const { data: savedPost, error: saveError } = await request.select("id,email_delivery_mode").single();

    setSaving(false);

    if (saveError) {
      const duplicateSlug = saveError.code === "23505" || /slug|đường dẫn/i.test(saveError.message || "");
      const message = duplicateSlug ? "Một trong các đường dẫn Việt/Anh đã được sử dụng. Vui lòng đổi slug." : saveError.message;
      setError(`Không thể lưu bài viết: ${message}`);
      return;
    }

    if (
      (action === "publish" || action === "schedule")
      && savedPost?.email_delivery_mode === "review_after_publish"
    ) {
      navigate(`/admin/email?post_id=${savedPost.id}`, { replace: true });
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

  const publicationState = getPublicationState(form);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link to="/admin/posts" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={16} /> Trở lại danh sách</Link>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{isEditing ? "Chỉnh sửa bài viết" : "Viết bài mới"}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Nội dung, tác giả và đường dẫn được quản lý riêng theo từng ngôn ngữ. Các thiết lập xuất bản được gom ở cột bên phải.</p>
        </div>
        <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100">
          <Eye size={18} /> Xem trước {activeLanguageLabel}
        </button>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-xl font-semibold">Nội dung bài viết</h2>
                <p className="mt-1 text-sm text-slate-500">Chọn ngôn ngữ rồi nhập nội dung tương ứng.</p>
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-[#081321]/70 p-1">
                {[["vi", "Tiếng Việt"], ["en", "English"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setActiveLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeLanguage === value ? "bg-cyan-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">{activeLanguage === "vi" ? "Tiêu đề tiếng Việt" : "English title"}</span>
                <input value={form[`title_${activeLanguage}`] || ""} onChange={(event) => handleTitleChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Nhập tiêu đề bài viết..." : "Enter article title..."} />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">{activeLanguage === "vi" ? "Mô tả ngắn" : "Short description"}</span>
                <textarea value={form[`excerpt_${activeLanguage}`] || ""} onChange={(event) => updateField(`excerpt_${activeLanguage}`, event.target.value)} rows={3} maxLength={320} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Đoạn giới thiệu ngắn hiển thị trên thẻ bài viết..." : "Short introduction shown on the article card..."} />
                <span className="mt-1 block text-right text-xs text-slate-600">{(form[`excerpt_${activeLanguage}`] || "").length}/320</span>
              </label>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-200">{activeLanguage === "vi" ? "Nội dung chính" : "Main content"}</span>
                <RichTextEditor key={activeLanguage} value={form[`content_${activeLanguage}`] || ""} onChange={(value) => updateField(`content_${activeLanguage}`, value)} placeholder={activeLanguage === "vi" ? "Bắt đầu viết nội dung tại đây..." : "Start writing here..."} />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex items-center gap-3">
              <ImagePlus size={20} className="text-cyan-300" />
              <div>
                <h2 className="text-xl font-semibold">Ảnh bìa</h2>
                <p className="mt-1 text-sm text-slate-500">Ảnh dùng chung cho cả hai ngôn ngữ; mô tả ảnh thay đổi theo tab đang chọn.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
              <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#081321]/70 p-2">
                {form.cover_image_url ? <img src={form.cover_image_url} alt="Cover preview" className="max-h-72 h-auto w-full rounded-xl object-contain" /> : <div className="px-6 text-center text-sm text-slate-600">Chưa có ảnh bìa</div>}
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-cyan-200/25 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                    {uploading ? "Đang tải ảnh..." : "Chọn ảnh từ máy"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadCover} disabled={uploading} className="hidden" />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">URL ảnh</span>
                  <input value={form.cover_image_url || ""} onChange={(event) => updateField("cover_image_url", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder="https://..." />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">{activeLanguage === "vi" ? "Mô tả ảnh tiếng Việt" : "English image alt text"}</span>
                  <input value={form[`cover_image_alt_${activeLanguage}`] || ""} onChange={(event) => updateField(`cover_image_alt_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Mô tả ngắn nội dung ảnh" : "Short description of the image"} />
                </label>
                <p className="text-xs leading-relaxed text-slate-600">JPG, PNG, WEBP hoặc GIF; tối đa 5 MB.</p>
              </div>
            </div>
          </section>

          <details className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <summary className="cursor-pointer text-xl font-semibold">SEO nâng cao · {activeLanguageLabel}</summary>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">SEO title</span>
                <input value={form[`seo_title_${activeLanguage}`] || ""} onChange={(event) => updateField(`seo_title_${activeLanguage}`, event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" placeholder={activeTitle} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Meta description</span>
                <textarea value={form[`seo_description_${activeLanguage}`] || ""} onChange={(event) => updateField(`seo_description_${activeLanguage}`, event.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" placeholder={activeExcerpt || "Mô tả hiển thị trên công cụ tìm kiếm"} />
              </label>
            </div>
          </details>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24">
          <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Settings2 size={19} className="text-cyan-300" />
                <h2 className="font-semibold">Thiết lập bài viết</h2>
              </div>
              <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">{activeLanguage === "vi" ? "VI" : "EN"}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Tác giả và đường dẫn dưới đây áp dụng cho tab {activeLanguageLabel}.</p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Chuyên mục</span>
                <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-cyan-300/35">
                  {insightCategories.map((category) => <option key={category.value} value={category.value}>{category.vi} / {category.en}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">{activeLanguage === "vi" ? "Tác giả tiếng Việt" : "Author (English)"}</span>
                <input value={form[`author_name_${activeLanguage}`] || ""} onChange={(event) => updateField(`author_name_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Ví dụ: Anh Nguyễn Hoàng Tú" : "Example: Mr. Tu Hoang Nguyen"} />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200"><Link2 size={15} /> {activeLanguage === "vi" ? "Slug tiếng Việt" : "English slug"}</span>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
                  <div className="border-b border-white/10 px-3 py-2 text-[11px] text-slate-600">facs.vn/insights/</div>
                  <input value={form[`slug_${activeLanguage}`] || ""} onChange={(event) => updateField(`slug_${activeLanguage}`, slugify(event.target.value))} className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none" placeholder={activeLanguage === "vi" ? "duong-dan-tieng-viet" : "english-article-url"} />
                </div>
              </label>

              {isEditing && form.slug && (
                <div className="rounded-2xl border border-white/8 bg-[#081321]/45 px-3 py-3 text-xs leading-relaxed text-slate-500">
                  Link cũ được giữ làm đường dẫn dự phòng: <span className="break-all text-slate-400">/insights/{form.slug}</span>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-2">
              <Clock3 size={19} className="text-violet-300" />
              <h2 className="font-semibold">Xuất bản</h2>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#081321]/60 px-4 py-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Trạng thái</div>
              {publicationState === "scheduled" ? (
                <div className="mt-1 font-medium text-violet-200">Đã lên lịch · {formatVietnamDateTime(form.published_at)}</div>
              ) : publicationState === "published" ? (
                <div className="mt-1 font-medium text-emerald-200">Đã xuất bản · {formatVietnamDateTime(form.published_at)}</div>
              ) : (
                <div className="mt-1 font-medium text-amber-200">Bản nháp · chưa công khai</div>
              )}
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#081321]/55 px-4 py-3.5">
              <input type="checkbox" checked={form.featured} onChange={(event) => updateField("featured", event.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-300" />
              <span><strong className="flex items-center gap-1.5 text-sm"><Star size={14} /> Bài viết nổi bật</strong><span className="mt-1 block text-xs leading-relaxed text-slate-500">Ưu tiên bài trong các khu vực nổi bật của Insights.</span></span>
            </label>

            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-200">Phương thức gửi Email Insights</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">Đăng bài không tự gửi email. Audience luôn cần xem trước, gửi thử và xác nhận riêng.</p>
              <div className="mt-3 space-y-2">
                {[
                  ["disabled", "Không gửi email", "Chỉ xuất bản bài viết; không tạo quy trình email."],
                  ["review_after_publish", "Gửi sau khi kiểm duyệt", "Khuyến nghị: sau khi đăng, mở ngay quy trình Xem trước → Gửi thử → Xác nhận."],
                  ["manual_later", "Gửi thủ công sau", "Xuất bản trước; xử lý email sau tại trang Email & Audience."],
                ].map(([value, label, description]) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${form.email_delivery_mode === value ? "border-cyan-200/30 bg-cyan-300/8" : "border-white/10 bg-[#081321]/45 hover:border-white/20"}`}>
                    <input
                      type="radio"
                      name="email-delivery-mode"
                      value={value}
                      checked={form.email_delivery_mode === value}
                      disabled={form.email_notification_status === "sent"}
                      onChange={(event) => updateField("email_delivery_mode", event.target.value)}
                      className="mt-1 h-4 w-4 accent-cyan-300"
                    />
                    <span>
                      <strong className="block text-sm text-white">{label}</strong>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
                    </span>
                  </label>
                ))}
              </div>
              {form.email_notification_status === "sent" && (
                <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/8 px-3 py-2 text-xs text-emerald-100">Email đã gửi được khóa để tránh gửi lặp lại khi chỉnh sửa bài viết.</div>
              )}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-violet-100">Ngày và giờ hẹn đăng</span>
              <input
                type="datetime-local"
                value={scheduleAt}
                min={getMinimumVietnamDateTimeInput(2)}
                onChange={(event) => setScheduleAt(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#081321]/80 px-4 py-3 text-white outline-none focus:border-violet-300/40"
              />
              <span className="mt-2 block text-xs leading-relaxed text-slate-500">Múi giờ Việt Nam (UTC+7).</span>
            </label>

            <div className="mt-5 grid gap-3">
              <button type="button" disabled={saving} onClick={() => savePost("draft")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-white/[0.035] px-4 py-3 font-semibold text-cyan-100 transition hover:bg-white/[0.08] disabled:opacity-50">
                <Save size={17} /> Lưu nháp
              </button>
              <button type="button" disabled={saving} onClick={() => savePost("schedule")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/25 bg-violet-300/10 px-4 py-3 font-semibold text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50">
                {saving ? <Loader2 size={17} className="animate-spin" /> : <CalendarClock size={17} />} Hẹn giờ đăng
              </button>
              <button type="button" disabled={saving} onClick={() => savePost("publish")} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Đăng ngay
              </button>
            </div>
          </section>
        </aside>
      </div>

      {previewOpen && (
        <div role="presentation" onClick={() => setPreviewOpen(false)} className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020811]/85 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-label="Xem trước bài viết" onClick={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[30px] border border-cyan-200/15 bg-[#0b1625] shadow-[0_40px_140px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-7">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Bản xem trước · {activeLanguageLabel}</div>
                <div className="mt-1 text-xs text-slate-500">/insights/{activeSlug || "duong-dan-bai-viet"}</div>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-white" aria-label="Đóng xem trước"><X size={19} /></button>
            </div>
            <div className="max-h-[calc(92vh-74px)] overflow-y-auto">
              {form.cover_image_url && <img src={form.cover_image_url} alt="" className="max-h-[560px] h-auto w-full bg-white/[0.025] p-3 object-contain" />}
              <div className="mx-auto max-w-3xl p-7 md:p-10">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{insightCategories.find((item) => item.value === form.category)?.[activeLanguage] || "FACS Insight"}</div>
                <h2 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">{activeTitle}</h2>
                {activeExcerpt && <p className="mt-5 text-lg leading-relaxed text-slate-400">{activeExcerpt}</p>}
                <div className="mt-5 text-sm text-slate-500">{activeAuthor} · /insights/{activeSlug || "duong-dan-bai-viet"}</div>
                <div className="mt-8 border-t border-white/10 pt-8">
                  {safePreview ? <div className="facs-article" dangerouslySetInnerHTML={{ __html: safePreview }} /> : <p className="text-sm text-slate-600">Nội dung xem trước sẽ hiển thị tại đây.</p>}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
