import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { formatVnd, importArCustomers } from "../../lib/ar";
import { readArCustomerFile, sha256File } from "../../lib/arImport";
import { supabase } from "../../lib/supabaseClient";

const emptyCustomer = {
  customer_code: "",
  legal_name: "",
  tax_code: "",
  address: "",
  contact_name: "",
  primary_email: "",
  cc_emails: "",
  payment_terms_days: 30,
  preferred_language: "bilingual",
  is_active: true,
  notes: "",
};

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState(() => customer ? {
    ...emptyCustomer,
    ...customer,
    cc_emails: (customer.cc_emails || []).join("; "),
  } : emptyCustomer);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setError("");
    if (form.legal_name.trim().length < 2) {
      setError("Vui lòng nhập tên khách hàng.");
      return;
    }
    if (form.primary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primary_email.trim())) {
      setError("Email kế toán không hợp lệ.");
      return;
    }
    const ccEmails = [...new Set(form.cc_emails.split(/[;,\n]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))];
    const invalidCc = ccEmails.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalidCc) {
      setError(`Email CC “${invalidCc}” không hợp lệ.`);
      return;
    }

    setWorking(true);
    const payload = {
      customer_code: form.customer_code.trim() || null,
      legal_name: form.legal_name.trim(),
      tax_code: form.tax_code.trim() || null,
      address: form.address.trim() || null,
      contact_name: form.contact_name.trim() || null,
      primary_email: form.primary_email.trim().toLowerCase() || null,
      cc_emails: ccEmails,
      payment_terms_days: Number(form.payment_terms_days),
      preferred_language: form.preferred_language,
      is_active: Boolean(form.is_active),
      notes: form.notes.trim() || null,
    };
    const result = customer
      ? await supabase.from("ar_customers").update(payload).eq("id", customer.id)
      : await supabase.from("ar_customers").insert(payload);
    if (result.error) setError(`Không thể lưu khách hàng: ${result.error.message}`);
    else onSaved(customer ? "Đã cập nhật Customer Master." : "Đã thêm khách hàng vào Customer Master.");
    setWorking(false);
  };

  const fieldClass = "w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#030a12]/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
      <form onSubmit={save} className="my-auto w-full max-w-3xl rounded-[28px] border border-white/12 bg-[#101d30] p-6 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Customer Master</div><h2 id="customer-modal-title" className="mt-2 text-2xl font-bold">{customer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng"}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Đóng"><X size={18} /></button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-200">Tên pháp lý *</span><input required value={form.legal_name} onChange={(event) => update("legal_name", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Mã khách hàng</span><input value={form.customer_code} onChange={(event) => update("customer_code", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Mã số thuế</span><input value={form.tax_code} onChange={(event) => update("tax_code", event.target.value)} className={fieldClass} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-200">Địa chỉ</span><input value={form.address} onChange={(event) => update("address", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Người liên hệ</span><input value={form.contact_name} onChange={(event) => update("contact_name", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Email kế toán</span><input type="email" value={form.primary_email} onChange={(event) => update("primary_email", event.target.value)} className={fieldClass} /></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-200">Email CC</span><input value={form.cc_emails} onChange={(event) => update("cc_emails", event.target.value)} placeholder="email1@company.com; email2@company.com" className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Số ngày thanh toán</span><input type="number" min="0" max="365" required value={form.payment_terms_days} onChange={(event) => update("payment_terms_days", event.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-200">Ngôn ngữ email</span><select value={form.preferred_language} onChange={(event) => update("preferred_language", event.target.value)} className={fieldClass}><option value="bilingual">Song ngữ</option><option value="vi">Tiếng Việt</option><option value="en">English</option></select></label>
          <label className="block md:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-200">Ghi chú</span><textarea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} className={`${fieldClass} resize-y`} /></label>
          <label className="flex items-center gap-3 md:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-5 w-5 accent-cyan-300" /><span className="text-sm font-semibold text-slate-200">Khách hàng đang hoạt động</span></label>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-300 hover:text-white">Hủy</button><button type="submit" disabled={working} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] disabled:opacity-50">{working ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Lưu Customer Master</button></div>
      </form>
    </div>
  );
}

export default function AdminARCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [editing, setEditing] = useState(undefined);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileHash, setFileHash] = useState("");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("ar_customers")
      .select("*, ar_invoices(id,outstanding_amount,is_paid,source_status)")
      .order("legal_name");
    if (fetchError) setError(`Không thể tải Customer Master: ${fetchError.message}`);
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const enrichedCustomers = useMemo(() => customers.map((customer) => {
    const activeInvoices = (customer.ar_invoices || []).filter((item) => item.source_status !== "cancelled" && !item.is_paid);
    return {
      ...customer,
      invoice_count: customer.ar_invoices?.length || 0,
      outstanding: activeInvoices.reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0),
    };
  }), [customers]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return enrichedCustomers.filter((customer) => {
      const matchesQuery = !normalized || `${customer.legal_name} ${customer.tax_code || ""} ${customer.customer_code || ""} ${customer.primary_email || ""}`.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || (status === "active" && customer.is_active) || (status === "inactive" && !customer.is_active) || (status === "missing_email" && !customer.primary_email);
      return matchesQuery && matchesStatus;
    });
  }, [enrichedCustomers, query, status]);

  const totals = useMemo(() => ({
    active: customers.filter((item) => item.is_active).length,
    missingEmail: customers.filter((item) => !item.primary_email).length,
    outstanding: enrichedCustomers.reduce((sum, item) => sum + item.outstanding, 0),
  }), [customers, enrichedCustomers]);

  const previewImport = async () => {
    setParsing(true);
    setError("");
    setNotice("");
    try {
      const [parsed, hash] = await Promise.all([readArCustomerFile(importFile), sha256File(importFile)]);
      setPreview(parsed);
      setFileHash(hash);
    } catch (previewError) {
      setPreview(null);
      setError(`Không thể đọc file: ${previewError.message}`);
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!preview?.rows.length || preview.errors.length) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await importArCustomers(preview.rows, importFile.name, fileHash);
      setNotice(`Đã tạo ${result.records_created || 0} khách hàng và cập nhật ${result.records_updated || 0} khách hàng hiện có.`);
      setImportFile(null);
      setPreview(null);
      setFileHash("");
      setShowImport(false);
      await load();
    } catch (importError) {
      setError(`Không thể nhập Customer Master: ${importError.message}`);
    } finally {
      setImporting(false);
    }
  };

  const saved = async (message) => {
    setEditing(undefined);
    setNotice(message);
    await load();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link to="/admin/ar" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"><ArrowLeft size={16} /> AR Dashboard</Link>
          <h1 className="mt-4 text-3xl font-bold md:text-4xl">Customer Master</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Thông tin khách hàng, email kế toán và điều khoản thanh toán dùng cho AR Tracker.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowImport((current) => !current)} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] px-5 py-3 font-semibold text-cyan-100 hover:bg-cyan-300/10"><FileSpreadsheet size={17} /> Import Master Data</button>
          <button type="button" onClick={() => setEditing(null)} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] hover:bg-cyan-200"><Plus size={17} /> Thêm khách hàng</button>
        </div>
      </div>

      {error && <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{notice}</div>}

      {showImport && <section className="mt-7 rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.045] p-5 md:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-bold">Import Google Sheet Master Data</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Tải Sheet xuống dạng Excel/CSV. Hệ thống đối chiếu theo MST, sau đó theo tên pháp lý; bản ghi hiện có sẽ được cập nhật thay vì tạo trùng.</p></div><a href="/templates/facs-ar-customer-master-template.csv" download className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"><FileSpreadsheet size={17} /> Tải cấu trúc tham khảo</a></div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#081321]/45 px-4 py-3 text-sm text-slate-300 hover:border-cyan-200/30"><FileSpreadsheet size={19} className="text-cyan-300" /><span className="min-w-0 truncate">{importFile?.name || "Chọn file .xlsx hoặc .csv"}</span><input type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => { setImportFile(event.target.files?.[0] || null); setPreview(null); }} /></label>
          <button type="button" disabled={!importFile || parsing} onClick={previewImport} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/20 px-5 py-3 font-bold text-cyan-100 disabled:opacity-40">{parsing ? <Loader2 size={17} className="animate-spin" /> : <FileCheck2 size={17} />} Kiểm tra file</button>
        </div>
        {preview && <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-slate-500">Dòng tiêu đề</div><div className="mt-1 text-xl font-black">{preview.headerRow || "—"}</div></div><div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className="text-xs text-slate-500">Khách hàng đọc được</div><div className="mt-1 text-xl font-black">{preview.rows.length}</div></div><div className={`rounded-2xl border p-4 ${preview.errors.length ? "border-red-300/20 bg-red-400/8 text-red-200" : "border-emerald-300/20 bg-emerald-400/8 text-emerald-200"}`}><div className="text-xs opacity-70">Kết quả</div><div className="mt-1 font-bold">{preview.errors.length ? `${preview.errors.length} lỗi cần sửa` : "Đủ điều kiện nhập"}</div></div></div>
          {preview.errors.length > 0 && <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-200"><ul className="list-disc space-y-1 pl-5">{preview.errors.slice(0, 10).map((item) => <li key={item}>{item}</li>)}</ul></div>}
          {preview.warnings.length > 0 && <details className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-100"><summary className="cursor-pointer font-semibold">{preview.warnings.length} lưu ý cần rà soát</summary><ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-amber-100/80">{preview.warnings.slice(0, 30).map((item) => <li key={item}>{item}</li>)}</ul></details>}
          {preview.rows.length > 0 && <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-[#081321]/85 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Dòng</th><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">MST</th><th className="px-4 py-3">Email kế toán</th><th className="px-4 py-3">Điều khoản</th></tr></thead><tbody className="divide-y divide-white/8">{preview.rows.slice(0, 20).map((row) => <tr key={`${row.row_number}-${row.legal_name}`}><td className="px-4 py-3 text-slate-500">{row.row_number}</td><td className="px-4 py-3 font-semibold text-white">{row.legal_name}</td><td className="px-4 py-3 text-slate-400">{row.tax_code || "—"}</td><td className="px-4 py-3 text-slate-300">{row.primary_email || "—"}</td><td className="px-4 py-3 text-slate-300">{row.payment_terms_days} ngày</td></tr>)}</tbody></table></div>}
          <div className="mt-5 flex justify-end"><button type="button" onClick={confirmImport} disabled={importing || preview.errors.length > 0 || !preview.rows.length} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-bold text-[#06150f] disabled:opacity-40">{importing ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Xác nhận nhập {preview.rows.length} khách hàng</button></div>
        </div>}
      </section>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/[0.055] p-5"><div className="flex items-center justify-between text-cyan-300"><Users size={21} /><span className="text-3xl font-black text-white">{customers.length}</span></div><div className="mt-5 text-sm font-semibold text-slate-200">Tổng khách hàng</div></div>
        <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-300/[0.055] p-5"><div className="flex items-center justify-between text-emerald-300"><UserCheck size={21} /><span className="text-3xl font-black text-white">{totals.active}</span></div><div className="mt-5 text-sm font-semibold text-slate-200">Đang hoạt động</div></div>
        <div className="rounded-[24px] border border-amber-300/15 bg-amber-300/[0.055] p-5"><div className="flex items-center justify-between text-amber-300"><UserRoundX size={21} /><span className="text-3xl font-black text-white">{totals.missingEmail}</span></div><div className="mt-5 text-sm font-semibold text-slate-200">Thiếu email kế toán</div></div>
        <div className="rounded-[24px] border border-red-300/15 bg-red-300/[0.055] p-5"><div className="text-right text-2xl font-black text-white">{formatVnd(totals.outstanding)}</div><div className="mt-5 text-sm font-semibold text-slate-200">Tổng số dư phải thu</div></div>
      </div>

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">Danh sách khách hàng</h2><p className="mt-1 text-sm text-slate-500">Không xóa dữ liệu; chuyển khách hàng cũ sang trạng thái ngừng hoạt động.</p></div><div className="grid gap-3 sm:grid-cols-[minmax(260px,1fr)_210px]"><label className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên, MST, email..." className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none"><option value="active">Đang hoạt động</option><option value="inactive">Ngừng hoạt động</option><option value="missing_email">Thiếu email</option><option value="all">Tất cả khách hàng</option></select></div></div>
        {loading ? <div className="mt-6 flex items-center justify-center gap-3 py-20 text-slate-500"><Loader2 size={20} className="animate-spin" /> Đang tải Customer Master...</div> : filtered.length === 0 ? <div className="mt-6 rounded-2xl border border-white/8 bg-[#081321]/35 px-5 py-14 text-center text-sm text-slate-500">Chưa có khách hàng phù hợp.</div> : <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-[1050px] w-full text-left text-sm"><thead className="bg-[#081321]/85 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">MST</th><th className="px-4 py-3">Email kế toán</th><th className="px-4 py-3">Điều khoản</th><th className="px-4 py-3 text-right">Số dư</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-white/8">{filtered.map((customer) => <tr key={customer.id} className="hover:bg-white/[0.025]"><td className="max-w-[300px] px-4 py-4"><div className="truncate font-semibold text-white">{customer.legal_name}</div><div className="mt-1 text-xs text-slate-500">{customer.customer_code || "Chưa có mã KH"}{customer.contact_name ? ` · ${customer.contact_name}` : ""}</div></td><td className="px-4 py-4 text-slate-300">{customer.tax_code || "—"}</td><td className="px-4 py-4"><div className={customer.primary_email ? "text-slate-300" : "text-amber-200"}>{customer.primary_email || "Chưa có email"}</div>{customer.cc_emails?.length > 0 && <div className="mt-1 text-xs text-slate-500">CC: {customer.cc_emails.join("; ")}</div>}</td><td className="px-4 py-4 text-slate-300">{customer.payment_terms_days} ngày</td><td className="px-4 py-4 text-right font-bold text-cyan-100">{formatVnd(customer.outstanding)}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${customer.is_active ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200" : "border-white/10 bg-white/[0.05] text-slate-400"}`}>{customer.is_active ? "Đang hoạt động" : "Ngừng hoạt động"}</span></td><td className="px-4 py-4 text-right"><button type="button" onClick={() => setEditing(customer)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-cyan-200/30 hover:text-cyan-200"><Pencil size={14} /> Chỉnh sửa</button></td></tr>)}</tbody></table></div>}
        <div className="mt-4 text-sm text-slate-500">Hiển thị {filtered.length}/{customers.length} khách hàng</div>
      </section>

      {editing !== undefined && <CustomerModal customer={editing} onClose={() => setEditing(undefined)} onSaved={saved} />}
    </AdminLayout>
  );
}
