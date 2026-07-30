import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  legalCalendarCategories,
  sourceTiers,
  verificationStates,
} from "../../lib/legalCalendar";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  event_date: "",
  category: "tax",
  title_vi: "",
  title_en: "",
  summary_vi: "",
  summary_en: "",
  target_audience_vi: "",
  target_audience_en: "",
  period_label_vi: "",
  period_label_en: "",
  legal_basis_vi: "",
  legal_basis_en: "",
  official_source_url: "",
  source_name: "",
  source_url: "",
  source_tier: "P2",
  source_published_at: "",
  source_id: null,
  notes: "",
  verification_status: "needs_review",
  status: "draft",
  published_at: null,
  created_by: null,
};

function isHttpsUrl(value) {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export default function AdminLegalCalendarEditorPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const candidateId = searchParams.get("candidate");
  const [form, setForm] = useState(emptyForm);
  const [activeLanguage, setActiveLanguage] = useState("vi");
  const [loading, setLoading] = useState(isEditing || Boolean(candidateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (isEditing) {
        const { data, error: fetchError } = await supabase.from("legal_calendar_events").select("*").eq("id", id).single();
        if (!active) return;
        if (fetchError) setError(`Không thể tải mốc pháp lý: ${fetchError.message}`);
        else setForm({ ...emptyForm, ...data, source_published_at: data.source_published_at?.slice(0, 10) || "" });
        setLoading(false);
        return;
      }

      if (candidateId) {
        const { data, error: fetchError } = await supabase
          .from("legal_calendar_candidates")
          .select("*, legal_calendar_sources(id,name,source_tier)")
          .eq("id", candidateId)
          .single();
        if (!active) return;
        if (fetchError) setError(`Không thể tải dữ liệu phát hiện: ${fetchError.message}`);
        else {
          setForm((current) => ({
            ...current,
            title_vi: data.title || "",
            summary_vi: data.summary || "",
            source_name: data.legal_calendar_sources?.name || "",
            source_tier: data.legal_calendar_sources?.source_tier || "P2",
            source_url: data.source_url || "",
            source_published_at: data.source_published_at?.slice(0, 10) || "",
            source_id: data.source_id || null,
            notes: `Tạo từ hàng đợi cập nhật tự động ngày ${new Date().toLocaleDateString("vi-VN")}.`,
          }));
        }
        setLoading(false);
        return;
      }

      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [id, isEditing, candidateId]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const saveEvent = async (action) => {
    setError("");
    const hasTitle = Boolean(form.title_vi.trim() || form.title_en.trim());
    if (!form.event_date) {
      setError("Vui lòng chọn ngày đến hạn.");
      return;
    }
    if (!hasTitle) {
      setError("Vui lòng nhập tên nghĩa vụ bằng ít nhất một ngôn ngữ.");
      return;
    }
    if (!isHttpsUrl(form.source_url) || !isHttpsUrl(form.official_source_url)) {
      setError("Đường dẫn nguồn phải là URL HTTPS hợp lệ.");
      return;
    }

    if (action === "publish") {
      if (form.verification_status !== "verified") {
        setError("Chỉ có thể xuất bản sau khi chuyển trạng thái xác minh thành “Đã xác minh”.");
        return;
      }
      if (!(form.legal_basis_vi.trim() || form.legal_basis_en.trim())) {
        setError("Vui lòng nhập căn cứ pháp lý trước khi xuất bản.");
        return;
      }
      if (!form.official_source_url.trim()) {
        setError("Vui lòng bổ sung đường dẫn nguồn chính thức P1 trước khi xuất bản.");
        return;
      }
    }

    setSaving(true);
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user?.id || null;
    const payload = {
      event_date: form.event_date,
      category: form.category,
      title_vi: form.title_vi.trim() || null,
      title_en: form.title_en.trim() || null,
      summary_vi: form.summary_vi.trim() || null,
      summary_en: form.summary_en.trim() || null,
      target_audience_vi: form.target_audience_vi.trim() || null,
      target_audience_en: form.target_audience_en.trim() || null,
      period_label_vi: form.period_label_vi.trim() || null,
      period_label_en: form.period_label_en.trim() || null,
      legal_basis_vi: form.legal_basis_vi.trim() || null,
      legal_basis_en: form.legal_basis_en.trim() || null,
      official_source_url: form.official_source_url.trim() || null,
      source_name: form.source_name.trim() || null,
      source_url: form.source_url.trim() || null,
      source_tier: form.source_tier,
      source_published_at: form.source_published_at ? new Date(`${form.source_published_at}T00:00:00+07:00`).toISOString() : null,
      source_id: form.source_id || null,
      notes: form.notes.trim() || null,
      verification_status: form.verification_status,
      status: action === "publish" ? "published" : "draft",
      published_at: action === "publish" ? (form.published_at || new Date().toISOString()) : null,
      reviewed_at: action === "publish" ? new Date().toISOString() : null,
      reviewed_by: action === "publish" ? userId : null,
      created_by: form.created_by || userId,
    };

    const request = isEditing
      ? supabase.from("legal_calendar_events").update(payload).eq("id", id).select("id").single()
      : supabase.from("legal_calendar_events").insert(payload).select("id").single();
    const { data: saved, error: saveError } = await request;

    if (saveError) {
      setError(`Không thể lưu mốc pháp lý: ${saveError.message}`);
      setSaving(false);
      return;
    }

    if (candidateId && saved?.id) {
      await supabase.from("legal_calendar_candidates").update({
        status: "mapped",
        mapped_event_id: saved.id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: userId,
      }).eq("id", candidateId);
    }

    setSaving(false);
    navigate("/admin/legal-calendar", { replace: true });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-cyan-300" size={34} /></div>
      </AdminLayout>
    );
  }

  const activeTitle = form[`title_${activeLanguage}`] || form.title_vi || form.title_en || "Mốc pháp lý chưa có tiêu đề";
  const activeSummary = form[`summary_${activeLanguage}`] || form.summary_vi || form.summary_en || "";

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link to="/admin/legal-calendar" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-200"><ArrowLeft size={16} /> Trở lại lịch pháp lý</Link>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">{isEditing ? "Chỉnh sửa mốc pháp lý" : "Thêm mốc pháp lý"}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Nguồn phát hiện P2/P3 không thay thế căn cứ chính thức P1. Hệ thống sẽ chặn xuất bản nếu chưa có nguồn chính thức.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => saveEvent("draft")} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/25 bg-white/[0.04] px-5 py-3 font-semibold text-cyan-100 transition hover:bg-white/[0.08] disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Lưu nháp
          </button>
          <button type="button" disabled={saving} onClick={() => saveEvent("publish")} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Xác minh & xuất bản
          </button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}

      <div className="mt-7 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <h2 className="text-xl font-semibold">Nội dung nghĩa vụ</h2>
                <p className="mt-1 text-sm text-slate-500">Có thể nhập một hoặc cả hai ngôn ngữ.</p>
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-[#081321]/70 p-1">
                {[["vi", "Tiếng Việt"], ["en", "English"]].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setActiveLanguage(value)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeLanguage === value ? "bg-cyan-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>{label}</button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Ngày đến hạn *</span>
                <input type="date" value={form.event_date} onChange={(event) => updateField("event_date", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none focus:border-cyan-300/35" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Lĩnh vực *</span>
                <select value={form.category} onChange={(event) => updateField("category", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none">
                  {legalCalendarCategories.map((item) => <option key={item.value} value={item.value}>{item.vi} / {item.en}</option>)}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Tên nghĩa vụ ({activeLanguage.toUpperCase()}) *</span>
                <input value={form[`title_${activeLanguage}`]} onChange={(event) => updateField(`title_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Ví dụ: Nộp hồ sơ khai thuế GTGT theo quý..." : "Example: Quarterly VAT return filing..."} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Kỳ báo cáo ({activeLanguage.toUpperCase()})</span>
                <input value={form[`period_label_${activeLanguage}`]} onChange={(event) => updateField(`period_label_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Quý 2/2026" : "Q2 2026"} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Đối tượng ({activeLanguage.toUpperCase()})</span>
                <input value={form[`target_audience_${activeLanguage}`]} onChange={(event) => updateField(`target_audience_${activeLanguage}`, event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Doanh nghiệp khai thuế theo quý" : "Quarterly tax filers"} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Mô tả và lưu ý áp dụng ({activeLanguage.toUpperCase()})</span>
                <textarea value={form[`summary_${activeLanguage}`]} onChange={(event) => updateField(`summary_${activeLanguage}`, event.target.value)} rows={4} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Căn cứ pháp lý ({activeLanguage.toUpperCase()}) *</span>
                <textarea value={form[`legal_basis_${activeLanguage}`]} onChange={(event) => updateField(`legal_basis_${activeLanguage}`, event.target.value)} rows={4} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" placeholder={activeLanguage === "vi" ? "Điều, khoản, tên và số hiệu văn bản..." : "Article, clause, title and instrument number..."} />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-cyan-300" size={22} />
              <div>
                <h2 className="text-xl font-semibold">Nguồn và kiểm soát</h2>
                <p className="mt-1 text-sm text-slate-500">Lưu tách biệt nguồn phát hiện và nguồn pháp lý chính thức.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-emerald-100">Đường dẫn nguồn chính thức P1 *</span>
                <div className="flex items-center rounded-2xl border border-emerald-200/15 bg-emerald-300/[0.035] px-4 focus-within:border-emerald-200/35">
                  <ExternalLink size={16} className="text-emerald-300" />
                  <input type="url" value={form.official_source_url || ""} onChange={(event) => updateField("official_source_url", event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-white outline-none placeholder:text-slate-600" placeholder="https://vbpl.vn/... hoặc cổng thông tin cơ quan ban hành" />
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Tên nguồn phát hiện</span>
                <input value={form.source_name || ""} onChange={(event) => updateField("source_name", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none" placeholder="MISA AMIS, Thư Viện Pháp Luật..." />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Cấp nguồn</span>
                <select value={form.source_tier} onChange={(event) => updateField("source_tier", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none">
                  {sourceTiers.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Đường dẫn nguồn phát hiện</span>
                <input type="url" value={form.source_url || ""} onChange={(event) => updateField("source_url", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none" placeholder="https://..." />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Ngày nguồn công bố</span>
                <input type="date" value={form.source_published_at || ""} onChange={(event) => updateField("source_published_at", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 text-white outline-none" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Trạng thái xác minh *</span>
                <select value={form.verification_status} onChange={(event) => updateField("verification_status", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3.5 text-white outline-none">
                  {verificationStates.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Ghi chú nội bộ</span>
                <textarea value={form.notes || ""} onChange={(event) => updateField("notes", event.target.value)} rows={4} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3.5 leading-relaxed text-white outline-none" />
              </label>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-[28px] border border-cyan-200/15 bg-[#0b1625] p-6 2xl:sticky 2xl:top-28">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Xem trước · {activeLanguage.toUpperCase()}</div>
          <div className="mt-6 flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.06]">
            <CalendarDays size={22} className="text-cyan-300" />
            <span className="mt-1 text-xs font-semibold text-slate-400">{form.event_date || "YYYY-MM-DD"}</span>
          </div>
          <h2 className="mt-5 text-2xl font-bold leading-snug">{activeTitle}</h2>
          {activeSummary && <p className="mt-4 leading-relaxed text-slate-400">{activeSummary}</p>}
          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              {form.verification_status === "verified" ? <CheckCircle2 size={17} className="text-emerald-300" /> : <ShieldCheck size={17} className="text-amber-300" />}
              {verificationStates.find((item) => item.value === form.verification_status)?.vi}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">Bản xem trước chỉ hỗ trợ kiểm tra nội dung. Việc xuất bản vẫn tuân theo điều kiện xác minh và nguồn P1.</p>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
