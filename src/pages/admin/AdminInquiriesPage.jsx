import { useEffect, useMemo, useState } from "react";
import { Loader2, MailWarning, MessagesSquare, RefreshCw, Search } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { invokeFormEmailAdmin } from "../../lib/formSubmissions";
import { supabase } from "../../lib/supabaseClient";

const statusLabels = { new: "Mới", in_progress: "Đang xử lý", replied: "Đã phản hồi", closed: "Đã đóng", spam: "Spam" };
const emailStyle = { sent: "bg-emerald-300/10 text-emerald-200", failed: "bg-red-300/10 text-red-200", processing: "bg-violet-300/10 text-violet-200", pending: "bg-amber-300/10 text-amber-200" };

export default function AdminInquiriesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [working, setWorking] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from("contact_inquiries").select("*").order("submitted_at", { ascending: false });
    setRows(data || []); setError(fetchError?.message || ""); setLoading(false);
  };
  useEffect(() => { let active = true; supabase.from("contact_inquiries").select("*").order("submitted_at", { ascending: false }).then(({ data, error: fetchError }) => { if (active) { setRows(data || []); setError(fetchError?.message || ""); setLoading(false); } }); return () => { active = false; }; }, []);

  const filtered = useMemo(() => { const text = query.trim().toLowerCase(); return rows.filter((row) => (status === "all" || row.status === status) && (!text || `${row.full_name} ${row.email} ${row.phone || ""} ${row.company_name || ""}`.toLowerCase().includes(text))); }, [rows, query, status]);
  const updateRow = async (id, values) => { const { error: updateError } = await supabase.from("contact_inquiries").update(values).eq("id", id); if (updateError) setError(updateError.message); else setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row)); };
  const retry = async (row, delivery) => { setWorking(`${delivery}-${row.id}`); setError(""); try { await invokeFormEmailAdmin("retry", { type: "contact", id: row.id, delivery }); await load(); } catch (retryError) { setError(retryError.message); } finally { setWorking(""); } };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Contact</div><h1 className="mt-2 text-3xl font-bold md:text-4xl">Yêu cầu liên hệ</h1><p className="mt-2 text-sm text-slate-400">Theo dõi khách hàng liên hệ và trạng thái email xác nhận.</p></div><button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300"><RefreshCw size={17} /> Làm mới</button></div>
      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      <div className="mt-7 grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_auto]"><label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4"><Search size={18} className="text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên, công ty, email hoặc điện thoại..." className="w-full bg-transparent px-3 py-3 text-sm outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm"><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="mt-6 space-y-4">{loading ? <div className="flex min-h-60 items-center justify-center"><Loader2 className="animate-spin text-cyan-300" /></div> : filtered.length === 0 ? <div className="rounded-[26px] border border-white/10 bg-white/[0.035] px-6 py-16 text-center text-slate-500"><MessagesSquare className="mx-auto mb-4" /> Chưa có yêu cầu phù hợp.</div> : filtered.map((row) => (
        <details key={row.id} className="rounded-[26px] border border-white/10 bg-white/[0.035] open:border-cyan-200/20">
          <summary className="grid cursor-pointer list-none gap-4 p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,.8fr)_auto] md:items-center"><div><div className="font-semibold text-white">{row.full_name}</div><div className="mt-1 text-sm text-slate-500">{row.company_name || "Không ghi công ty"} · {row.email}</div></div><div><div className="text-sm text-slate-300">{row.service_interest || "Yêu cầu tư vấn chung"}</div><div className="mt-1 text-xs text-slate-500">{new Date(row.submitted_at).toLocaleString("vi-VN")}</div></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200">{statusLabels[row.status]}</span><span className={`rounded-full px-3 py-1 text-xs ${emailStyle[row.internal_email_status]}`}>Nội bộ: {row.internal_email_status}</span><span className={`rounded-full px-3 py-1 text-xs ${emailStyle[row.receipt_email_status]}`}>Receipt: {row.receipt_email_status}</span></div></summary>
          <div className="border-t border-white/10 p-5 md:p-6"><div className="grid gap-6 lg:grid-cols-2"><div><div className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Nội dung</div><p className="mt-3 whitespace-pre-line leading-relaxed text-slate-300">{row.message}</p><div className="mt-5 text-sm text-slate-500">Điện thoại: {row.phone || "—"}</div></div><div className="space-y-4"><label className="block text-sm text-slate-400">Trạng thái<select value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value, ...(event.target.value === "replied" ? { replied_at: new Date().toISOString() } : {}) })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-white">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm text-slate-400">Ghi chú nội bộ<textarea defaultValue={row.admin_notes || ""} onBlur={(event) => updateRow(row.id, { admin_notes: event.target.value })} rows="4" className="mt-2 w-full rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none" /></label></div></div>
          {(row.internal_email_status === "failed" || row.receipt_email_status === "failed") && <div className="mt-5 rounded-2xl border border-red-300/15 bg-red-400/6 p-4"><div className="flex items-center gap-2 text-sm text-red-200"><MailWarning size={17} /> {row.last_email_error || "Có email gửi thất bại."}</div><div className="mt-3 flex gap-3">{row.internal_email_status === "failed" && <button disabled={working === `internal-${row.id}`} onClick={() => retry(row, "internal")} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Gửi lại email nội bộ</button>}{row.receipt_email_status === "failed" && <button disabled={working === `receipt-${row.id}`} onClick={() => retry(row, "receipt")} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Gửi lại receipt</button>}</div></div>}
          </div>
        </details>
      ))}</div>
    </AdminLayout>
  );
}
