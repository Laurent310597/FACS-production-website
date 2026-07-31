import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  Loader2,
  Radar,
  RefreshCw,
  Rss,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { formatLegalDateTime, invokeLegalCalendarSync, sourceTiers } from "../../lib/legalCalendar";
import { supabase } from "../../lib/supabaseClient";

const emptySource = {
  name: "",
  domain: "",
  homepage_url: "",
  sync_url: "",
  source_tier: "P2",
  source_kind: "guidance",
  sync_mode: "link_scan",
  is_active: true,
  sync_enabled: true,
  notes: "",
};

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function AdminLegalSourcesPage() {
  const [sources, setSources] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(emptySource);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    const [sourceResult, candidateResult] = await Promise.all([
      supabase.from("legal_calendar_sources").select("*").order("source_tier").order("name"),
      supabase
        .from("legal_calendar_candidates")
        .select("*, legal_calendar_sources(name,source_tier)")
        .in("status", ["new", "reviewing"])
        .order("first_seen_at", { ascending: false })
        .limit(100),
    ]);
    if (sourceResult.error) setError(`Không thể tải nguồn: ${sourceResult.error.message}`);
    else setSources(sourceResult.data || []);
    if (candidateResult.error) setError((current) => `${current ? `${current} ` : ""}Không thể tải hàng đợi: ${candidateResult.error.message}`);
    else setCandidates(candidateResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => ({
    active: sources.filter((source) => source.is_active).length,
    syncing: sources.filter((source) => source.sync_enabled).length,
    queue: candidates.length,
  }), [sources, candidates]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const addSource = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const syncUrl = form.sync_url.trim();
    const homepageUrl = form.homepage_url.trim() || syncUrl;
    const domain = form.domain.trim().replace(/^www\./, "") || domainFromUrl(syncUrl);
    if (!form.name.trim() || !domain || !syncUrl.startsWith("https://")) {
      setError("Vui lòng nhập tên nguồn, tên miền và đường dẫn quét HTTPS hợp lệ.");
      return;
    }
    setWorking("add");
    const { error: insertError } = await supabase.from("legal_calendar_sources").insert({
      ...form,
      name: form.name.trim(),
      domain,
      homepage_url: homepageUrl || null,
      sync_url: syncUrl,
      notes: form.notes.trim() || null,
    });
    if (insertError) setError(`Không thể thêm nguồn: ${insertError.message}`);
    else {
      setForm(emptySource);
      setMessage("Đã thêm nguồn vào danh mục kiểm soát.");
      await load();
    }
    setWorking("");
  };

  const toggleSource = async (source, field) => {
    setWorking(source.id);
    const { error: updateError } = await supabase
      .from("legal_calendar_sources")
      .update({ [field]: !source[field] })
      .eq("id", source.id);
    if (updateError) setError(`Không thể cập nhật nguồn: ${updateError.message}`);
    else await load();
    setWorking("");
  };

  const syncNow = async () => {
    setWorking("sync");
    setError("");
    setMessage("");
    try {
      const result = await invokeLegalCalendarSync();
      const failedSources = (result.results || []).filter((item) => item.status === "error");
      if (failedSources.length > 0) {
        const failedNames = failedSources.map((item) => item.source).filter(Boolean).join(", ");
        setError(`Đã quét ${result.sources_checked || 0} nguồn; ${failedSources.length} nguồn không thể truy cập${failedNames ? `: ${failedNames}` : ""}. Chi tiết được lưu tại từng nguồn.`);
      } else {
        setMessage(`Đã quét ${result.sources_checked || 0} nguồn và ghi nhận ${result.candidates_created || 0} cập nhật mới.`);
      }
      await load();
    } catch (syncError) {
      setError(`Không thể quét nguồn: ${syncError.message}`);
    } finally {
      setWorking("");
    }
  };

  const dismiss = async (candidate) => {
    setWorking(candidate.id);
    const { data: session } = await supabase.auth.getSession();
    const { error: updateError } = await supabase.from("legal_calendar_candidates").update({
      status: "dismissed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: session.session?.user?.id || null,
    }).eq("id", candidate.id);
    if (updateError) setError(`Không thể loại cập nhật: ${updateError.message}`);
    else await load();
    setWorking("");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Source Governance</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Nguồn & hàng đợi cập nhật</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Hệ thống chỉ phát hiện thay đổi và bài viết liên quan. Nội dung phải được rà soát, đối chiếu nguồn P1 và duyệt thủ công trước khi công khai.</p>
        </div>
        <button type="button" disabled={working === "sync"} onClick={syncNow} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50">
          {working === "sync" ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Quét nguồn ngay
        </button>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{message}</div>}

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          [ShieldCheck, "Nguồn đang hoạt động", counts.active, "text-emerald-300"],
          [Radar, "Nguồn quét tự động", counts.syncing, "text-cyan-300"],
          [Rss, "Cập nhật chờ duyệt", counts.queue, "text-amber-300"],
        ].map(([Icon, label, value, iconClass]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
            <Icon size={20} className={iconClass} />
            <div className="mt-5 text-3xl font-bold">{value}</div>
            <div className="mt-1 text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <h2 className="text-xl font-semibold">Thêm nguồn theo dõi</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Chỉ thêm trang công khai cho phép truy cập. Hệ thống không vượt đăng nhập, paywall hoặc cơ chế chống truy cập.</p>
        <form onSubmit={addSource} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Tên nguồn</span>
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none" placeholder="Tên cơ quan / website" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Đường dẫn quét</span>
            <input type="url" value={form.sync_url} onChange={(event) => { updateForm("sync_url", event.target.value); if (!form.domain) updateForm("domain", domainFromUrl(event.target.value)); }} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none" placeholder="https://..." />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Tên miền được phép</span>
            <input value={form.domain} onChange={(event) => updateForm("domain", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none" placeholder="example.gov.vn" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Cấp nguồn</span>
            <select value={form.source_tier} onChange={(event) => updateForm("source_tier", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none">
              {sourceTiers.map((item) => <option key={item.value} value={item.value}>{item.vi}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Loại nguồn</span>
            <select value={form.source_kind} onChange={(event) => updateForm("source_kind", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none">
              <option value="official">Nguồn chính thức</option>
              <option value="guidance">Nguồn chuyên môn</option>
              <option value="discovery">Nguồn phát hiện</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Cách quét</span>
            <select value={form.sync_mode} onChange={(event) => updateForm("sync_mode", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none">
              <option value="link_scan">Quét liên kết mới</option>
              <option value="page_watch">Theo dõi thay đổi trang</option>
              <option value="rss">RSS / Atom</option>
              <option value="manual">Chỉ quản lý thủ công</option>
            </select>
          </label>
          <label className="block xl:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Ghi chú quản trị</span>
            <input value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none" />
          </label>
          <div className="md:col-span-2 xl:col-span-4">
            <button type="submit" disabled={working === "add"} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-300/10 px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50">
              {working === "add" ? <Loader2 size={18} className="animate-spin" /> : <FilePlus2 size={18} />} Thêm nguồn
            </button>
          </div>
        </form>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Danh mục nguồn</h2>
            <p className="mt-1 text-sm text-slate-500">Bật/tắt quét tự động mà không xóa lịch sử nguồn.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {loading ? <div className="text-slate-500">Đang tải...</div> : sources.map((source) => (
            <article key={source.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
              <div className="flex gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${source.source_tier === "P1" ? "bg-emerald-300/10 text-emerald-300" : source.source_tier === "P2" ? "bg-cyan-300/10 text-cyan-300" : "bg-amber-300/10 text-amber-300"}`}>
                  <ShieldCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{source.name}</h3>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-400">{source.source_tier}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${source.last_sync_status === "error" ? "border-red-300/15 text-red-200" : "border-emerald-300/15 text-emerald-200"}`}>{source.last_sync_status || "Chưa quét"}</span>
                  </div>
                  <a href={source.homepage_url || source.sync_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-sm text-slate-500 transition hover:text-cyan-200">
                    {source.domain} <ExternalLink size={13} />
                  </a>
                  <div className="mt-3 text-xs leading-relaxed text-slate-600">
                    {source.last_checked_at ? `Lần quét gần nhất: ${formatLegalDateTime(source.last_checked_at, "vi")}` : "Chưa có lịch sử quét"}
                    {source.last_error ? ` · ${source.last_error}` : ""}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                <button type="button" disabled={working === source.id} onClick={() => toggleSource(source, "sync_enabled")} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${source.sync_enabled ? "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200" : "border-white/10 text-slate-500"}`}>
                  {source.sync_enabled ? "Đang quét tự động" : "Đã tắt quét"}
                </button>
                <button type="button" disabled={working === source.id} onClick={() => toggleSource(source, "is_active")} className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${source.is_active ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-white/10 text-slate-500"}`}>
                  {source.is_active ? "Đang hoạt động" : "Đã ngừng sử dụng"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-white/10 pt-10">
        <div>
          <h2 className="text-2xl font-bold">Hàng đợi cập nhật</h2>
          <p className="mt-1 text-sm text-slate-500">Tạo bản nháp để rà soát hoặc loại khỏi hàng đợi. Không có mục nào được tự động công khai.</p>
        </div>
        {candidates.length === 0 ? (
          <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
            <CheckCircle2 size={30} className="mx-auto text-emerald-300" />
            <div className="mt-3 font-semibold">Không có cập nhật đang chờ</div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {candidates.map((candidate) => (
              <article key={candidate.id} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1 font-semibold text-cyan-200">{candidate.legal_calendar_sources?.name || "Nguồn chưa xác định"}</span>
                      <span className="text-slate-600">{candidate.legal_calendar_sources?.source_tier || "P2"} · Phát hiện {formatLegalDateTime(candidate.first_seen_at, "vi")}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold leading-snug">{candidate.title}</h3>
                    {candidate.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{candidate.summary}</p>}
                    <a href={candidate.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 transition hover:text-cyan-100">Mở nguồn <ExternalLink size={13} /></a>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link to={`/admin/legal-calendar/new?candidate=${candidate.id}`} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.06] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
                      <FilePlus2 size={16} /> Tạo bản nháp
                    </Link>
                    <button type="button" disabled={working === candidate.id} onClick={() => dismiss(candidate)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-red-200/20 hover:text-red-200 disabled:opacity-50">
                      <Ban size={16} /> Loại
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
