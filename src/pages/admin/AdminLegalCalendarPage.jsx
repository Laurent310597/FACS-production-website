import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FilePlus2,
  Loader2,
  Rocket,
  Search,
  ShieldCheck,
  Trash2,
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
const PAGE_SIZE = 25;
const currentYear = String(new Date().getFullYear());

function canPublish(event) {
  const hasLegalBasis = Boolean(event.legal_basis_vi?.trim() || event.legal_basis_en?.trim());
  const hasOfficialSource = /^https:\/\//i.test(event.official_source_url?.trim() || "");
  return event.status !== "published" && event.status !== "archived" && hasLegalBasis && hasOfficialSource;
}

function chunks(items, size = BULK_UPDATE_SIZE) {
  const result = [];
  for (let offset = 0; offset < items.length; offset += size) result.push(items.slice(offset, offset + size));
  return result;
}

export default function AdminLegalCalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [collection, setCollection] = useState("active");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [page, setPage] = useState(1);
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

  const collectionEvents = useMemo(() => events.filter((event) => {
    const eventYear = event.event_date?.slice(0, 4);
    return collection === "archive" ? eventYear < currentYear : eventYear >= currentYear;
  }), [events, collection]);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return collectionEvents.filter((event) => {
      const haystack = `${event.title_vi || ""} ${event.title_en || ""} ${event.legal_basis_vi || ""} ${event.legal_basis_en || ""} ${event.target_audience_vi || ""}`.toLowerCase();
      const matchesQuery = !normalized || haystack.includes(normalized);
      const matchesStatus = status === "all" || event.status === status;
      const matchesCategory = category === "all" || event.category === category;
      const matchesYear = year === "all" || event.event_date?.slice(0, 4) === year;
      const matchesMonth = month === "all" || event.event_date?.slice(5, 7) === month;
      return matchesQuery && matchesStatus && matchesCategory && matchesYear && matchesMonth;
    });
  }, [collectionEvents, query, status, category, year, month]);

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const years = useMemo(() => (
    [...new Set(collectionEvents.map((event) => event.event_date?.slice(0, 4)).filter(Boolean))].sort().reverse()
  ), [collectionEvents]);
  const totalPages = Math.max(1, Math.ceil(visibleEvents.length / PAGE_SIZE));
  const pagedEvents = useMemo(() => visibleEvents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [visibleEvents, page]);
  const selectedEvents = useMemo(() => events.filter((event) => selectedIds.has(event.id)), [events, selectedIds]);
  const allFilteredSelected = visibleEvents.length > 0 && visibleEvents.every((event) => selectedIds.has(event.id));
  const selectedPublishable = useMemo(() => selectedEvents.filter(canPublish), [selectedEvents]);

  const counts = useMemo(() => ({
    published: events.filter((event) => event.status === "published").length,
    needsReview: events.filter((event) => event.verification_status === "needs_review").length,
    upcoming: events.filter((event) => event.status === "published" && event.event_date >= new Date().toISOString().slice(0, 10)).length,
    archivedYears: events.filter((event) => event.event_date?.slice(0, 4) < currentYear).length,
  }), [events]);

  const resetMessages = () => {
    setError("");
    setNotice("");
  };

  const duplicate = async (event) => {
    setWorking(event.id);
    resetMessages();
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
    else {
      setNotice("Đã tạo một bản sao ở trạng thái Bản nháp.");
      await load();
    }
    setWorking("");
  };

  const updateOne = async (event, action) => {
    const labels = { verify: "xác minh", publish: "xuất bản", hide: "ẩn khỏi website", restore: "đưa về bản nháp" };
    if ((action === "hide" || action === "restore") && !window.confirm(`${action === "hide" ? "Ẩn" : "Khôi phục"} mốc “${event.title_vi || event.title_en}”?`)) return;
    if (action === "publish" && !canPublish(event)) {
      setError("Mốc này chưa đủ căn cứ pháp lý hoặc URL nguồn chính thức để xuất bản.");
      return;
    }
    setWorking(event.id);
    resetMessages();
    const now = new Date().toISOString();
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user?.id || null;
    const payload = action === "verify"
      ? { verification_status: "verified", reviewed_at: now, reviewed_by: userId }
      : action === "publish"
        ? { verification_status: "verified", status: "published", published_at: now, reviewed_at: now, reviewed_by: userId }
        : action === "hide"
          ? { status: "archived", published_at: null }
          : { status: "draft", published_at: null };
    const { error: updateError } = await supabase.from("legal_calendar_events").update(payload).eq("id", event.id);
    if (updateError) setError(`Không thể ${labels[action]}: ${updateError.message}`);
    else {
      setNotice(`Đã ${labels[action]} 1 mốc.`);
      await load();
    }
    setWorking("");
  };

  const deleteOne = async (event) => {
    if (!window.confirm(`Xóa vĩnh viễn mốc “${event.title_vi || event.title_en}”?\n\nThao tác này không thể hoàn tác. Nếu chỉ muốn gỡ khỏi website, hãy dùng “Ẩn khỏi web”.`)) return;
    setWorking(event.id);
    resetMessages();
    const { error: deleteError } = await supabase.from("legal_calendar_events").delete().eq("id", event.id);
    if (deleteError) setError(`Không thể xóa mốc pháp lý: ${deleteError.message}`);
    else {
      setSelectedIds((current) => { const next = new Set(current); next.delete(event.id); return next; });
      setNotice("Đã xóa vĩnh viễn 1 mốc.");
      await load();
    }
    setWorking("");
  };

  const runBulk = async (action) => {
    if (selectedEvents.length === 0) return;
    const actionLabels = { verify: "xác minh", publish: "xác minh và xuất bản", hide: "ẩn khỏi website", restore: "đưa về bản nháp", delete: "xóa vĩnh viễn" };
    let targets = selectedEvents;
    if (action === "publish") targets = selectedPublishable;
    if (targets.length === 0) {
      setError("Không có mốc đã chọn nào đủ căn cứ pháp lý và URL nguồn chính thức để xuất bản.");
      return;
    }
    const skipped = selectedEvents.length - targets.length;
    const warning = action === "delete" ? "\n\nThao tác xóa không thể hoàn tác. Có thể dùng “Ẩn khỏi web” nếu muốn giữ dữ liệu." : "";
    if (!window.confirm(`${actionLabels[action][0].toUpperCase()}${actionLabels[action].slice(1)} ${targets.length} mốc đã chọn?${skipped ? `\n\n${skipped} mốc chưa đủ điều kiện sẽ được giữ nguyên.` : ""}${warning}`)) return;

    setWorking(`bulk-${action}`);
    resetMessages();
    const ids = targets.map((event) => event.id);
    const now = new Date().toISOString();
    const { data: authData } = await supabase.auth.getSession();
    const userId = authData.session?.user?.id || null;
    const payload = action === "verify"
      ? { verification_status: "verified", reviewed_at: now, reviewed_by: userId }
      : action === "publish"
        ? { verification_status: "verified", status: "published", published_at: now, reviewed_at: now, reviewed_by: userId }
        : action === "hide"
          ? { status: "archived", published_at: null }
          : { status: "draft", published_at: null };

    for (const batch of chunks(ids)) {
      const request = action === "delete"
        ? supabase.from("legal_calendar_events").delete().in("id", batch)
        : supabase.from("legal_calendar_events").update(payload).in("id", batch);
      const { error: actionError } = await request;
      if (actionError) {
        setError(`Không thể ${actionLabels[action]} hàng loạt: ${actionError.message}`);
        setWorking("");
        await load();
        return;
      }
    }
    setNotice(`Đã ${actionLabels[action]} ${ids.length} mốc.${skipped ? ` ${skipped} mốc chưa đủ điều kiện được giữ nguyên.` : ""}`);
    setSelectedIds(new Set());
    await load();
    setWorking("");
  };

  const toggleOne = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAllFiltered = () => setSelectedIds((current) => {
    const next = new Set(current);
    if (allFilteredSelected) visibleEvents.forEach((event) => next.delete(event.id));
    else visibleEvents.forEach((event) => next.add(event.id));
    return next;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Legal Calendar CMS</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Quản lý lịch pháp lý</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Chỉ mốc có trạng thái “Đã xác minh” và “Đã xuất bản” mới được hiển thị công khai.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/legal-calendar" target="_blank" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-white"><CalendarRange size={18} /> Xem lịch công khai</Link>
          <Link to="/admin/legal-calendar/new" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200"><FilePlus2 size={18} /> Thêm mốc mới</Link>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{notice}</div>}

      <div className="mt-7 grid gap-4 md:grid-cols-4">
        {[
          [CheckCircle2, "Đang công khai", counts.published, "text-emerald-300", "bg-emerald-300/[0.06] border-emerald-300/15"],
          [CircleAlert, "Cần rà soát", counts.needsReview, "text-amber-300", "bg-amber-300/[0.06] border-amber-300/15"],
          [CalendarRange, "Sắp đến hạn", counts.upcoming, "text-cyan-300", "bg-cyan-300/[0.06] border-cyan-300/15"],
          [Archive, "Mốc thuộc năm cũ", counts.archivedYears, "text-violet-300", "bg-violet-300/[0.06] border-violet-300/15"],
        ].map(([Icon, label, value, iconClass, cardClass]) => (
          <div key={label} className={`rounded-[24px] border p-5 ${cardClass}`}><Icon size={20} className={iconClass} /><div className="mt-5 text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-slate-400">{label}</div></div>
        ))}
      </div>

      <div className="mt-7 inline-flex rounded-2xl border border-white/10 bg-[#081321]/70 p-1">
        <button type="button" onClick={() => { changeFilter(setCollection, "active"); setYear("all"); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${collection === "active" ? "bg-cyan-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>Đang vận hành ({events.filter((event) => event.event_date?.slice(0, 4) >= currentYear).length})</button>
        <button type="button" onClick={() => { changeFilter(setCollection, "archive"); setYear("all"); }} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${collection === "archive" ? "bg-violet-300 text-[#071421]" : "text-slate-400 hover:text-white"}`}>Kho năm cũ ({counts.archivedYears})</button>
      </div>

      <div className="mt-4 grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4 lg:grid-cols-[minmax(240px,1fr)_150px_140px_190px_180px]">
        <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/60 px-4 focus-within:border-cyan-300/35"><Search size={17} className="text-slate-500" /><input value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Tìm tiêu đề, đối tượng hoặc căn cứ..." className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" /></label>
        <select value={year} onChange={(event) => changeFilter(setYear, event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none"><option value="all">Tất cả năm</option>{years.map((item) => <option key={item} value={item}>Năm {item}</option>)}</select>
        <select value={month} onChange={(event) => changeFilter(setMonth, event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none"><option value="all">Tất cả tháng</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>Tháng {Number(item)}</option>)}</select>
        <select value={category} onChange={(event) => changeFilter(setCategory, event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none"><option value="all">Tất cả lĩnh vực</option>{legalCalendarCategories.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}</select>
        <select value={status} onChange={(event) => changeFilter(setStatus, event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none"><option value="all">Tất cả trạng thái</option>{eventPublicationStates.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}</select>
      </div>

      {!loading && visibleEvents.length > 0 && (
        <div className="sticky top-3 z-20 mt-4 rounded-[24px] border border-cyan-300/20 bg-[#0a1928]/95 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-cyan-100"><input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} className="h-5 w-5 rounded border-white/20 accent-cyan-300" /><span>{allFilteredSelected ? "Bỏ chọn toàn bộ kết quả lọc" : `Chọn toàn bộ ${visibleEvents.length} kết quả lọc`}</span></label>
            <div className="text-sm text-slate-400">Đã chọn <strong className="text-white">{selectedEvents.length}</strong> mốc{selectedEvents.length > 0 && selectedPublishable.length !== selectedEvents.length ? ` · ${selectedPublishable.length} đủ điều kiện xuất bản` : ""}</div>
          </div>
          {selectedEvents.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <button type="button" disabled={Boolean(working)} onClick={() => runBulk("verify")} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 px-3.5 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-40"><ShieldCheck size={16} /> Xác minh ({selectedEvents.length})</button>
              <button type="button" disabled={Boolean(working) || selectedPublishable.length === 0} onClick={() => runBulk("publish")} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3.5 py-2 text-sm font-bold text-[#071421] hover:bg-cyan-200 disabled:opacity-40"><Rocket size={16} /> Xuất bản ({selectedPublishable.length})</button>
              <button type="button" disabled={Boolean(working)} onClick={() => runBulk("hide")} className="inline-flex items-center gap-2 rounded-xl border border-amber-200/20 px-3.5 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/10 disabled:opacity-40"><EyeOff size={16} /> Ẩn khỏi web ({selectedEvents.length})</button>
              <button type="button" disabled={Boolean(working)} onClick={() => runBulk("restore")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/20 px-3.5 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-300/10 disabled:opacity-40"><Eye size={16} /> Về bản nháp ({selectedEvents.length})</button>
              <button type="button" disabled={Boolean(working)} onClick={() => runBulk("delete")} className="inline-flex items-center gap-2 rounded-xl border border-red-300/20 px-3.5 py-2 text-sm font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-40"><Trash2 size={16} /> Xóa ({selectedEvents.length})</button>
              {working.startsWith("bulk-") && <span className="inline-flex items-center gap-2 px-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Đang xử lý...</span>}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] px-6 py-20 text-center text-slate-500">Đang tải lịch pháp lý...</div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] px-6 py-20 text-center"><CalendarRange size={34} className="mx-auto text-slate-600" /><div className="mt-4 text-xl font-semibold">Chưa có mốc phù hợp</div><p className="mt-2 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc chuyển giữa danh sách đang vận hành và kho năm cũ.</p></div>
      ) : (
        <>
          <div className="mt-7 space-y-4">
            {pagedEvents.map((event) => {
              const eventCategory = getCategory(event.category);
              const selected = selectedIds.has(event.id);
              return (
                <article key={event.id} className={`rounded-[26px] border p-5 transition md:p-6 ${selected ? "border-cyan-300/40 bg-cyan-300/[0.07]" : "border-white/10 bg-white/[0.035] hover:border-cyan-200/20"}`}>
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                    <label className="flex cursor-pointer items-center self-start pt-1 xl:self-center"><input type="checkbox" checked={selected} onChange={() => toggleOne(event.id)} aria-label={`Chọn ${event.title_vi || event.title_en}`} className="h-5 w-5 rounded border-white/20 accent-cyan-300" /></label>
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-200/15 bg-[#081321]/70"><span className="text-xl font-black text-cyan-200">{event.event_date?.slice(-2)}</span><span className="text-[10px] font-bold uppercase text-slate-500">{event.event_date?.slice(5, 7)}/{event.event_date?.slice(0, 4)}</span></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border px-3 py-1 text-xs font-bold" style={{ color: eventCategory.color, borderColor: `${eventCategory.color}45`, backgroundColor: `${eventCategory.color}10` }}>{eventCategory.vi}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${event.status === "published" ? "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200" : event.status === "archived" ? "border-slate-400/15 bg-slate-400/[0.06] text-slate-400" : "border-amber-300/15 bg-amber-300/[0.06] text-amber-200"}`}>{publicationLabels[event.status] || event.status}</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${event.verification_status === "verified" ? "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-200" : "border-orange-300/15 bg-orange-300/[0.06] text-orange-200"}`}>{verificationLabels[event.verification_status] || event.verification_status}</span>
                        {event.preparation_status && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${event.preparation_status === "ready" ? "border-violet-300/15 bg-violet-300/[0.06] text-violet-200" : "border-amber-300/15 bg-amber-300/[0.06] text-amber-200"}`}>{event.preparation_status === "ready" ? "Đã soạn đủ VI–EN" : event.preparation_status === "ai_unavailable" ? "Chưa biên soạn AI" : "Cần bổ sung dữ liệu"}</span>}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold leading-snug">{event.title_vi || event.title_en}</h2>
                      <div className="mt-2 text-sm text-slate-500">{formatLegalDate(event.event_date, "vi", { longMonth: true })}{event.source_name ? ` · ${event.source_name} (${event.source_tier || "P2"})` : ""}</div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {event.verification_status !== "verified" && <button type="button" disabled={working === event.id} onClick={() => updateOne(event, "verify")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200 disabled:opacity-50" title="Xác minh"><ShieldCheck size={17} /></button>}
                      {event.status !== "published" && event.status !== "archived" && <button type="button" disabled={working === event.id || !canPublish(event)} onClick={() => updateOne(event, "publish")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-emerald-200/30 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30" title={canPublish(event) ? "Xuất bản" : "Cần đủ căn cứ và nguồn chính thức trước khi xuất bản"}><Rocket size={17} /></button>}
                      <Link to={`/admin/legal-calendar/${event.id}/edit`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Chỉnh sửa"><Edit3 size={17} /></Link>
                      <button type="button" disabled={working === event.id} onClick={() => duplicate(event)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-violet-200/30 hover:text-violet-200 disabled:opacity-50" title="Nhân bản"><Copy size={17} /></button>
                      {event.status !== "archived" ? <button type="button" disabled={working === event.id} onClick={() => updateOne(event, "hide")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-amber-200/30 hover:text-amber-200 disabled:opacity-50" title="Ẩn khỏi website"><EyeOff size={17} /></button> : <button type="button" disabled={working === event.id} onClick={() => updateOne(event, "restore")} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-emerald-200/30 hover:text-emerald-200 disabled:opacity-50" title="Đưa về bản nháp"><Eye size={17} /></button>}
                      <button type="button" disabled={working === event.id} onClick={() => deleteOne(event)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-red-300/30 hover:text-red-200 disabled:opacity-50" title="Xóa vĩnh viễn"><Trash2 size={17} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {totalPages > 1 && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><span className="text-sm text-slate-400">Trang {page}/{totalPages} · {visibleEvents.length} kết quả · 25 mốc/trang</span><div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 disabled:opacity-30"><ChevronLeft size={16} /> Trước</button><button type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 disabled:opacity-30">Sau <ChevronRight size={16} /></button></div></div>}
        </>
      )}
    </AdminLayout>
  );
}
