// CMS › Đo lường: lượt xem, phiên truy cập, nguồn khách, hành động liên hệ (đo lường riêng của FACS, không cookie).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, MousePointerClick, RefreshCw, Send, Users } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { SkeletonRows } from "../../components/admin/ui/Skeleton";
import { supabase } from "../../lib/supabaseClient";
import { STATIC_PAGES } from "../../seo/siteSeo";

const PERIODS = [7, 30, 90];
const EVENT_LABELS = {
  contact_submit: "Gửi form liên hệ",
  application_submit: "Nộp hồ sơ ứng tuyển",
  form_submit: "Gửi biểu mẫu khác",
  click_call: "Bấm gọi điện",
  click_zalo: "Bấm chat Zalo",
  click_email: "Bấm gửi email",
  click_social: "Bấm mạng xã hội",
  card_save_contact: "Lưu danh bạ từ thẻ",
  card_share: "Chia sẻ thẻ danh thiếp",
  card_qr_download: "Tải mã QR thẻ",
};
const AREA_LABELS = { dock: "nút góc phải", page: "trong trang", card: "thẻ danh thiếp" };
const DEVICE_LABELS = { mobile: "Điện thoại", tablet: "Máy tính bảng", desktop: "Máy tính", unknown: "Không rõ" };
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

function sourceLabel(source) {
  const s = String(source || "direct").toLowerCase();
  if (s === "direct") return "Truy cập trực tiếp";
  if (/google\./.test(s)) return "Google";
  if (/bing\.|coccoc|yahoo|duckduckgo/.test(s)) return "Công cụ tìm kiếm khác";
  if (/zalo/.test(s)) return "Zalo";
  if (/facebook|fb\.|^m\.me|messenger/.test(s)) return "Facebook";
  if (/linkedin|lnkd/.test(s)) return "LinkedIn";
  if (/instagram/.test(s)) return "Instagram";
  if (s === "qr" || s === "nfc" || s === "app") return `Thẻ danh thiếp (${s.toUpperCase()})`;
  return source;
}
function pageLabel(path) {
  if (path === "/") return "Trang chủ";
  const page = STATIC_PAGES[path];
  if (page) return page.title.vi.split(" | ")[0].split(" – ")[0];
  if (path.startsWith("/card/")) return "Thẻ danh thiếp";
  return "";
}
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0);
const fmtTime = (iso) => new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));

function Delta({ now, before }) {
  if (!before) return <span className="text-xs text-ink-3">kỳ trước: 0</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-emerald-300" : "text-red-300"}`}>
      <Icon size={14} /> {up ? "+" : ""}{pct}% so với kỳ trước
    </span>
  );
}

