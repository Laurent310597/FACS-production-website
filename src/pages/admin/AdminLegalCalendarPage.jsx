import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  Copy,
  Edit3,
  EyeOff,
  FilePlus2,
  Loader2,
  Rocket,
  Search,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  eventPublicationStates,
  formatLegalDate,
  getCategory,
  legalCalendarCategories,
  verificationStates,
} from "../../lib/legalCalendar";
import { supabase } from "../../lib/supabaseClient";

const publicationLabels = Object.fromEntries(eventPublicationStates.map((item) => [item.value, item.vi]));
const verificationLabels = Object.fromEntries(verificationStates.map((item) => [item.value, item.vi]));
const BULK_UPDATE_SIZE = 100;

function canPublish(event) {
  const hasLegalBasis = Boolean(event.legal_basis_vi?.trim() || event.legal_basis_en?.trim());
  const hasOfficialSource = /^https:\/\//i.test(event.official_source_url?.trim() || "");
  return event.status !== "published" && event.status !== "archived" && hasLegalBasis && hasOfficialSource;
}

export default function AdminLegalCalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data, error: fetchError } = await supabase
      .from("legal_calendar_events")
      .select("*")
      .order("event_date", { ascending: false })
      .order("updated_at", { ascending: false });
    if (fetchError) setError(`Không thể tải lịch pháp lý: ${fetchError.message}`);
    else setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesQuery = !normalized || `${event.title_vi || ""} ${event.title_en || ""} ${event.legal_basis_vi || ""}`.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || event.status === status;
      const matchesCategory = category === "all" || event.category === category;
      const matchesYear = year === "all" || event.event_date?.slice(0, 4) === year;
      const matchesMonth = month === "all" || event.event_date?.slice(5, 7) === month;
      return matchesQuery && matchesStatus && matchesCategory && matchesYear && matchesMonth;
    });
  }, [events, query, status, category, year, month]);

  const years = useMemo(() => (
    [...new Set(events.map((event) => event.event_date?.slice(0, 4)).filter(Boolean))].sort().reverse()
  ), [events]);

  const publishableEvents = useMemo(() => visibleEvents.filter(canPublish), [visibleEvents]);
  const blockedDrafts = useMemo(() => visibleEvents.filter((event) => (
    event.status !== "published" && event.status !== "archived" && !canPublish(event)
  )), [visibleEvents]);

  const counts = useMemo(() => ({
    published: events.filter((event) => event.status === "published").length,
    needsReview: events.filter((event) => event.verification_status === "needs_review").length,
    upcoming: events.filter((event) => event.status === "published" && event.event_date >= new Date().toISOString().slice(0, 10)).length,
  }), [events]);

  const duplicate = async (event) => {
    setWorking(event.id);
    setError("");
    setNotice("");
    const payload = {
      event_date: event.event_date,
      category: event.category,
      title_vi: `${event.title_vi || event.title_en || "Mốc pháp lý"} (bản sao)`,
      title_en: event.title_en ? `${event.title_en} (copy)` : null,
      summary_vi: event.summary_vi,
      summary_en: event.summary_en,
      target_audience_vi: event.target_audience_vi,
      target_audience_en: event.target_audience_en,
      period_label_vi: event.period_label_vi,
      period_label_en: event.period_label_en,
      legal_basis_vi: event.legal_basis_vi,
      legal_basis_en: event.legal_basis_en,
      official_source_url: event.official_source_url,
      source_name: event.source_name,
      source_url: event.source_url,
      source_tier: event.source_tier || "P2",
      source_published_at: event.source_published_at,
      source_id: event.source_id,
      notes: event.notes,
      verification_status: "needs_review",
      status: "draft",
      published_at: null,
      reviewed_at: null,
      reviewed_by: null,
    };
    const { error: duplicateError } = await supabase.from("legal_calendar_events").insert(payload);
    if (duplicateError) setError(`Không thể nhân bản: ${duplicateError.message}`);
    else await load();
    setWorking("");
  };

  const archive = async (event) => {
    if (!window.confirm(`Ẩn mốc “${event.title_vi || event.title_en}” khỏi website? Dữ liệu vẫn được lưu trong CMS.`)) return;
    setWorking(event.id);
    const { error: updateError } = await supabase
      .from("legal_calendar_events")
      .update({ status: "archived" })
      .eq("id", event.id);
    if (updateError) setError(`Không thể ẩn mốc pháp lý: ${updateError.message}`);
    else await load();
    setWorking("");
  };

  const publishFiltered = async () => {
    if (publishableEvents.length === 0) {
      setError("Không có mốc nào trong kết quả lọc đáp ứng đủ căn cứ pháp lý và nguồn chính thức P1 để xuất bản.");
      return;
    }

    const confirmation = [
      `Xuất bản ngay ${publishableEvents.length} mốc đủ điều kiện trong kết quả đang lọc?`,
      blockedDrafts.length > 0 ? `${blockedDrafts.length} mốc chưa đủ nguồn P1/căn cứ sẽ tự động được giữ lại để bổ sung.` : "",
    ].filter(Boolean).join("\n\n");
    if (!window.confirm(confirmation)) return;

    setWorking("bulk-publish");
    setError("");
    setNotice("");
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user?.id || null;
    const now = new Date().toISOString();
    const ids = publishableEvents.map((event) => event.id);

    for (let offset = 0; offset < ids.length; offset += BULK_UPDATE_SIZE) {
      const batch = ids.slice(offset, offset + BULK_UPDATE_SIZE);
      const { error: updateError } = await supabase
        .from("legal_calendar_events")
        .update({
          verification_status: "verified",
          status: "published",
          published_at: now,
          reviewed_at: now,
          reviewed_by: userId,
        })
        .in("id", batch);

      if (updateError) {
        setError(`Không thể xuất bản hàng loạt: ${updateError.message}`);
        setWorking("");
        await load();
        return;
      }
    }

    setNotice(`Đã xác minh và xuất bản ngay ${ids.length} mốc. ${blockedDrafts.length > 0 ? `${blockedDrafts.length} mốc chưa đủ điều kiện vẫn được giữ ở bản nháp.` : ""}`);
    await load();
    setWorking("");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Legal Calendar CMS</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Quản lý lịch pháp lý</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Chỉ mốc có trạng thái “Đã xác minh” và “Đã xuất bản” mới được hiển thị công khai.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/legal-calendar" target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-white">
            <CalendarRange size={18} /> Xem lịch công khai
          </Link>
          <Link to="/admin/legal-calendar/new" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200">
            <FilePlus2 size={18} /> Thêm mốc mới
          </Link>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{notice}</div>}

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          [CheckCircle2, "Đang công khai", counts.published, "text-emerald-300", "bg-emerald-300/[0.06] border-emerald-300/15"],
          [CircleAlert, "Cần rà soát", counts.needsReview, "text-amber-300", "bg-amber-300/[0.06] border-amber-300/15"],
          [CalendarRange, "Sắp đến hạn", counts.upcoming, "text-cyan-300", "bg-cyan-300/[0.06] border-cyan-300/15"],
        ].map(([Icon, label, value, iconClass, cardClass]) => (
          <div key={label} className={`rounded-[24px] border p-5 ${cardClass}`}>
            <Icon size={20} className={iconClass} />
            <div className="mt-5 text-3xl font-bold">{value}</div>
            <div className="mt-1 text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4 lg:grid-cols-[minmax(240px,1fr)_170px_150px_190px_190px]">
        <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/60 px-4 focus-within:border-cyan-300/35">
          <Search size={17} className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tiêu đề hoặc căn cứ..." className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <select value={year} onChange={(event) => setYear(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả năm</option>
          {years.map((item) => <option key={item} value={item}>Năm {item}</option>)}
        </select>
        <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả tháng</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>Tháng {Number(item)}</option>)}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả lĩnh vực</option>
          {legalCalendarCategories.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả trạng thái</option>
          {eventPublicationStates.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}
        </select>
      </div>

      {!loading && visibleEvents.length > 0 && (
        <div className="mt-4 flex flex-col gap-4 rounded-[24px] border border-cyan-300/15 bg-cyan-300/[0.05] p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="font-semibold text-cyan-100">Xuất bản theo toàn bộ kết quả lọc — không cần tick từng dòng</div>
            <div className="mt-1 text-sm text-slate-400">
              {visibleEvents.length} kết quả · {publishableEvents.length} mốc đủ căn cứ và nguồn P1
              {blockedDrafts.length > 0 ? ` · ${blockedDrafts.length} mốc cần bổ sung` : ""}
            </div>
          </div>
          <button
            type="button"
            disabled={working === "bulk-publish" || publishableEvents.length === 0}
            onClick={publishFiltered}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {working === "bulk-publish" ? <Loader2 size={18} className="animate-spin" /> : <Rocket size={18} />}
            Xác minh & xuất bản ngay {publishableEvents.length} mốc
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] px-6 py-20 text-center text-slate-500">Đang tải lịch pháp lý...</div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] px-6 py-20 text-center">
          <CalendarRange size={34} className="mx-auto text-slate-600" />
          <div className="mt-4 text-xl font-semibold">Chưa có mốc phù hợp</div>
          <p className="mt-2 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc thêm một mốc pháp lý mới.</p>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {visibleEvents.map((event) => {
            const eventCategory = getCategory(event.category);
            return (
              <article key={event.id} className="rounded-[26px] border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-200/20 md:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-200/15 bg-[#081321]/70">
                    <span className="text-xl font-black text-cyan-200">{event.event_date?.slice(-2)}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{event.event_date?.slice(5, 7)}/{event.event_date?.slice(0, 4)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border px-3 py-1 text-xs font-bold" style={{ color: eventCategory.color, borderColor: `${eventCategory.color}45`, backgroundColor: `${eventCategory.color}10` }}>{eventCategory.vi}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${event.status === "published" ? "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200" : event.status === "archived" ? "border-slate-400/15 bg-slate-400/[0.06] text-slate-400" : "border-amber-300/15 bg-amber-300/[0.06] text-amber-200"}`}>{publicationLabels[event.status] || event.status}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${event.verification_status === "verified" ? "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200" : "border-orange-300/15 bg-orange-300/[0.06] text-orange-200"}`}>{verificationLabels[event.verification_status] || event.verification_status}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold leading-snug">{event.title_vi || event.title_en}</h2>
                    <div className="mt-2 text-sm text-slate-500">
                      {formatLegalDate(event.event_date, "vi", { longMonth: true })}
                      {event.source_name ? ` · ${event.source_name} (${event.source_tier || "P2"})` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link to={`/admin/legal-calendar/${event.id}/edit`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Chỉnh sửa">
                      <Edit3 size={17} />
                    </Link>
                    <button type="button" disabled={working === event.id} onClick={() => duplicate(event)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-violet-200/30 hover:text-violet-200 disabled:opacity-50" title="Nhân bản">
                      <Copy size={17} />
                    </button>
                    {event.status !== "archived" && (
                      <button type="button" disabled={working === event.id} onClick={() => archive(event)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-amber-200/30 hover:text-amber-200 disabled:opacity-50" title="Ẩn khỏi website">
                        <EyeOff size={17} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
