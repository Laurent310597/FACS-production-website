import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Ban, Bell, CalendarClock, Eye, ImagePlus, Loader2, MailCheck, Save, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import RichTextEditor from "../../components/admin/RichTextEditor";
import { insightCategories, slugify } from "../../lib/insights";
import { deriveEmailStatus, emailStatusLabels, emailStatusStyles, invokeInsightEmail } from "../../lib/emailNotifications";
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
  email_notification_enabled: false,
  email_notification_status: "disabled",
  email_notification_requested_at: null,
  email_notification_cancelled_at: null,
  email_notification_sent_at: null,
  email_notification_processing_at: null,
  email_notification_next_attempt_at: null,
  email_notification_attempts: 0,
  email_notification_last_error: null,
  email_notification_message_id: null,
  email_notification_thread_id: null,
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
  const [scheduleAt, setScheduleAt] = useState("");
  const [emailActionLoading, setEmailActionLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (!isEditing) return;

    const fetchPost = async () => {
      const { data, error: fetchError } = await supabase.from("posts").select("*").eq("id", id).single();
      if (fetchError) {
        setError(`Không thể tải bài viết: ${fetchError.message}`);
      } else {
        setForm({
          ...emptyForm,
          ...data,
          slug_vi: data.slug_vi || data.slug || "",
          slug_en: data.slug_en || data.slug || "",
          author_name_vi: data.author_name_vi || data.author_name || "FACS",
          author_name_en: data.author_name_en || data.author_name || "FACS",
        });
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

  const safePreview = useMemo(() => DOMPurify.sanitize(activeContent), [activeContent]);

  const handleTitleChange = (value) => {
    const titleField = `title_${activeLanguage}`;
    const slugField = `slug_${activeLanguage}`;
    setForm((current) => {
      const currentLocalizedSlug = current[slugField] || "";
      const shouldGenerateSlug = !currentLocalizedSlug || currentLocalizedSlug === slugify(current[titleField] || "");
      return {
        ...current,
        [titleField]: value,
        [slugField]: shouldGenerateSlug ? slugify(value) : currentLocalizedSlug,
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

  const toggleEmailNotification = (enabled) => {
    setEmailMessage("");
    setForm((current) => ({
      ...current,
      email_notification_enabled: enabled,
      email_notification_status: current.email_notification_status === "sent"
        ? "sent"
        : enabled ? "pending" : "disabled",
      email_notification_cancelled_at: enabled ? null : current.email_notification_cancelled_at,
      email_notification_attempts: enabled ? 0 : current.email_notification_attempts,
      email_notification_next_attempt_at: null,
      email_notification_last_error: enabled ? null : current.email_notification_last_error,
    }));
  };

  const cancelEmailNotification = async () => {
    setEmailMessage("");
    setError("");
    const cancelledAt = new Date().toISOString();
    if (!isEditing) {
      setForm((current) => ({
        ...current,
        email_notification_enabled: false,
        email_notification_status: "cancelled",
        email_notification_cancelled_at: cancelledAt,
      }));
      setEmailMessage("Đã hủy gửi email cho bài viết này. Lịch đăng bài không bị thay đổi.");
      return;
    }

    setEmailActionLoading(true);
    const { error: cancelError } = await supabase.from("posts").update({
      email_notification_enabled: false,
      email_notification_status: "cancelled",
      email_notification_cancelled_at: cancelledAt,
      email_notification_next_attempt_at: null,
      email_notification_processing_at: null,
    }).eq("id", id);
    setEmailActionLoading(false);
    if (cancelError) {
      setError(`Không thể hủy gửi email: ${cancelError.message}`);
      return;
    }
    setForm((current) => ({
      ...current,
      email_notification_enabled: false,
      email_notification_status: "cancelled",
      email_notification_cancelled_at: cancelledAt,
    }));
    setEmailMessage("Đã hủy gửi email. Bài viết vẫn giữ nguyên trạng thái và lịch đăng.");
  };

  const sendTestEmail = async () => {
    setEmailMessage("");
    setError("");
    if (!isEditing) {
      setError("Vui lòng lưu bài viết trước khi gửi email thử.");
      return;
    }
    setEmailActionLoading(true);
    try {
      const result = await invokeInsightEmail("test", { post_id: id });
      setEmailMessage(`Đã gửi email thử đến ${result.to || "tunguyen@facs.vn"}.`);
    } catch (testError) {
      setError(`Không thể gửi email thử: ${testError.message}`);
    } finally {
      setEmailActionLoading(false);
    }
  };

  const savePost = async (action) => {
    setError("");

    const hasTitle = Boolean(form.title_vi.trim() || form.title_en.trim());
    const hasContent = Boolean(stripHtml(form.content_vi) || stripHtml(form.content_en));
    const finalSlugVi = slugify(form.slug_vi || form.title_vi || form.title_en || form.slug);
    const finalSlugEn = slugify(form.slug_en || form.title_en || form.title_vi || form.slug);
    const legacySlug = slugify(form.slug || finalSlugVi || finalSlugEn);

    if (!hasTitle) {
      setError("Vui lòng nhập tiêu đề tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!hasContent) {
      setError("Vui lòng nhập nội dung tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!finalSlugVi || !finalSlugEn || !legacySlug) {
      setError("Không thể tạo đầy đủ đường dẫn tiếng Việt và tiếng Anh. Vui lòng kiểm tra lại tiêu đề hoặc slug.");
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

    setSaving(true);
    setEmailMessage("");
    const { data: authData } = await supabase.auth.getSession();
    const emailStatus = deriveEmailStatus({
      enabled: form.email_notification_enabled,
      currentStatus: form.email_notification_status,
      action,
    });
    const payload = {
      ...form,
      author_name: form.author_name_vi || form.author_name_en || form.author_name || "FACS",
      author_name_vi: form.author_name_vi || form.author_name_en || form.author_name || "FACS",
      author_name_en: form.author_name_en || form.author_name_vi || form.author_name || "FACS",
      slug: legacySlug,
      slug_vi: finalSlugVi,
      slug_en: finalSlugEn,
      status: nextStatus,
      published_at: publishedAt,
      created_by: authData.session?.user?.id || null,
      email_notification_status: emailStatus,
      email_notification_requested_at:
        form.email_notification_enabled && emailStatus !== "sent"
          ? (form.email_notification_requested_at || new Date().toISOString())
          : form.email_notification_requested_at,
      email_notification_cancelled_at: form.email_notification_enabled ? null : form.email_notification_cancelled_at,
      email_notification_next_attempt_at: null,
      email_notification_attempts: emailStatus === "pending" ? 0 : form.email_notification_attempts,
      email_notification_last_error: emailStatus === "pending" ? null : form.email_notification_last_error,
    };

    const request = isEditing
      ? supabase.from("posts").update(payload).eq("id", id).select("id").single()
      : supabase.from("posts").insert(payload).select("id").single();
    const { data: savedPost, error: saveError } = await request;

    setSaving(false);

    if (saveError) {
      const message = saveError.code === "23505" || saveError.code === "P0001"
        ? "Một trong các đường dẫn bài viết đã tồn tại. Vui lòng đổi slug tiếng Việt hoặc tiếng Anh."
        : saveError.message;
      setError(`Không thể lưu bài viết: ${message}`);
      return;
    }

    if (action === "publish" && form.email_notification_enabled && emailStatus !== "sent") {
      try {
        await invokeInsightEmail("process", { post_id: savedPost.id });
      } catch (processError) {
        console.warn("Email will be retried by cron:", processError);
      }
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
          <button type="button" disabled={saving} onClick={() => savePost("schedule")} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/25 bg-violet-300/10 px-5 py-3 font-semibold text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />} Hẹn giờ đăng
          </button>
          <button type="button" disabled={saving} onClick={() => savePost("publish")} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Đăng ngay
          </button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {emailMessage && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/8 px-5 py-4 text-sm text-emerald-200">{emailMessage}</div>}

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
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Đường dẫn bài viết (tiếng Việt)</span>
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
                  <span className="border-r border-white/10 px-4 py-3.5 text-sm text-slate-500">facs.vn/insights/</span>
                  <input value={form.slug_vi} onChange={(event) => updateField("slug_vi", slugify(event.target.value))} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-white outline-none" placeholder="duong-dan-tieng-viet" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Article URL slug (English)</span>
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
                  <span className="border-r border-white/10 px-4 py-3.5 text-sm text-slate-500">facs.vn/insights/</span>
                  <input value={form.slug_en} onChange={(event) => updateField("slug_en", slugify(event.target.value))} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-white outline-none" placeholder="english-article-url" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Chuyên mục</span>
                <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none focus:border-cyan-300/35">
                  {insightCategories.map((category) => <option key={category.value} value={category.value}>{category.vi} / {category.en}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Tác giả (tiếng Việt)</span>
                <input
                  value={form.author_name_vi}
                  onChange={(event) => updateField("author_name_vi", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none focus:border-cyan-300/35"
                  placeholder="Ví dụ: Ông Nguyễn Hoàng Tú"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Author (English)</span>
                <input
                  value={form.author_name_en}
                  onChange={(event) => updateField("author_name_en", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none focus:border-cyan-300/35"
                  placeholder="Example: Mr. Tu Hoang Nguyen"
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#081321]/60 px-4 py-4 md:col-span-2">
                <input type="checkbox" checked={form.featured} onChange={(event) => updateField("featured", event.target.checked)} className="h-4 w-4 accent-cyan-300" />
                <span><strong className="block text-sm">Đánh dấu bài nổi bật</strong><span className="mt-1 block text-xs text-slate-500">Dùng để ưu tiên bài viết trong các nâng cấp giao diện sau này.</span></span>
              </label>

              <div className="rounded-2xl border border-violet-200/15 bg-violet-300/[0.055] p-4 md:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <label className="block flex-1">
                    <span className="mb-2 block text-sm font-semibold text-violet-100">Ngày và giờ hẹn đăng</span>
                    <input
                      type="datetime-local"
                      value={scheduleAt}
                      min={getMinimumVietnamDateTimeInput(2)}
                      onChange={(event) => setScheduleAt(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-[#081321]/80 px-4 py-3.5 text-white outline-none focus:border-violet-300/40"
                    />
                    <span className="mt-2 block text-xs leading-relaxed text-slate-500">Thời gian được hiểu theo múi giờ Việt Nam (UTC+7). Sau khi chọn, bấm “Hẹn giờ đăng”.</span>
                  </label>
                  <div className="min-w-[250px] rounded-2xl border border-white/10 bg-[#081321]/55 px-4 py-3.5 text-sm">
                    <div className="font-semibold text-slate-200">Trạng thái hiện tại</div>
                    {getPublicationState(form) === "scheduled" ? (
                      <div className="mt-1 text-violet-200">Đã lên lịch: {formatVietnamDateTime(form.published_at)}</div>
                    ) : getPublicationState(form) === "published" ? (
                      <div className="mt-1 text-emerald-200">Đã xuất bản: {formatVietnamDateTime(form.published_at)}</div>
                    ) : (
                      <div className="mt-1 text-amber-200">Bản nháp, chưa hiển thị công khai</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-sky-200/15 bg-sky-300/[0.055] p-4 md:col-span-2">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Bell size={20} className="text-sky-300" />
                      <h3 className="font-semibold text-sky-100">Email thông báo khách hàng</h3>
                    </div>
                    <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-[#081321]/55 px-4 py-4">
                      <input
                        type="checkbox"
                        checked={Boolean(form.email_notification_enabled)}
                        disabled={form.email_notification_status === "sent"}
                        onChange={(event) => toggleEmailNotification(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-cyan-300"
                      />
                      <span>
                        <strong className="block text-sm text-white">Gửi email khi bài viết được xuất bản</strong>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">Mặc định tắt. Với bài hẹn giờ, email chỉ được gửi khi bài thực sự xuất hiện trên website.</span>
                      </span>
                    </label>

                    <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
                      <div><strong className="text-slate-200">From:</strong> info@facs.vn</div>
                      <div><strong className="text-slate-200">To:</strong> tunguyen@facs.vn</div>
                      <div><strong className="text-slate-200">Cc:</strong> yendoan@facs.vn; thanhhuynh@facs.vn</div>
                      <div><strong className="text-slate-200">Bcc:</strong> toàn bộ audience đang subscribed</div>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-[#081321]/55 p-3 text-xs leading-relaxed text-slate-400">
                      <div><strong className="text-slate-200">Subject dự kiến:</strong> [FACS Insight] - {form.title_vi || "Tên bài viết tiếng Việt"} | {form.title_en || "English article title"}</div>
                      <div className="mt-2">Chữ ký chuẩn của Phòng Thông tin &amp; Truyền thông sẽ tự động được nối vào cuối email.</div>
                    </div>
                  </div>

                  <div className="min-w-[280px] rounded-2xl border border-white/10 bg-[#081321]/55 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Trạng thái email</div>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${emailStatusStyles[form.email_notification_status] || emailStatusStyles.disabled}`}>
                      {emailStatusLabels[form.email_notification_status] || "Không gửi email"}
                    </div>
                    {form.email_notification_sent_at && <div className="mt-3 text-xs text-emerald-200">Đã gửi: {formatVietnamDateTime(form.email_notification_sent_at)}</div>}
                    {form.email_notification_last_error && <div className="mt-3 text-xs leading-relaxed text-red-200">Lỗi gần nhất: {form.email_notification_last_error}</div>}
                    <div className="mt-4 flex flex-col gap-2">
                      <button type="button" onClick={sendTestEmail} disabled={emailActionLoading || !isEditing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/25 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-40">
                        {emailActionLoading ? <Loader2 size={16} className="animate-spin" /> : <MailCheck size={16} />} Gửi thử cho tôi
                      </button>
                      {form.email_notification_status !== "sent" && (form.email_notification_enabled || form.email_notification_status === "pending" || form.email_notification_status === "failed") && (
                        <button type="button" onClick={cancelEmailNotification} disabled={emailActionLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200/25 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-300/10 disabled:opacity-40">
                          <Ban size={16} /> Hủy gửi email
                        </button>
                      )}
                    </div>
                    {!isEditing && <div className="mt-3 text-xs text-slate-600">Lưu bài viết trước khi dùng chức năng gửi thử.</div>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <h2 className="text-xl font-semibold">Ảnh bìa</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-[#081321]/70 p-2">
                {form.cover_image_url ? <img src={form.cover_image_url} alt="Cover preview" className="max-h-80 h-auto w-full rounded-xl object-contain" /> : <div className="px-6 text-center text-sm text-slate-600">Chưa có ảnh bìa</div>}
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
            {form.cover_image_url && <img src={form.cover_image_url} alt="" className="max-h-[520px] h-auto w-full bg-white/[0.025] p-3 object-contain" />}
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