function DailyChart({ daily }) {
  const W = 760;
  const H = 200;
  const pad = { l: 34, r: 8, t: 12, b: 26 };
  const max = Math.max(4, ...daily.map((d) => d.views));
  const step = (W - pad.l - pad.r) / Math.max(1, daily.length);
  const bw = Math.max(3, Math.min(22, step * 0.62));
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  const labelEvery = Math.ceil(daily.length / 8);
  const line = daily.map((d, i) => `${i ? "L" : "M"}${(pad.l + step * i + step / 2).toFixed(1)} ${y(d.sessions).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Lượt xem trang và phiên truy cập theo ngày">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-white/10" strokeDasharray={t ? "3 4" : undefined} />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-3 text-[11px]">{fmt(t)}</text>
        </g>
      ))}
      {daily.map((d, i) => {
        const x = pad.l + step * i + (step - bw) / 2;
        return (
          <g key={d.day}>
            <rect x={x} y={y(d.views)} width={bw} height={Math.max(0, y(0) - y(d.views))} rx={Math.min(4, bw / 2)} className="fill-cyan-300/70">
              <title>{`${d.day}: ${d.views} lượt xem · ${d.sessions} phiên · ${d.conversions} hành động liên hệ`}</title>
            </rect>
            {d.conversions > 0 && <circle cx={x + bw / 2} cy={y(d.views) - 7} r={3.5} className="fill-orange-400" />}
            {i % labelEvery === 0 && (
              <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="fill-ink-3 text-[11px]">{d.day.slice(8, 10)}/{d.day.slice(5, 7)}</text>
            )}
          </g>
        );
      })}
      <path d={line} fill="none" className="stroke-indigo-300" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function Table({ title, rows, columns, empty }) {
  return (
    <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6 [&>*]:min-w-0">
      <h2 className="text-xl font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">{empty}</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[.12em] text-ink-3">
              {columns.map((c) => <th key={c.key} className={`pb-2 font-semibold ${c.right ? "text-right" : ""}`}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-white/[0.07]">
                {columns.map((c) => <td key={c.key} className={`py-2.5 align-top ${c.right ? "text-right tabular-nums" : "pr-3"}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (d) => {
    setLoading(true);
    const { data: result, error: rpcError } = await supabase.rpc("site_analytics_summary", { p_days: d });
    setData(result || null);
    setError(rpcError?.message || "");
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.rpc("site_analytics_summary", { p_days: days }).then(({ data: result, error: rpcError }) => {
      if (!active) return;
      setData(result || null);
      setError(rpcError?.message || "");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [days]);

  const sources = useMemo(() => {
    const merged = new Map();
    for (const s of data?.sources || []) {
      const label = sourceLabel(s.source);
      merged.set(label, (merged.get(label) || 0) + Number(s.sessions));
    }
    return [...merged.entries()].map(([label, sessions]) => ({ label, sessions })).sort((a, b) => b.sessions - a.sessions);
  }, [data]);

  const t = data?.totals || {};
  const p = data?.previous || {};
  const kpis = [
    { label: "Lượt xem trang", icon: Activity, now: t.views, before: p.views },
    { label: "Phiên truy cập", icon: Users, now: t.sessions, before: p.sessions },
    { label: "Hành động liên hệ", hint: "Gọi, Zalo, email, biểu mẫu, lưu danh bạ", icon: MousePointerClick, now: t.conversions, before: p.conversions },
    { label: "Biểu mẫu đã gửi", hint: "Liên hệ, ứng tuyển", icon: Send, now: t.leads, before: p.leads },
  ];
  const deviceTotal = Object.values(data?.devices || {}).reduce((a, b) => a + Number(b), 0) || 1;

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-sunset">Đo lường</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Tổng quan truy cập</h1>
          <p className="mt-2 text-sm text-ink-2">Khách vào website từ đâu, xem gì và liên hệ FACS bằng cách nào. Không tính lượt xem của quản trị viên.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-2xl border border-white/10 p-1" role="group" aria-label="Khoảng thời gian">
            {PERIODS.map((d) => (
              <button key={d} type="button" onClick={() => { setLoading(true); setDays(d); }} aria-pressed={days === d}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${days === d ? "bg-cyan-300/15 text-cyan-100" : "text-ink-2"}`}>
                {d} ngày
              </button>
            ))}
          </div>
          <button onClick={() => load(days)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-ink-2"><RefreshCw size={17} /> Làm mới</button>
        </div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}

      {loading && !data ? (
        <div className="mt-7"><SkeletonRows rows={4} /></div>
      ) : (
        <div className={`mt-7 space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
            {kpis.map((k) => (
              <div key={k.label} className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5">
                <div className="flex items-center justify-between text-sm font-semibold text-ink-2">{k.label}<k.icon size={18} className="text-cyan-300" /></div>
                <div className="mt-3 text-3xl font-bold tabular-nums">{fmt(k.now)}</div>
                <div className="mt-2"><Delta now={Number(k.now) || 0} before={Number(k.before) || 0} /></div>
                {k.hint && <div className="mt-1 text-xs text-ink-3">{k.hint}</div>}
              </div>
            ))}
          </div>

          <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Theo ngày</h2>
              <div className="flex flex-wrap gap-4 text-xs text-ink-2">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-300/70" /> Lượt xem trang</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-indigo-300" /> Phiên truy cập</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-400" /> Có hành động liên hệ</span>
              </div>
            </div>
            <div className="mt-4"><DailyChart daily={data?.daily || []} /></div>
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 [&>*]:min-w-0">
            <Table
              title="Nguồn truy cập"
              rows={sources}
              empty="Chưa có lượt truy cập trong khoảng thời gian này."
              columns={[
                { key: "label", label: "Nguồn" },
                { key: "sessions", label: "Phiên", right: true, render: (r) => fmt(r.sessions) },
              ]}
            />
            <Table
              title="Hành động liên hệ"
              rows={data?.events || []}
              empty="Chưa có ai bấm gọi, Zalo, email hay gửi biểu mẫu."
              columns={[
                { key: "event", label: "Hành động", render: (r) => EVENT_LABELS[r.event] || r.event },
                { key: "n", label: "Lượt", right: true, render: (r) => fmt(r.n) },
              ]}
            />
            <Table
              title="Trang được xem nhiều nhất"
              rows={data?.pages || []}
              empty="Chưa có dữ liệu."
              columns={[
                { key: "path", label: "Trang", render: (r) => <div><div className="break-all font-medium text-white">{r.path}</div>{pageLabel(r.path) && <div className="text-xs text-ink-3">{pageLabel(r.path)}</div>}</div> },
                { key: "views", label: "Lượt xem", right: true, render: (r) => fmt(r.views) },
              ]}
            />
            <Table
              title="Trang khách vào đầu tiên"
              rows={data?.landings || []}
              empty="Chưa có dữ liệu."
              columns={[
                { key: "path", label: "Trang", render: (r) => <span className="break-all">{r.path}</span> },
                { key: "sessions", label: "Phiên", right: true, render: (r) => fmt(r.sessions) },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr] [&>*]:min-w-0">
            <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6">
              <h2 className="text-xl font-semibold">Thiết bị</h2>
              <div className="mt-4 space-y-3">
                {Object.entries(data?.devices || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-sm"><span>{DEVICE_LABELS[k] || k}</span><span className="tabular-nums text-ink-2">{Math.round((v / deviceTotal) * 100)}%</span></div>
                    <div className="mt-1.5 h-2 rounded-full bg-white/[0.06]"><div className="h-2 rounded-full bg-cyan-300/70" style={{ width: `${(v / deviceTotal) * 100}%` }} /></div>
                  </div>
                ))}
                {!Object.keys(data?.devices || {}).length && <p className="text-sm text-ink-3">Chưa có dữ liệu.</p>}
              </div>
            </section>
            <Table
              title="Hành động liên hệ gần nhất"
              rows={data?.recent || []}
              empty="Chưa có hành động liên hệ nào."
              columns={[
                { key: "at", label: "Thời gian", render: (r) => <span className="whitespace-nowrap text-ink-2">{fmtTime(r.at)}</span> },
                { key: "event", label: "Hành động", render: (r) => <div>{EVENT_LABELS[r.event] || r.event}{r.label && <div className="text-xs text-ink-3">{r.label.startsWith("dock") ? AREA_LABELS.dock : AREA_LABELS[r.label] || r.label}</div>}</div> },
                { key: "path", label: "Tại trang", render: (r) => <span className="break-all text-ink-2">{r.path}</span> },
                { key: "source", label: "Nguồn", render: (r) => sourceLabel(r.source) },
              ]}
            />
          </div>

          <section className="facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 text-sm text-ink-2 md:p-6">
            <h2 className="text-xl font-semibold text-white">Google Analytics & Search Console</h2>
            <p className="mt-3">
              Google Analytics 4: {GA_ID ? <span className="font-semibold text-emerald-300">đang bật ({GA_ID})</span> : <span className="font-semibold text-amber-200">chưa bật – cần mã đo lường G-XXXXXXX</span>}.
              {" "}Số liệu ở trang này là đo lường riêng của FACS, hoạt động độc lập với Google.
            </p>
            <p className="mt-2">Sơ đồ trang cho Google Search Console: <a className="font-semibold text-cyan-200 underline" href="/sitemap.xml" target="_blank" rel="noreferrer">facs.vn/sitemap.xml</a></p>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
