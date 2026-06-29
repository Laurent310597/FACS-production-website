import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, CalendarClock, Eye, Loader2, Save, Send } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import RichTextEditor from "../../components/admin/RichTextEditor";
import {
  employmentTypes,
  getEmploymentTypeLabel,
  getWorkplaceTypeLabel,
  slugify,
  workplaceTypes,
} from "../../lib/careers";
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
  title_vi: "",
  title_en: "",
  summary_vi: "",
  summary_en: "",
  content_vi: "",
  content_en: "",
  department_vi: "",
  department_en: "",
  location_vi: "",
  location_en: "",
  employment_type: "full-time",
  workplace_type: "onsite",
  application_deadline: "",
  status: "draft",
  published_at: null,
  created_by: null,
};

function stripHtml(value = "") {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export default function AdminJobEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [activeLanguage, setActiveLanguage] = useState("vi");
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    if (!isEditing) return;

    const fetchJob = async () => {
      const { data, error: fetchError } = await supabase.from("job_posts").select("*").eq("id", id).single();
      if (fetchError) {
        setError(`Không thể tải vị trí tuyển dụng: ${fetchError.message}`);
      } else {
        setForm({ ...emptyForm, ...data, application_deadline: data.application_deadline || "" });
        setScheduleAt(isoToVietnamDateTimeInput(data.published_at));
        if (!data.title_vi && data.title_en) setActiveLanguage("en");
      }
      setLoading(false);
    };

    fetchJob();
  }, [id, isEditing]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const activeTitle = form[`title_${activeLanguage}`] || form.title_vi || form.title_en || "Vị trí chưa có tiêu đề";
  const activeSummary = form[`summary_${activeLanguage}`] || form.summary_vi || form.summary_en || "";
  const activeContent = form[`content_${activeLanguage}`] || form.content_vi || form.content_en || "";
  const activeDepartment = form[`department_${activeLanguage}`] || form.department_vi || form.department_en || "";
  const activeLocation = form[`location_${activeLanguage}`] || form.location_vi || form.location_en || "";
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

  const saveJob = async (action) => {
    setError("");

    const hasTitle = Boolean(form.title_vi.trim() || form.title_en.trim());
    const hasContent = Boolean(stripHtml(form.content_vi) || stripHtml(form.content_en));
    const finalSlug = slugify(form.slug || form.title_vi || form.title_en);

    if (!hasTitle) {
      setError("Vui lòng nhập chức danh tuyển dụng bằng tiếng Việt hoặc tiếng Anh.");
      return;
    }
    if (!hasContent) {
      setError("Vui lòng nhập mô tả công việc và yêu cầu tuyển dụng bằng ít nhất một ngôn ngữ.");
      return;
    }
    if (!finalSlug) {
      setError("Không thể tạo đường dẫn tuyển dụng. Vui lòng nhập lại chức danh hoặc slug.");
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
        setError("Vui lòng chọn ngày và giờ đăng JD.");
        return;
      }
      if (new Date(publishedAt).getTime() <= Date.now() + 30000) {
        setError("Thời gian hẹn đăng phải muộn hơn thời điểm hiện tại ít nhất 1 phút.");
        return;
      }
      nextStatus = "published";
    }

    setSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const payload = {
      slug: finalSlug,
      title_vi: form.title_vi || null,
      title_en: form.title_en || null,
      summary_vi: form.summary_vi || null,
      summary_en: form.summary_en || null,
      content_vi: form.content_vi || null,
      content_en: form.content_en || null,
      department_vi: form.department_vi || null,
      department_en: form.department_en || null,
      location_vi: form.location_vi || null,
      location_en: form.location_en || null,
      employment_type: form.employment_type,
      workplace_type: form.workplace_type,
      application_deadline: form.application_deadline || null,
      status: nextStatus,
      published_at: publishedAt,
      created_by: form.created_by || authData.session?.user?.id || null,
    };

    const request = isEditing
      ? supabase.from("job_posts").update(payload).eq("id", id)
      : supabase.from("job_posts").insert(payload);
    const { error: saveError } = await request;

    setSaving(false);

    if (saveError) {
      const message = saveError.code === "23505" ? "Đường dẫn tuyển dụng đã tồn tại. Vui lòng đổi slug." : saveError.message;
      setError(`Không thể lưu vị trí tuyển dụng: ${message}`);
      return;
    }

    navigate("/admin/jobs", { replace: true });
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
          <Link to="/admin/jobs" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={16} /> Trở lại danh sách</Link>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{isEditing ? "Chỉnh sửa vị trí tuyển dụng" : "Tạo JD mới"}</h1>
          <p className="mt-2 text-sm text-slate-400">Có thể nhập một hoặc cả hai ngôn ngữ; website tự dùng ngôn ngữ còn lại làm nội dung dự phòng.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPreviewOpen((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-cyan-100">
            <Eye size={18} /> {previewOpen ? "Ẩn xem trước" : "Xem trước"}
          </button>
          <button type="button" disabled={saving} onClick={() => saveJob("draft")} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/25 bg-white/[0.04] px-5 py-3 font-semibold text-cyan-100 transition hover:bg-white/[0.08] disabled:opacity-50">
            <Save size={18} /> Lưu nháp
          </button>
          <button type="button" disabled={saving} onClick={() => saveJob("schedule")} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/25 bg-violet-300/10 px-5 py-3 font-semibold text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <CalendarClock size={18} />} Hẹn giờ đăng
          </button>
          <button type="button" disabled={saving} onClick={() => saveJob("publish")} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Đăng ngay
          </button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}

      <div className={`mt-7 grid gap-6 ${previewOpen ? "2xl:grid-cols-[minmax(0,1fr)_500px]" : ""}`}>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-xl font-semibold">Nội dung tuyển dụng</h2>
                <p className="mt-1 text-sm text-slate-500">Chọn ngôn ngữ và nhập JD tương ứng.</p>
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-[#081321]/70 p-1">
                {[["vi", "Tiếng Việt"], ["en", "English"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setActiveLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeLanguage === value ? "bg-cyan-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Chức danh {activeLanguage === "vi" ? "tiếng Việt" : "tiếng Anh"}</span>
                <input value={form[`title_${activeLanguage}`]} onChange={(event) => handleTitleChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Ví dụ: Chuyên viên tư vấn thuế..." : "Example: Tax Consultant..."} />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Phòng ban / Bộ phận</span>
                  <input value={form[`department_${activeLanguage}`]} onChange={(event) => updateField(`department_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Tư vấn Thuế" : "Tax Advisory"} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-200">Địa điểm làm việc</span>
                  <input value={form[`location_${activeLanguage}`]} onChange={(event) => updateField(`location_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Thành phố Hồ Chí Minh" : "Ho Chi Minh City"} />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Mô tả ngắn</span>
                <textarea value={form[`summary_${activeLanguage}`]} onChange={(event) => updateField(`summary_${activeLanguage}`, event.target.value)} rows={3} maxLength={360} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Tóm tắt vai trò và cơ hội nghề nghiệp..." : "Summarize the role and career opportunity..."} />
                <span className="mt-1 block text-right text-xs text-slate-600">{form[`summary_${activeLanguage}`].length}/360</span>
              </label>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-200">Mô tả công việc và yêu cầu tuyển dụng</span>
                <RichTextEditor
                  key={activeLanguage}
                  value={form[`content_${activeLanguage}`]}
                  onChange={(value) => updateField(`content_${activeLanguage}`, value)}
                  placeholder={activeLanguage === "vi" ? "Nhập trách nhiệm, yêu cầu, quyền lợi và các thông tin cần thiết..." : "Enter responsibilities, requirements, benefits and other relevant information..."}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <h2 className="text-xl font-semibold">Thiết lập vị trí tuyển dụng</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Đường dẫn tuyển dụng (slug)</span>
                <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#081321]/70 focus-within:border-cyan-300/35">
                  <span className="border-r border-white/10 px-4 py-3.5 text-sm text-slate-500">facs.vn/careers/</span>
                  <input value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-white outline-none" placeholder="chuyen-vien-tu-van-thue" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Loại hình công việc</span>
                <select value={form.employment_type} onChange={(event) => updateField("employment_type", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none focus:border-cyan-300/35">
                  {employmentTypes.map((item) => <option key={item.value} value={item.value}>{item.vi} / {item.en}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Hình thức làm việc</span>
                <select value={form.workplace_type} onChange={(event) => updateField("workplace_type", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none focus:border-cyan-300/35">
                  {workplaceTypes.map((item) => <option key={item.value} value={item.value}>{item.vi} / {item.en}</option>)}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Hạn nhận hồ sơ (không bắt buộc)</span>
                <input type="date" value={form.application_deadline || ""} onChange={(event) => updateField("application_deadline", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none focus:border-cyan-300/35" />
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
            </div>
          </section>
        </div>

        {previewOpen && (
          <aside className="h-fit overflow-hidden rounded-[28px] border border-cyan-200/15 bg-[#0b1625] 2xl:sticky 2xl:top-28">
            <div className="p-7">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Bản xem trước · {activeLanguage.toUpperCase()}</div>
              {activeDepartment && <div className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">{activeDepartment}</div>}
              <h2 className="mt-3 text-3xl font-bold leading-tight">{activeTitle}</h2>
              <div className="mt-4 text-sm text-slate-500">
                {[activeLocation, getEmploymentTypeLabel(form.employment_type, activeLanguage), getWorkplaceTypeLabel(form.workplace_type, activeLanguage)].filter(Boolean).join(" · ")}
              </div>
              {activeSummary && <p className="mt-5 leading-relaxed text-slate-400">{activeSummary}</p>}
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
