import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  EyeOff,
  FileWarning,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import CountUp from "../../components/admin/ui/CountUp";
import { formatLegalDate, getCategory, legalCalendarCategories } from "../../lib/legalCalendar";
import { supabase } from "../../lib/supabaseClient";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

function isHttps(value) {
  return /^https:\/\//i.test(value?.trim() || "");
}

function hasText(value) {
  return Boolean(value?.trim());
}

function StatCard({ icon: Icon, label, value, note, tone = "cyan" }) {
  const tones = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.055] text-cyan-300",
    emerald: "border-emerald-300/15 bg-emerald-300/[0.055] text-emerald-300",
    amber: "border-amber-300/15 bg-amber-300/[0.055] text-amber-300",
    red: "border-red-300/15 bg-red-300/[0.055] text-red-300",
  };
  return (
    <div className={`facs-card facs-tile rounded-[20px] border p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4"><Icon size={21} /><CountUp value={value} className="text-3xl font-black text-white" /></div>
      <div className="mt-5 text-sm font-semibold text-ink-1">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-ink-3">{note}</div>
    </div>
  );
}

export default function AdminLegalDashboardPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("legal_calendar_events")
      .select("*")
      .order("event_date", { ascending: true });
    if (fetchError) setError(`Không thể tải Dashboard: ${fetchError.message}`);
    else setEvents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => {
    const current = today();
    const in7Days = addDays(current, 7);
    const in30Days = addDays(current, 30);
    const published = events.filter((item) => item.status === "published");
    const needsReview = events.filter((item) => item.verification_status === "needs_review");
    const overdue = published.filter((item) => item.event_date < current);
    const next7 = published.filter((item) => item.event_date >= current && item.event_date <= in7Days);
    const next30 = published.filter((item) => item.event_date >= current && item.event_date <= in30Days);
    const hidden = events.filter((item) => item.status === "archived");
    const incomplete = events.filter((item) => (
      !hasText(item.title_vi) || !hasText(item.title_en) || !hasText(item.summary_vi) || !hasText(item.summary_en)
      || !hasText(item.target_audience_vi) || !hasText(item.target_audience_en)
      || (!hasText(item.legal_basis_vi) && !hasText(item.legal_basis_en)) || !isHttps(item.official_source_url)
    ));
    const readyToPublish = events.filter((item) => item.status === "draft" && item.verification_status === "verified"
      && (hasText(item.legal_basis_vi) || hasText(item.legal_basis_en)) && isHttps(item.official_source_url));
    return { current, published, needsReview, overdue, next7, next30, hidden, incomplete, readyToPublish };
  }, [events]);

  const byCategory = useMemo(() => legalCalendarCategories.map((item) => ({
    ...item,
    total: events.filter((event) => event.category === item.value).length,
    pending: events.filter((event) => event.category === item.value && event.verification_status === "needs_review").length,
  })).sort((a, b) => b.total - a.total), [events]);

  const dashboardYear = metrics.current.slice(0, 4);
  const byMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return { month: index + 1, total: events.filter((item) => item.event_date?.startsWith(`${dashboardYear}-${month}`)).length };
    });
  }, [events, dashboardYear]);

  const maxCategory = Math.max(1, ...byCategory.map((item) => item.total));
  const maxMonth = Math.max(1, ...byMonth.map((item) => item.total));
  const attention = [...metrics.next30, ...metrics.needsReview.filter((item) => item.event_date >= metrics.current)]
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 8);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-sunset">Legal Calendar CMS</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Dashboard vận hành</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">Theo dõi tiến độ rà soát, chất lượng dữ liệu và các mốc cần ưu tiên xử lý.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-ink-1 transition hover:border-cyan-200/30 disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Làm mới</button>
          <Link to="/admin/legal-calendar" className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-bold text-white transition hover:bg-brand-hover">Quản lý mốc <ArrowRight size={17} /></Link>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {loading ? <div className="mt-7 flex items-center justify-center gap-3 facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 px-6 py-24 text-ink-3"><Loader2 className="animate-spin" size={20} /> Đang tổng hợp dữ liệu...</div> : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={CheckCircle2} label="Đang công khai" value={metrics.published.length} note={`${events.length} mốc đang được quản lý`} tone="emerald" />
            <StatCard icon={CircleAlert} label="Chưa xác minh" value={metrics.needsReview.length} note="Cần kiểm tra trước khi xuất bản" tone="amber" />
            <StatCard icon={CalendarClock} label="Đến hạn trong 7 ngày" value={metrics.next7.length} note={`${metrics.next30.length} mốc trong 30 ngày tới`} />
            <StatCard icon={FileWarning} label="Thiếu dữ liệu chuẩn" value={metrics.incomplete.length} note="Thiếu song ngữ, căn cứ hoặc nguồn chính thức" tone="red" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShieldCheck} label="Sẵn sàng xuất bản" value={metrics.readyToPublish.length} note="Đã xác minh và đủ điều kiện" tone="cyan" />
            <StatCard icon={AlertTriangle} label="Mốc đã qua ngày" value={metrics.overdue.length} note="Mốc công khai có ngày trước hôm nay" tone="amber" />
            <StatCard icon={EyeOff} label="Đang ẩn khỏi web" value={metrics.hidden.length} note="Vẫn được lưu và quản lý trong CMS" />
            <StatCard icon={CalendarClock} label="Tổng dữ liệu" value={events.length} note={`Cập nhật đến ${formatLegalDate(metrics.current, "vi")}`} tone="emerald" />
          </div>

          <div className="mt-7 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6">
              <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-bold">Theo lĩnh vực</h2><p className="mt-1 text-sm text-ink-3">Tổng số mốc và số chưa xác minh</p></div><Link to="/admin/legal-calendar" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Mở danh sách</Link></div>
              <div className="mt-6 space-y-4">
                {byCategory.map((item) => <div key={item.value}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-ink-1">{item.vi}</span><span className="text-ink-3"><strong className="text-white">{item.total}</strong>{item.pending ? ` · ${item.pending} chờ duyệt` : ""}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full" style={{ width: `${(item.total / maxCategory) * 100}%`, backgroundColor: item.color }} /></div>
                </div>)}
              </div>
            </section>

            <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6">
              <h2 className="text-xl font-bold">Phân bổ theo tháng {dashboardYear}</h2>
              <p className="mt-1 text-sm text-ink-3">Nhận diện tháng cao điểm để bố trí nguồn lực</p>
              <div className="mt-7 flex h-56 items-end gap-2 sm:gap-3">
                {byMonth.map((item) => <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
                  <span className="mb-2 text-xs font-bold text-ink-2">{item.total || ""}</span>
                  <div className="min-h-1 rounded-t-lg bg-gradient-to-t from-cyan-500/60 to-cyan-200" style={{ height: `${Math.max(3, (item.total / maxMonth) * 82)}%` }} title={`Tháng ${item.month}: ${item.total} mốc`} />
                  <span className="mt-2 text-[10px] text-ink-3">T{item.month}</span>
                </div>)}
              </div>
            </section>
          </div>

          <section className="mt-6 facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold">Danh sách cần ưu tiên</h2><p className="mt-1 text-sm text-ink-3">Mốc sắp đến hạn hoặc chưa được rà soát, xếp theo ngày gần nhất</p></div><span className="text-xs text-ink-3">Tối đa 8 mốc</span></div>
            {attention.length === 0 ? <div className="mt-6 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] px-5 py-8 text-center text-sm text-emerald-200">Không có mốc cần ưu tiên trong phạm vi hiện tại.</div> : <div className="mt-5 divide-y divide-white/8">
              {attention.map((item) => { const itemCategory = getCategory(item.category); return <div key={item.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
                <div className="w-28 shrink-0 text-sm font-bold text-cyan-200">{formatLegalDate(item.event_date, "vi")}</div>
                <div className="min-w-0 flex-1"><div className="font-semibold text-ink-1">{item.title_vi || item.title_en}</div><div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-3"><span style={{ color: itemCategory.color }}>{itemCategory.vi}</span><span>·</span><span>{item.verification_status === "verified" ? "Đã xác minh" : "Chưa xác minh"}</span><span>·</span><span>{item.status === "published" ? "Đang công khai" : item.status === "archived" ? "Đang ẩn" : "Bản nháp"}</span></div></div>
                <Link to={`/admin/legal-calendar/${item.id}/edit`} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-ink-2 hover:border-cyan-200/30 hover:text-cyan-200">Kiểm tra <ArrowRight size={14} /></Link>
              </div>; })}
            </div>}
          </section>
        </>
      )}
    </AdminLayout>
  );
}
