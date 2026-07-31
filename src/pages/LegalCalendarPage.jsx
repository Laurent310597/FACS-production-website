import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { useLanguage } from "../components/LanguageContext";
import {
  downloadLegalEventIcs,
  fallbackLegalEvents,
  formatLegalDate,
  getCategory,
  getLocalizedLegalEvent,
  legalCalendarCategories,
} from "../lib/legalCalendar";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const weekDays = {
  vi: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"],
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

const calendarCategoryColors = {
  tax: "#0e7490",
  accounting: "#2563eb",
  labor: "#7c3aed",
  insurance: "#047857",
  hse: "#a16207",
  corporate: "#be123c",
  other: "#475569",
};

function monthRange(year, month) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month + 1, 0));
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDate.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

function buildCalendarCells(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: mondayOffset }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function LegalCalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }, (_, index) => (
        <div key={index} className="min-h-24 animate-pulse rounded-2xl bg-slate-200/80 md:min-h-32" />
      ))}
    </div>
  );
}

function EventCard({ event, language, compact = false }) {
  const isVi = language === "vi";
  const localized = getLocalizedLegalEvent(event, language);
  const category = getCategory(event.category);

  return (
    <article className={`rounded-[26px] border border-white/10 bg-[#081321]/55 transition hover:border-cyan-200/25 ${compact ? "p-5" : "p-6 md:p-7"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]"
          style={{ color: category.color, borderColor: `${category.color}45`, backgroundColor: `${category.color}12` }}
        >
          {category[language] || category.en}
        </span>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/[0.07]">
          <span className="text-xl font-black text-cyan-200">{event.event_date.slice(-2)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-GB", { month: "short" }).format(new Date(`${event.event_date}T00:00:00+07:00`))}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`${compact ? "text-lg" : "text-xl"} font-semibold leading-snug text-white`}>{localized.title}</h3>
          {localized.periodLabel && <div className="mt-1 text-sm text-cyan-300/80">{localized.periodLabel}</div>}
        </div>
      </div>

      {!compact && localized.summary && <p className="mt-5 leading-relaxed text-slate-400">{localized.summary}</p>}

      {!compact && (
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{isVi ? "Đối tượng áp dụng" : "Applicability"}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{localized.targetAudience || (isVi ? "Cần xác định theo hồ sơ thực tế" : "To be assessed based on actual circumstances")}</p>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{isVi ? "Căn cứ pháp lý" : "Legal basis"}</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{localized.legalBasis || (isVi ? "Đang cập nhật" : "Being updated")}</p>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => downloadLegalEventIcs(event, language)}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 px-3.5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10"
        >
          <Download size={15} /> {isVi ? "Thêm vào lịch" : "Add to calendar"}
        </button>
        {event.official_source_url && (
          <a href={event.official_source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/15 px-3.5 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/10">
            {isVi ? "Nguồn chính thức" : "Official source"} <ExternalLink size={14} />
          </a>
        )}
        {event.source_url && (
          <a href={event.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/25 hover:text-white">
            {event.source_name || (isVi ? "Nguồn tham khảo" : "Reference")} <ExternalLink size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function LegalCalendarPage() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [events, setEvents] = useState(isSupabaseConfigured ? [] : fallbackLegalEvents);
  const [activeCategories, setActiveCategories] = useState(() => new Set(legalCalendarCategories.map((item) => item.value)));
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState("");
  const cells = useMemo(() => buildCalendarCells(year, month), [year, month]);

  useEffect(() => {
    let active = true;
    const load = async (showLoading = false) => {
      const { start, end } = monthRange(year, month);
      if (!supabase) {
        setEvents(fallbackLegalEvents.filter((event) => event.event_date >= start && event.event_date <= end));
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("legal_calendar_events")
        .select("*")
        .eq("status", "published")
        .eq("verification_status", "verified")
        .lte("published_at", new Date().toISOString())
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date", { ascending: true })
        .order("title_vi", { ascending: true });

      if (!active) return;
      if (fetchError) {
        console.error("Unable to load the legal calendar:", fetchError);
        setEvents([]);
        setError(isVi ? "Lịch pháp lý đang được cập nhật. Vui lòng quay lại sau." : "The legal calendar is being updated. Please check back shortly.");
      } else {
        setEvents(data || []);
        setError("");
      }
      setLoading(false);
    };

    load(true);
    const timer = window.setInterval(() => load(false), 15 * 60 * 1000);
    const onFocus = () => load(false);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [year, month, isVi]);

  const filteredEvents = useMemo(
    () => events.filter((event) => activeCategories.has(event.category)),
    [events, activeCategories],
  );

  const eventsByDay = useMemo(() => filteredEvents.reduce((map, event) => {
    const day = Number(event.event_date.slice(-2));
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(event);
    return map;
  }, new Map()), [filteredEvents]);

  const selectedEvents = eventsByDay.get(selectedDay) || [];
  const changeMonth = (offset) => {
    const next = new Date(Date.UTC(year, month + offset, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
    setSelectedDay(1);
  };

  const goToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDay(now.getDate());
  };

  const toggleCategory = (value) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const monthTitle = new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 1)));
  const displayMonthTitle = monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.11),transparent_28%),linear-gradient(135deg,#0d1726_0%,#101b2f_50%,#132238_100%)] text-white">
      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10 py-20 md:py-28">
        <div className="absolute -right-24 top-8 h-80 w-80 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="container relative mx-auto px-6 lg:px-12">
          <div className="grid items-end gap-10 xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2 text-sm font-semibold text-cyan-200">
                <CalendarCheck2 size={16} /> {isVi ? "Tiện ích tuân thủ doanh nghiệp" : "Business compliance resource"}
              </div>
              <h1 className="text-balance text-5xl font-bold leading-[1.08] md:text-6xl lg:text-7xl">
                {isVi ? "Lịch pháp lý doanh nghiệp" : "Corporate Legal Calendar"}
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-relaxed text-slate-400">
                {isVi
                  ? "Theo dõi các mốc kê khai, báo cáo và nghĩa vụ định kỳ về thuế, kế toán, lao động, bảo hiểm và HSE — được FACS rà soát trước khi công bố."
                  : "Track recurring filing, reporting and compliance deadlines across tax, accounting, labour, social insurance and HSE — reviewed by FACS before publication."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                [ShieldCheck, isVi ? "Có kiểm duyệt" : "Editorially reviewed", isVi ? "Không tự động công bố dữ liệu chưa xác minh" : "Unverified data is never auto-published"],
                [RefreshCw, isVi ? "Cập nhật định kỳ" : "Regularly updated", isVi ? "Các mốc được rà soát và bổ sung thường xuyên" : "Deadlines are reviewed and updated regularly"],
                [ExternalLink, isVi ? "Truy xuất nguồn" : "Source traceability", isVi ? "Lưu nguồn phát hiện và căn cứ chính thức" : "Discovery and official sources are retained"],
              ].map(([Icon, title, desc]) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                  <Icon size={19} className="mt-0.5 shrink-0 text-cyan-300" />
                  <div>
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-12">
          <div className="rounded-[32px] border border-cyan-100/40 bg-[linear-gradient(145deg,rgba(248,250,252,0.98),rgba(226,232,240,0.96))] p-4 text-[#0d1726] shadow-[0_32px_100px_rgba(0,0,0,0.24)] md:p-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <button type="button" onClick={() => changeMonth(-1)} aria-label={isVi ? "Tháng trước" : "Previous month"} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300/80 bg-white/70 text-slate-600 transition hover:border-cyan-500/40 hover:bg-white hover:text-cyan-800">
                  <ChevronLeft size={20} />
                </button>
                <div className="min-w-[190px] text-center">
                  <h2 className="text-xl font-bold text-slate-950 md:text-2xl">{displayMonthTitle}</h2>
                  <button type="button" onClick={goToday} className="mt-1 text-xs font-semibold text-cyan-700 transition hover:text-cyan-900">
                    {isVi ? "Về tháng hiện tại" : "Go to current month"}
                  </button>
                </div>
                <button type="button" onClick={() => changeMonth(1)} aria-label={isVi ? "Tháng sau" : "Next month"} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-300/80 bg-white/70 text-slate-600 transition hover:border-cyan-500/40 hover:bg-white hover:text-cyan-800">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-300/80 bg-white/75 px-4">
                  <CalendarDays size={17} className="text-slate-500" />
                  <select value={month} onChange={(event) => { setMonth(Number(event.target.value)); setSelectedDay(1); }} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none">
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index} value={index} className="bg-white text-slate-900">
                        {new Intl.DateTimeFormat(isVi ? "vi-VN" : "en-GB", { month: "long" }).format(new Date(Date.UTC(2026, index, 1)))}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-300/80 bg-white/75 px-4">
                  <Clock3 size={17} className="text-slate-500" />
                  <select value={year} onChange={(event) => { setYear(Number(event.target.value)); setSelectedDay(1); }} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold text-slate-900 outline-none">
                    {Array.from({ length: 5 }, (_, index) => today.getFullYear() - 1 + index).map((item) => <option key={item} value={item} className="bg-white text-slate-900">{item}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-300/70 pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                <Filter size={14} /> {isVi ? "Lọc lĩnh vực" : "Filter by area"}
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                {legalCalendarCategories.map((category) => {
                  const enabled = activeCategories.has(category.value);
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => toggleCategory(category.value)}
                      className="whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition"
                      style={{
                        color: enabled ? calendarCategoryColors[category.value] : "#64748b",
                        borderColor: enabled ? `${category.color}55` : "rgba(100,116,139,.22)",
                        backgroundColor: enabled ? `${category.color}1c` : "rgba(255,255,255,.55)",
                      }}
                    >
                      {category[language] || category.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 hidden grid-cols-7 gap-2 px-1 md:grid">
              {weekDays[language].map((day) => <div key={day} className="py-2 text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{day}</div>)}
            </div>

            {loading ? <div className="mt-3"><LegalCalendarSkeleton /></div> : (
              <div className="mt-3 grid grid-cols-7 gap-1.5 md:gap-2">
                {cells.map((day, index) => {
                  if (!day) return <div key={`empty-${index}`} className="min-h-16 rounded-2xl border border-transparent md:min-h-32" />;
                  const dayEvents = eventsByDay.get(day) || [];
                  const selected = selectedDay === day;
                  const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`relative min-h-16 overflow-hidden rounded-2xl border p-2 text-left transition md:min-h-32 md:p-3 ${
                        selected
                          ? "border-cyan-500/50 bg-cyan-100/80 shadow-[0_8px_24px_rgba(8,145,178,0.12)]"
                          : "border-slate-200/90 bg-white/80 hover:border-cyan-500/35 hover:bg-white"
                      }`}
                      aria-label={`${formatLegalDate(dateKey(year, month, day), language, { longMonth: true })}, ${dayEvents.length} ${isVi ? "nghĩa vụ" : "deadlines"}`}
                    >
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold md:h-8 md:w-8 ${isToday ? "bg-cyan-500 text-white" : selected ? "text-cyan-900" : "text-slate-700"}`}>{day}</span>
                      <div className="mt-2 flex flex-wrap gap-1 md:hidden">
                        {dayEvents.slice(0, 4).map((event) => <span key={event.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategory(event.category).color }} />)}
                      </div>
                      <div className="mt-2 hidden space-y-1.5 md:block">
                        {dayEvents.slice(0, 2).map((event) => {
                          const localized = getLocalizedLegalEvent(event, language);
                          const category = getCategory(event.category);
                          return (
                            <div key={event.id} className="line-clamp-2 rounded-lg px-2 py-1.5 text-[11px] font-semibold leading-snug" style={{ color: calendarCategoryColors[category.value], backgroundColor: `${category.color}1c` }}>
                              {localized.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 2 && <div className="px-2 text-[10px] font-semibold text-slate-600">+{dayEvents.length - 2} {isVi ? "mốc khác" : "more"}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-5 text-amber-100">
              <AlertTriangle size={20} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">{error}</p>
            </div>
          )}

          <div className="mt-10 grid gap-7 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-cyan-300">{formatLegalDate(dateKey(year, month, selectedDay), language, { longMonth: true })}</div>
                  <h2 className="mt-2 text-3xl font-bold">{isVi ? "Nghĩa vụ trong ngày" : "Deadlines for this date"}</h2>
                </div>
                <div className="text-sm text-slate-500">{selectedEvents.length} {isVi ? "mốc đã công bố" : "published deadlines"}</div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedEvents.length > 0 ? selectedEvents.map((event) => (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <EventCard event={event} language={language} />
                  </motion.div>
                )) : (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                    <CalendarCheck2 size={34} className="mx-auto text-slate-600" />
                    <div className="mt-4 text-xl font-semibold">{isVi ? "Chưa có mốc đã công bố" : "No published deadlines"}</div>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                      {isVi ? "Chọn ngày có dấu màu hoặc thay đổi bộ lọc lĩnh vực." : "Select a date with a coloured marker or adjust the area filters."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <aside className="h-fit rounded-[28px] border border-white/10 bg-white/[0.035] p-6 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-cyan-300" />
                <h2 className="text-xl font-semibold">{isVi ? "Nguyên tắc sử dụng" : "How to use this calendar"}</h2>
              </div>
              <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-400">
                <p>{isVi ? "Lịch được xây dựng như công cụ nhận diện và quản lý thời hạn, không thay thế ý kiến tư vấn cho một hồ sơ cụ thể." : "This calendar is a deadline identification and management tool. It does not replace advice on a specific matter."}</p>
                <p>{isVi ? "Ngày thực hiện có thể thay đổi do ngày nghỉ, phương thức nộp, cơ quan quản lý, địa phương hoặc đặc điểm của doanh nghiệp." : "Dates may change due to holidays, filing method, authority, locality or enterprise-specific circumstances."}</p>
              </div>

              <a href="/contact" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3.5 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200">
                {isVi ? "Trao đổi với FACS" : "Discuss with FACS"} <ExternalLink size={16} />
              </a>
            </aside>
          </div>

          {filteredEvents.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-12">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-cyan-300">{displayMonthTitle}</div>
                  <h2 className="mt-2 text-3xl font-bold">{isVi ? "Danh sách mốc trong tháng" : "Monthly deadline list"}</h2>
                </div>
                <div className="text-sm text-slate-500">{filteredEvents.length} {isVi ? "mốc phù hợp bộ lọc" : "matching deadlines"}</div>
              </div>
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {filteredEvents.map((event) => <EventCard key={event.id} event={event} language={language} compact />)}
              </div>
            </section>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
