import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  Search,
  UploadCloud,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  agingFilters,
  formatArDate,
  formatArDateTime,
  formatVnd,
  getInvoiceAging,
  importArInvoices,
  setArInvoicePaid,
  summarizeAr,
  todayInVietnam,
} from "../../lib/ar";
import { readArInvoiceFile, sha256File } from "../../lib/arImport";
import { supabase } from "../../lib/supabaseClient";

const PAGE_SIZE = 25;

const toneClasses = {
  cyan: "border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-200",
  emerald: "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200",
  amber: "border-amber-300/20 bg-amber-300/[0.07] text-amber-200",
  orange: "border-orange-300/20 bg-orange-300/[0.07] text-orange-200",
  red: "border-red-300/20 bg-red-300/[0.07] text-red-200",
  slate: "border-white/10 bg-white/[0.05] text-slate-300",
};

function StatCard({ icon: Icon, label, value, note, tone = "cyan" }) {
  return (
    <div className={`rounded-[24px] border p-5 ${toneClasses[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <Icon size={21} />
        <span className="text-right text-2xl font-black text-white">{value}</span>
      </div>
      <div className="mt-5 text-sm font-semibold text-slate-200">{label}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-500">{note}</div>
    </div>
  );
}

function AgingBadge({ invoice }) {
  const aging = getInvoiceAging(invoice);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${toneClasses[aging.tone]}`}>{aging.label}</span>;
}

function PaymentModal({ invoice, onClose, onSaved }) {
  const reopening = invoice.is_paid;
  const [paidAt, setPaidAt] = useState(invoice.paid_at || todayInVietnam());
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (reopening && note.trim().length < 3) {
      setError("Vui lòng nhập lý do hoàn tác trạng thái đã thu.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      await setArInvoicePaid(invoice.id, !reopening, reopening ? null : paidAt, note);
      onSaved(reopening ? "Đã mở lại khoản phải thu và lưu lý do." : "Đã ghi nhận hóa đơn đã thu tiền.");
    } catch (saveError) {
      setError(`Không thể cập nhật: ${saveError.message}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030a12]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
      <form onSubmit={submit} className="w-full max-w-lg rounded-[28px] border border-white/12 bg-[#101d30] p-6 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">AR Collection</div>
            <h2 id="payment-modal-title" className="mt-2 text-2xl font-bold">{reopening ? "Hoàn tác trạng thái đã thu" : "Xác nhận đã thu tiền"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Đóng"><X size={18} /></button>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#081321]/60 p-4 text-sm">
          <div className="font-semibold text-white">{invoice.ar_customers?.legal_name}</div>
          <div className="mt-1 text-slate-400">Hóa đơn {invoice.invoice_series ? `${invoice.invoice_series} · ` : ""}{invoice.invoice_number}</div>
          <div className="mt-3 text-xl font-black text-cyan-200">{formatVnd(invoice.total_amount)}</div>
        </div>

        {!reopening && <label className="mt-5 block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Ngày thu tiền</span>
          <input type="date" required value={paidAt} max={todayInVietnam()} onChange={(event) => setPaidAt(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" />
        </label>}

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">{reopening ? "Lý do hoàn tác" : "Ghi chú đối soát (không bắt buộc)"}</span>
          <textarea rows={3} required={reopening} value={note} onChange={(event) => setNote(event.target.value)} placeholder={reopening ? "Ví dụ: tick nhầm khách hàng hoặc giao dịch chưa vào tài khoản..." : "Ví dụ: đã kiểm tra sao kê ngày..."} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" />
        </label>

        {error && <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-300 hover:text-white">Hủy</button>
          <button type="submit" disabled={working} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold disabled:opacity-50 ${reopening ? "bg-amber-300 text-[#171006]" : "bg-emerald-300 text-[#06150f]"}`}>
            {working ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
            {reopening ? "Xác nhận hoàn tác" : "Xác nhận đã thu"}
          </button>
        </div>
      </form>
    </div>
  );
}

function invoiceAuditLabel(event) {
  if (event.entity_type === "customer") return event.action === "insert" ? "Tạo khách hàng" : "Cập nhật khách hàng";
  if (event.action === "insert") return "Nhập hóa đơn Viettel";
  const wasPaid = Boolean(event.before_data?.is_paid);
  const isPaid = Boolean(event.after_data?.is_paid);
  if (!wasPaid && isPaid) return "Đánh dấu đã thu";
  if (wasPaid && !isPaid) return "Mở lại công nợ";
  return "Cập nhật hóa đơn";
}

export default function AdminARPage() {
  const [invoices, setInvoices] = useState([]);
  const [imports, setImports] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [agingFilter, setAgingFilter] = useState("all");
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importHash, setImportHash] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [invoiceResult, importResult, auditResult] = await Promise.all([
      supabase
        .from("ar_invoices")
        .select("*, ar_customers(id,legal_name,tax_code,primary_email)")
        .order("invoice_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("ar_import_runs").select("*").order("imported_at", { ascending: false }).limit(10),
      supabase.from("ar_audit_events").select("*").order("occurred_at", { ascending: false }).limit(20),
    ]);
    const failures = [invoiceResult.error, importResult.error, auditResult.error].filter(Boolean);
    if (failures.length) setError(`Không thể tải AR Tracker: ${failures[0].message}`);
    else {
      setInvoices(invoiceResult.data || []);
      setImports(importResult.data || []);
      setAuditEvents(auditResult.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const metrics = useMemo(() => summarizeAr(invoices), [invoices]);
  const months = useMemo(() => [...new Set(invoices.map((item) => item.invoice_date?.slice(0, 7)).filter(Boolean))].sort().reverse(), [invoices]);
  const filteredInvoices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const aging = getInvoiceAging(invoice);
      const matchesSearch = !normalized || `${invoice.invoice_series} ${invoice.invoice_number} ${invoice.description || ""} ${invoice.ar_customers?.legal_name || ""} ${invoice.ar_customers?.tax_code || ""}`.toLowerCase().includes(normalized);
      const matchesMonth = month === "all" || invoice.invoice_date?.startsWith(month);
      const matchesStatus = agingFilter === "all"
        || (agingFilter === "unpaid" && !invoice.is_paid && invoice.source_status !== "cancelled")
        || aging.key === agingFilter;
      return matchesSearch && matchesMonth && matchesStatus;
    });
  }, [invoices, query, month, agingFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const effectivePage = Math.min(page, pageCount);
  const visibleInvoices = filteredInvoices.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE);

  const previewImport = async () => {
    setParsing(true);
    setError("");
    setNotice("");
    try {
      const [parsed, hash] = await Promise.all([readArInvoiceFile(importFile), sha256File(importFile)]);
      setImportPreview(parsed);
      setImportHash(hash);
    } catch (previewError) {
      setImportPreview(null);
      setError(`Không thể đọc file: ${previewError.message}`);
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview?.rows.length || importPreview.errors.length) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await importArInvoices(importPreview.rows, importFile.name, importHash);
      setNotice(`Đã nhập ${result.records_created || 0} hóa đơn mới, cập nhật ${result.records_updated || 0} trạng thái Viettel, bỏ qua ${result.duplicates_skipped || 0} hóa đơn không thay đổi và tạo ${result.customers_created || 0} khách hàng mới. Tổng giá trị mới: ${formatVnd(result.total_amount)}.`);
      setImportFile(null);
      setImportPreview(null);
      setImportHash("");
      setShowImport(false);
      await load();
    } catch (importError) {
      setError(`Không thể ghi dữ liệu: ${importError.message}`);
    } finally {
      setImporting(false);
    }
  };

  const paymentSaved = async (message) => {
    setPaymentInvoice(null);
    setNotice(message);
    await load();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Accounts Receivable</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Quản lý công nợ phải thu</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Viettel là nguồn hóa đơn chính thức. CMS tổng hợp số dư và ghi nhận trạng thái thu tiền do người dùng xác nhận.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 transition hover:border-cyan-200/30 disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Làm mới</button>
          <Link to="/admin/ar/customers" className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] px-5 py-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/10"><Users size={17} /> Customer Master</Link>
          <button type="button" onClick={() => setShowImport((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:bg-cyan-200"><UploadCloud size={17} /> Import Viettel</button>
        </div>
      </div>

      {error && <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{notice}</div>}

      {showImport && <section className="mt-7 rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.045] p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">Kiểm tra file hóa đơn Viettel</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Sử dụng báo cáo có một dòng cho mỗi hóa đơn. Dữ liệu chỉ được ghi sau khi file được kiểm tra và anh bấm xác nhận.</p>
          </div>
          <a href="/templates/facs-ar-import-template.csv" download className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"><FileSpreadsheet size={17} /> Tải cấu trúc tham khảo</a>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#081321]/45 px-4 py-3 text-sm text-slate-300 hover:border-cyan-200/30">
            <FileSpreadsheet size={19} className="text-cyan-300" />
            <span className="min-w-0 truncate">{importFile?.name || "Chọn file .xlsx hoặc .csv"}</span>
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => { setImportFile(event.target.files?.[0] || null); setImportPreview(null); }} />
          </label>
          <button type="button" disabled={!importFile || parsing} onClick={previewImport} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 px-5 py-3 font-bold text-cyan-100 disabled:opacity-40">
            {parsing ? <Loader2 size={17} className="animate-spin" /> : <FileCheck2 size={17} />} Kiểm tra file
          </button>
        </div>

        {importPreview && <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-slate-500">Dòng tiêu đề nhận diện</div><div className="mt-1 text-xl font-black">{importPreview.headerRow || "—"}</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-slate-500">Hóa đơn đọc được</div><div className="mt-1 text-xl font-black">{importPreview.rows.length}</div></div>
            <div className={`rounded-2xl border p-4 ${importPreview.errors.length ? toneClasses.red : toneClasses.emerald}`}><div className="text-xs opacity-70">Kết quả</div><div className="mt-1 font-bold">{importPreview.errors.length ? `${importPreview.errors.length} lỗi cần sửa` : "Đủ điều kiện nhập"}</div></div>
          </div>
          {importPreview.errors.length > 0 && <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-200"><strong>Lỗi:</strong><ul className="mt-2 list-disc space-y-1 pl-5">{importPreview.errors.slice(0, 10).map((item) => <li key={item}>{item}</li>)}</ul>{importPreview.errors.length > 10 && <div className="mt-2">... và {importPreview.errors.length - 10} lỗi khác.</div>}</div>}
          {importPreview.warnings.length > 0 && <details className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100"><summary className="cursor-pointer font-semibold">{importPreview.warnings.length} lưu ý cần rà soát</summary><ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-amber-100/80">{importPreview.warnings.slice(0, 30).map((item) => <li key={item}>{item}</li>)}</ul></details>}
          {importPreview.rows.length > 0 && <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-[#081321]/85 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Dòng</th><th className="px-4 py-3">Hóa đơn</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">MST</th><th className="px-4 py-3 text-right">Tổng thanh toán</th></tr></thead>
              <tbody className="divide-y divide-white/8">{importPreview.rows.slice(0, 20).map((row) => <tr key={`${row.row_number}-${row.invoice_number}`}><td className="px-4 py-3 text-slate-500">{row.row_number}</td><td className="px-4 py-3 font-semibold text-white">{row.invoice_series ? `${row.invoice_series} · ` : ""}{row.invoice_number}</td><td className="px-4 py-3 text-slate-300">{formatArDate(row.invoice_date)}</td><td className="px-4 py-3 text-slate-300">{row.customer_name || "—"}</td><td className="px-4 py-3 text-slate-400">{row.tax_code || "—"}</td><td className="px-4 py-3 text-right font-semibold text-cyan-100">{formatVnd(row.total_amount)}</td></tr>)}</tbody>
            </table>
            {importPreview.rows.length > 20 && <div className="border-t border-white/10 px-4 py-3 text-center text-xs text-slate-500">Đang xem 20/{importPreview.rows.length} dòng.</div>}
          </div>}
          <div className="mt-5 flex justify-end"><button type="button" onClick={confirmImport} disabled={importing || importPreview.errors.length > 0 || !importPreview.rows.length} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-bold text-[#06150f] disabled:cursor-not-allowed disabled:opacity-40">{importing ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Xác nhận nhập {importPreview.rows.length} hóa đơn</button></div>
        </div>}
      </section>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CircleDollarSign} label="Tổng AR hiện tại" value={formatVnd(metrics.totalOutstanding)} note={`${metrics.customersOutstanding} khách hàng đang còn số dư`} />
        <StatCard icon={Clock3} label="Chưa đến hạn" value={formatVnd(metrics.current)} note="Bao gồm các khoản đến hạn hôm nay" tone="emerald" />
        <StatCard icon={AlertTriangle} label="Quá hạn 1–30 ngày" value={formatVnd(metrics.overdue1To30)} note="Cần ưu tiên rà soát và nhắc nợ" tone="amber" />
        <StatCard icon={AlertTriangle} label="Quá hạn trên 30 ngày" value={formatVnd(metrics.overdue31To60 + metrics.overdue61Plus)} note={`${formatVnd(metrics.overdue61Plus)} quá hạn trên 60 ngày`} tone="red" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Đã thu trong tháng" value={formatVnd(metrics.paidThisMonth)} note="Theo ngày thu tiền được xác nhận" tone="emerald" />
        <StatCard icon={Users} label="Khách hàng còn công nợ" value={metrics.customersOutstanding} note="Được tính theo các hóa đơn chưa thu" />
        <StatCard icon={UserRoundX} label="Khách hàng thiếu email" value={metrics.missingEmail} note="Cần bổ sung trong Customer Master" tone="amber" />
        <StatCard icon={FileSpreadsheet} label="Tổng hóa đơn quản lý" value={invoices.length} note={`${imports.filter((item) => item.source_type === "viettel_invoices").length} lần import gần đây`} />
      </div>

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div><h2 className="text-xl font-bold">Danh sách công nợ</h2><p className="mt-1 text-sm text-slate-500">Tick trạng thái chỉ sau khi đã kiểm tra giao dịch thu tiền.</p></div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[760px]">
            <label className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Khách hàng, MST, số HĐ..." className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" /></label>
            <select value={agingFilter} onChange={(event) => { setAgingFilter(event.target.value); setPage(1); }} className="rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35">{agingFilters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={month} onChange={(event) => { setMonth(event.target.value); setPage(1); }} className="rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35"><option value="all">Tất cả kỳ hóa đơn</option>{months.map((item) => <option key={item} value={item}>Tháng {item.slice(5, 7)}/{item.slice(0, 4)}</option>)}</select>
          </div>
        </div>

        {loading ? <div className="mt-6 flex items-center justify-center gap-3 py-20 text-slate-500"><Loader2 size={20} className="animate-spin" /> Đang tải công nợ...</div> : visibleInvoices.length === 0 ? <div className="mt-6 rounded-2xl border border-white/8 bg-[#081321]/35 px-5 py-14 text-center text-sm text-slate-500">Chưa có hóa đơn phù hợp với bộ lọc.</div> : <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-[#081321]/85 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 text-center">Đã thu</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Hóa đơn</th><th className="px-4 py-3">Ngày HĐ</th><th className="px-4 py-3">Hạn TT</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Tổng tiền</th><th className="px-4 py-3 text-right">Số dư</th></tr></thead>
            <tbody className="divide-y divide-white/8">{visibleInvoices.map((invoice) => <tr key={invoice.id} className="transition hover:bg-white/[0.025]">
              <td className="px-4 py-4 text-center"><input type="checkbox" checked={invoice.is_paid} disabled={invoice.source_status === "cancelled"} onChange={() => setPaymentInvoice(invoice)} className="h-5 w-5 cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Cập nhật thanh toán hóa đơn ${invoice.invoice_number}`} /></td>
              <td className="max-w-[280px] px-4 py-4"><div className="truncate font-semibold text-white" title={invoice.ar_customers?.legal_name}>{invoice.ar_customers?.legal_name || "—"}</div><div className="mt-1 text-xs text-slate-500">{invoice.ar_customers?.tax_code || "Chưa có MST"}{invoice.ar_customers?.primary_email ? ` · ${invoice.ar_customers.primary_email}` : " · Thiếu email"}</div></td>
              <td className="px-4 py-4"><div className="font-semibold text-cyan-100">{invoice.invoice_series ? `${invoice.invoice_series} · ` : ""}{invoice.invoice_number}</div><div className="mt-1 max-w-[220px] truncate text-xs text-slate-500" title={invoice.description}>{invoice.description || "Không có diễn giải"}</div></td>
              <td className="px-4 py-4 text-slate-300">{formatArDate(invoice.invoice_date)}</td>
              <td className="px-4 py-4 text-slate-300">{formatArDate(invoice.due_date)}</td>
              <td className="px-4 py-4"><AgingBadge invoice={invoice} />{invoice.is_paid && <div className="mt-1 text-[11px] text-slate-500">{formatArDate(invoice.paid_at)}</div>}</td>
              <td className="px-4 py-4 text-right font-semibold text-slate-200">{formatVnd(invoice.total_amount)}</td>
              <td className={`px-4 py-4 text-right font-black ${Number(invoice.outstanding_amount) ? "text-cyan-200" : "text-slate-600"}`}>{formatVnd(invoice.outstanding_amount)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Hiển thị {visibleInvoices.length} / {filteredInvoices.length} hóa đơn</span><div className="flex items-center gap-3"><button type="button" disabled={effectivePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Trước</button><span>Trang {effectivePage}/{pageCount}</span><button type="button" disabled={effectivePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Sau</button></div></div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3"><FileSpreadsheet size={20} className="text-cyan-300" /><div><h2 className="text-lg font-bold">Lịch sử import</h2><p className="text-xs text-slate-500">10 lần gần nhất</p></div></div>
          <div className="mt-5 divide-y divide-white/8">{imports.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Chưa có lịch sử import.</div> : imports.map((item) => <div key={item.id} className="flex items-start gap-4 py-4"><div className="rounded-xl bg-cyan-300/8 p-2 text-cyan-300"><FileCheck2 size={17} /></div><div className="min-w-0 flex-1"><div className="truncate font-semibold text-slate-200">{item.file_name}</div><div className="mt-1 text-xs text-slate-500">{item.source_type === "customer_master" ? "Customer Master" : "Hóa đơn Viettel"} · {formatArDateTime(item.imported_at)}</div><div className="mt-2 text-xs text-slate-400">Tạo {item.records_created} · Cập nhật {item.records_updated} · Bỏ qua {item.duplicates_skipped}</div></div></div>)}</div>
        </section>
        <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
          <div className="flex items-center gap-3"><History size={20} className="text-cyan-300" /><div><h2 className="text-lg font-bold">Nhật ký thay đổi</h2><p className="text-xs text-slate-500">20 sự kiện gần nhất</p></div></div>
          <div className="mt-5 divide-y divide-white/8">{auditEvents.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Chưa có thay đổi được ghi nhận.</div> : auditEvents.map((item) => <div key={item.id} className="flex items-start gap-4 py-4"><div className="rounded-xl bg-white/[0.05] p-2 text-slate-400"><History size={16} /></div><div className="min-w-0"><div className="font-semibold text-slate-200">{invoiceAuditLabel(item)}</div><div className="mt-1 text-xs text-slate-500">{item.actor_email || "Người dùng CMS"} · {formatArDateTime(item.occurred_at)}</div></div></div>)}</div>
        </section>
      </div>

      {paymentInvoice && <PaymentModal invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} onSaved={paymentSaved} />}
    </AdminLayout>
  );
}
