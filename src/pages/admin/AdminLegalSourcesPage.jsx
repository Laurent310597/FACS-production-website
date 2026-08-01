import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CheckCircle2,
  Download,
  ExternalLink,
  FilePlus2,
  FileSpreadsheet,
  Loader2,
  Radar,
  RefreshCw,
  Rss,
  ShieldCheck,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  formatLegalDateTime,
  invokeLegalCalendarImport,
  invokeLegalCalendarSync,
  sourceTiers,
} from "../../lib/legalCalendar";
import { readLegalCalendarImportFile } from "../../lib/legalCalendarImport";
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

function currentYearRange() {
  const year = new Date().getFullYear();
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export default function AdminLegalSourcesPage() {
  const [sources, setSources] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(emptySource);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(() => currentYearRange().start);
  const [endDate, setEndDate] = useState(() => currentYearRange().end);
  const [importFile, setImportFile] = useState(null);
  const [scanResult, setScanResult] = useState(null);

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
    if (!startDate || !endDate || endDate < startDate) {
      setError("Vui lòng chọn khoảng ngày hợp lệ; ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
      return;
    }
    setWorking("sync");
    setError("");
    setMessage("");
    setScanResult(null);
    try {
      const result = await invokeLegalCalendarSync({ startDate, endDate });
      setScanResult(result);
      const failedSources = (result.results || []).filter((item) => item.status === "error");
      if (failedSources.length > 0) {
        const failedNames = failedSources.map((item) => item.source).filter(Boolean).join(", ");
        setError(`Đã quét ${result.sources_checked || 0} nguồn và tạo ${result.drafts_created || 0} thẻ; ${failedSources.length} nguồn không thể truy cập${failedNames ? `: ${failedNames}` : ""}. Chi tiết được lưu tại từng nguồn.`);
      } else if (!result.ai_configured) {
        setError(`Đã quét ${result.sources_checked || 0} nguồn nhưng chưa thể biên soạn thẻ song ngữ vì Supabase chưa có GROQ_API_KEY hoặc OPENAI_API_KEY. ${result.candidates_created || 0} kết quả thô đã được giữ lại.`);
      } else {
        setMessage(`Đã quét ${result.sources_checked || 0} nguồn trong khoảng ${startDate} – ${endDate}; tạo ${result.drafts_created || 0} thẻ đã phân loại và biên soạn song ngữ, bỏ qua ${result.duplicates_skipped || 0} mục trùng.`);
      }
      await load();
    } catch (syncError) {
      setError(`Không thể quét nguồn: ${syncError.message}`);
    } finally {
      setWorking("");
    }
  };

  const importCalendarFile = async () => {
    setError("");
    setMessage("");
    setWorking("import");
    try {
      const parsed = await readLegalCalendarImportFile(importFile);
      if (parsed.errors.length > 0) {
        setError(`Không thể nhập file:\n${parsed.errors.slice(0, 8).join("\n")}${parsed.errors.length > 8 ? `\n... và ${parsed.errors.length - 8} lỗi khác.` : ""}`);
        return;
      }
      const result = await invokeLegalCalendarImport(parsed.rows, importFile.name);
      const warning = (result.warnings || []).join(" ");
      setMessage(`Đã đọc ${result.rows_received || 0} dòng; tạo ${result.drafts_created || 0} thẻ, bỏ qua ${result.duplicates_skipped || 0} mục trùng. ${result.ready || 0} thẻ đã đủ nội dung tối thiểu.${warning ? ` Lưu ý: ${warning}` : ""}`);
      setImportFile(null);
      await load();
    } catch (importError) {
      setError(`Không thể nhập lịch: ${importError.message}`);
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
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Nguồn & nhập lịch pháp lý</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Quét theo khoảng ngày hoặc nhập Excel/CSV. Kết quả hợp lệ được tự phân loại và tạo sẵn thẻ nội dung Việt–Anh trong CMS.</p>
        </div>
        <Link to="/admin/legal-calendar" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/10">
          <FilePlus2 size={18} /> Xem các thẻ đã tạo
        </Link>
      </div>

      {error && <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{message}</div>}

      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <section className="rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.045] p-5 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><WandSparkles size={21} /></div>
            <div>
              <h2 className="text-xl font-semibold">Quét và biên soạn theo khoảng ngày</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Phạm vi áp dụng cho ngày đến hạn của nghĩa vụ, tối đa 371 ngày mỗi lần. Kết quả được tạo trực tiếp thành thẻ bản nháp, không cần duyệt từng kết quả thô rồi tạo lại.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Từ ngày</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Đến ngày</span>
              <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" />
            </label>
          </div>
          <button type="button" disabled={working === "sync" || working === "import"} onClick={syncNow} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:opacity-50 sm:w-auto">
            {working === "sync" ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Quét & tạo thẻ song ngữ
          </button>
          {scanResult && (
            <div className="mt-6 border-t border-cyan-200/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-cyan-100">Kết quả lần quét gần nhất</h3>
                  <p className="mt-1 text-xs text-slate-500">Mỗi nguồn đều có kết quả riêng, kể cả khi không phát sinh thẻ mới.</p>
                </div>
                <Link to="/admin/legal-calendar" className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 px-3.5 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/10">
                  <FilePlus2 size={15} /> Kiểm tra thẻ đã tạo
                </Link>
              </div>
              <div className="mt-4 grid gap-2">
                {(scanResult.results || []).map((item, index) => {
                  const statusLabel = item.status === "ok"
                    ? "Đã xử lý"
                    : item.status === "unchanged"
                      ? "Không có thay đổi"
                      : item.status === "ai_unavailable"
                        ? "Chưa biên soạn AI"
                        : "Có lỗi";
                  return (
                    <div key={`${item.source || "source"}-${index}`} className="rounded-2xl border border-white/10 bg-[#081321]/55 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-200">{item.source || `Nguồn ${index + 1}`}</span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.status === "error" ? "border-red-300/20 text-red-200" : item.status === "unchanged" ? "border-slate-300/15 text-slate-400" : "border-emerald-300/20 text-emerald-200"}`}>{statusLabel}</span>
                      </div>
                      <div className="mt-2 text-xs leading-relaxed text-slate-500">
                        {item.status === "ok" && <>AI nhận diện {item.prepared || 0} mốc · Tạo mới {item.drafts_created || 0} thẻ · Trùng {item.duplicates || 0}</>}
                        {item.status === "unchanged" && <>Nội dung nguồn và phạm vi ngày giống lần quét trước; hệ thống không tạo lại thẻ trùng.</>}
                        {item.status === "ai_unavailable" && <>Đã giữ {item.candidates_created || 0} kết quả thô để kiểm tra sau.</>}
                        {item.status === "error" && <>{item.error || "Không thể truy cập hoặc xử lý nguồn này."}</>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-violet-300/15 bg-violet-300/[0.04] p-5 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><FileSpreadsheet size={21} /></div>
            <div>
              <h2 className="text-xl font-semibold">Nhập lịch từ Excel hoặc CSV</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">Hệ thống ghi nhận ngày, nội dung, đối tượng và cơ sở pháp lý riêng cho tiếng Việt và tiếng Anh; các ô còn thiếu được biên soạn bổ sung khi có dữ liệu nguồn.</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-[#081321]/45 p-4">
            <input
              key={importFile?.name || "empty-import"}
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(event) => setImportFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-300/10 file:px-4 file:py-2.5 file:font-semibold file:text-violet-100 hover:file:bg-violet-300/15"
            />
            <div className="mt-3 text-xs text-slate-500">Tối đa 500 dòng và 5 MB mỗi lần nhập.</div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={!importFile || working === "import" || working === "sync"} onClick={importCalendarFile} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-300 px-5 py-3 font-bold text-[#151029] transition hover:-translate-y-0.5 hover:bg-violet-200 disabled:opacity-40">
              {working === "import" ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />} Upload & tạo thẻ
            </button>
            <a href="/templates/facs-legal-calendar-import-template.xlsx" download className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-300 transition hover:border-violet-200/25 hover:text-violet-100">
              <Download size={17} /> Tải file Excel mẫu
            </a>
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {[
          [ShieldCheck, "Nguồn đang hoạt động", counts.active, "text-emerald-300"],
          [Radar, "Nguồn quét tự động", counts.syncing, "text-cyan-300"],
          [Rss, "Kết quả chưa đủ dữ liệu", counts.queue, "text-amber-300"],
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
          <h2 className="text-2xl font-bold">Kết quả chưa đủ dữ liệu</h2>
          <p className="mt-1 text-sm text-slate-500">Chỉ hiển thị các mục mà hệ thống chưa xác định được ngày hoặc nội dung cần thiết. Các mục đã biên soạn nằm trực tiếp tại “Mốc pháp lý”; phần này không bắt buộc phải xử lý từng dòng.</p>
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
