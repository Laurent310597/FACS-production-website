import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Eye, FileText, Loader2, LockKeyhole, Mail, RefreshCw, Save, Send, Settings2, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { formatArDate, formatArDateTime, formatVnd } from "../../lib/ar";
import { invokeArReminder, loadArReminderWorkspace, saveArReminderTemplate } from "../../lib/arReminders";

function ModeBadge({ status }) {
  const mode = status?.email_mode || "disabled";
  const classes = mode === "live"
    ? "border-red-300/25 bg-red-300/10 text-red-100"
    : mode === "test"
      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
      : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  const label = mode === "live" ? "LIVE" : mode === "test" ? "TEST ONLY" : "EMAIL LOCKED";
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black tracking-wide ${classes}`}><LockKeyhole size={13} /> {label}</span>;
}

function PreviewModal({ preview, status, working, onClose, onTest, onLive }) {
  const [confirmation, setConfirmation] = useState("");
  const liveReady = Boolean(status?.live_enabled && confirmation.trim().toUpperCase() === preview.confirmation_phrase);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#030a12]/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ar-preview-title">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-[28px] border border-white/12 bg-[#101d30] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Review gate</div><h2 id="ar-preview-title" className="mt-2 text-2xl font-bold">Xem trước email nhắc nợ</h2><p className="mt-1 text-sm text-slate-400">{preview.invoice_count} hóa đơn · {formatVnd(preview.total_outstanding)} · hết hạn {formatArDateTime(preview.review_expires_at)}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white" aria-label="Đóng"><X size={19} /></button>
        </div>
        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_330px] md:p-6">
          <div className="min-w-0">
            <div className="mb-3 rounded-2xl border border-white/10 bg-[#081321]/60 px-4 py-3 text-sm"><span className="text-slate-500">Tiêu đề:</span> <strong className="text-white">{preview.subject}</strong></div>
            <iframe title="Email AR preview" sandbox="" srcDoc={preview.body_html} className="h-[620px] w-full rounded-2xl border border-white/10 bg-white" />
          </div>
          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#081321]/60 p-4 text-sm"><div className="font-bold text-white">Người nhận khi gửi thật</div><div className="mt-3 break-all text-cyan-200">To: {preview.recipients?.to?.join(", ") || "Thiếu email"}</div><div className="mt-2 break-all text-slate-400">Cc: {preview.recipients?.cc?.join(", ") || "Không có"}</div></div>
            {!status?.test_enabled && <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] p-4 text-sm leading-relaxed text-emerald-100"><strong>Preview an toàn:</strong> biến môi trường đang khóa toàn bộ gửi thử và gửi thật.</div>}
            <button type="button" disabled={working || !status?.test_enabled} onClick={onTest} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/20 px-4 py-3 font-bold text-amber-100 disabled:cursor-not-allowed disabled:opacity-35"><Mail size={17} /> Gửi thử nội bộ</button>
            <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4">
              <label className="block text-xs font-bold uppercase tracking-wide text-red-200">Xác nhận gửi khách hàng</label>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">Chỉ khả dụng trên Production khi chế độ LIVE được bật. Nhập chính xác:</p>
              <code className="mt-2 block rounded-xl bg-black/20 px-3 py-2 text-center text-sm text-red-100">{preview.confirmation_phrase}</code>
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={preview.confirmation_phrase} className="mt-3 w-full rounded-xl border border-white/10 bg-[#081321] px-3 py-2.5 text-sm text-white outline-none focus:border-red-300/30" />
              <button type="button" disabled={working || !liveReady} onClick={() => onLive(confirmation)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-300 px-4 py-3 font-black text-[#1c0808] disabled:cursor-not-allowed disabled:opacity-30"><Send size={17} /> Gửi email khách hàng</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function AdminARRemindersPage() {
  const [customers, setCustomers] = useState([]);
  const [template, setTemplate] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [workspace, mailStatus] = await Promise.all([loadArReminderWorkspace(), invokeArReminder("status")]);
      setCustomers(workspace.customers); setTemplate(workspace.template); setDeliveries(workspace.deliveries); setStatus(mailStatus);
    } catch (loadError) { setError(`Không thể tải AR Reminders: ${loadError.message}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return customers.filter((item) => !normalized || `${item.legal_name} ${item.tax_code || ""} ${item.customer_code || ""} ${item.primary_email || ""}`.toLowerCase().includes(normalized));
  }, [customers, query]);

  const runPreview = async (customerId) => {
    setWorking(true); setError(""); setNotice("");
    try { setPreview(await invokeArReminder("preview", { customer_id: customerId })); }
    catch (previewError) { setError(`Không thể xem trước: ${previewError.message}`); }
    finally { setWorking(false); }
  };

  const runDelivery = async (action, confirmation) => {
    setWorking(true); setError(""); setNotice("");
    try {
      const result = await invokeArReminder(action, { customer_id: preview.customer_id, confirmation });
      setPreview(null);
      setNotice(action === "test" ? "Đã gửi email thử nội bộ và ghi nhật ký." : "Đã gửi email nhắc nợ tới khách hàng và ghi nhật ký.");
      await load();
      return result;
    } catch (deliveryError) { setError(`Không thể gửi email: ${deliveryError.message}`); }
    finally { setWorking(false); }
  };

  const saveTemplate = async () => {
    setWorking(true); setError(""); setNotice("");
    try {
      const saved = await saveArReminderTemplate(template);
      setTemplate(saved); setEditing(false); setPreview(null);
      setNotice("Đã lưu mẫu email. Mọi bản xem trước cũ đã hết hiệu lực.");
    } catch (saveError) { setError(`Không thể lưu mẫu email: ${saveError.message}`); }
    finally { setWorking(false); }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Accounts Receivable</div><h1 className="mt-3 text-3xl font-bold md:text-4xl">Email nhắc công nợ</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Luồng kiểm soát: chọn khách hàng → xem trước snapshot → gửi thử nội bộ (tùy chọn) → xác nhận riêng khi gửi thật.</p></div>
        <div className="flex flex-wrap items-center gap-3"><ModeBadge status={status} /><button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-200 disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /> Làm mới</button><button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.06] px-5 py-3 font-semibold text-cyan-100"><Settings2 size={17} /> Mẫu email</button></div>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/8 px-5 py-4 text-sm text-red-200">{error}</div>}
      {notice && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/8 px-5 py-4 text-sm text-emerald-200">{notice}</div>}
      {status?.email_mode === "disabled" && <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-5 py-4 text-sm leading-relaxed text-emerald-100"><LockKeyhole className="mt-0.5 shrink-0" size={18} /><div><strong>Khóa gửi đang hoạt động.</strong> Anh vẫn có thể xem trước nội dung và người nhận; backend từ chối cả gửi thử lẫn gửi thật.</div></div>}

      {editing && template && <section className="mt-7 rounded-[28px] border border-cyan-300/15 bg-cyan-300/[0.04] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">Mẫu email mặc định</h2><p className="mt-1 text-sm text-slate-500">Token hỗ trợ: {'{{customer_name}}'}, {'{{contact_name}}'}, {'{{tax_code}}'}, {'{{statement_date}}'}, {'{{total_outstanding}}'}, {'{{invoice_count}}'}.</p></div><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-white/10 p-2 text-slate-400"><X size={18} /></button></div>
        <div className="mt-5 grid gap-4">
          <label><span className="mb-2 block text-sm font-semibold text-slate-200">Tiêu đề</span><input value={template.subject_template} onChange={(event) => setTemplate({ ...template, subject_template: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" /></label>
          <div className="grid gap-4 lg:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold text-slate-200">Nội dung tiếng Việt</span><textarea rows={9} value={template.body_vi_template} onChange={(event) => setTemplate({ ...template, body_vi_template: event.target.value })} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" /></label><label><span className="mb-2 block text-sm font-semibold text-slate-200">English content</span><textarea rows={9} value={template.body_en_template} onChange={(event) => setTemplate({ ...template, body_en_template: event.target.value })} className="w-full resize-y rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-white outline-none focus:border-cyan-300/35" /></label></div>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={saveTemplate} disabled={working} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-[#071421] disabled:opacity-50">{working ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Lưu mẫu email</button></div>
      </section>}

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-xl font-bold">Khách hàng còn công nợ</h2><p className="mt-1 text-sm text-slate-500">Một email tổng hợp toàn bộ hóa đơn chưa thu của từng khách hàng.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Khách hàng, MST, email..." className="w-full rounded-2xl border border-white/10 bg-[#081321]/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/35 md:max-w-sm" /></div>
        {loading ? <div className="flex items-center justify-center gap-3 py-20 text-slate-500"><Loader2 size={20} className="animate-spin" /> Đang tải...</div> : visibleCustomers.length === 0 ? <div className="mt-6 rounded-2xl border border-white/8 bg-[#081321]/35 px-5 py-14 text-center text-sm text-slate-500">Không có khách hàng còn số dư phù hợp.</div> : <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10"><table className="min-w-[920px] w-full text-left text-sm"><thead className="bg-[#081321]/85 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Email</th><th className="px-4 py-3 text-center">Hóa đơn</th><th className="px-4 py-3">Cũ nhất</th><th className="px-4 py-3 text-right">Số dư</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-white/8">{visibleCustomers.map((customer) => <tr key={customer.customer_id} className="hover:bg-white/[0.025]"><td className="px-4 py-4"><div className="font-semibold text-white">{customer.legal_name}</div><div className="mt-1 text-xs text-slate-500">{customer.customer_code || "Chưa có mã"} · {customer.tax_code || "Chưa có MST"}</div></td><td className="px-4 py-4"><div className={customer.primary_email ? "text-cyan-100" : "text-amber-200"}>{customer.primary_email || "Thiếu email"}</div><div className="mt-1 text-xs text-slate-500">Cc: {customer.cc_emails?.length || 0}</div></td><td className="px-4 py-4 text-center font-bold">{customer.invoice_count}</td><td className="px-4 py-4"><div>{formatArDate(customer.oldest_due_date)}</div><div className={`mt-1 text-xs ${customer.overdue_days > 0 ? "text-amber-200" : "text-slate-500"}`}>{customer.overdue_days > 0 ? `Quá hạn ${customer.overdue_days} ngày` : "Chưa quá hạn"}</div></td><td className="px-4 py-4 text-right font-black text-cyan-200">{formatVnd(customer.total_outstanding)}</td><td className="px-4 py-4 text-right"><button type="button" disabled={working || !customer.primary_email} onClick={() => runPreview(customer.customer_id)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 px-3 py-2 font-bold text-cyan-100 disabled:opacity-35">{working ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} Xem trước</button></td></tr>)}</tbody></table></div>}
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-6"><div className="flex items-center gap-3"><FileText size={20} className="text-cyan-300" /><div><h2 className="text-lg font-bold">Nhật ký nhắc nợ</h2><p className="text-xs text-slate-500">20 lượt gần nhất</p></div></div><div className="mt-5 divide-y divide-white/8">{deliveries.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Chưa có email nhắc nợ nào được gửi.</div> : deliveries.map((item) => <div key={item.id} className="flex flex-col gap-2 py-4 md:flex-row md:items-start md:justify-between"><div><div className="flex items-center gap-2 font-semibold text-slate-200">{item.status === "sent" ? <CheckCircle2 size={16} className="text-emerald-300" /> : item.status === "processing" ? <Clock3 size={16} className="text-amber-300" /> : <AlertTriangle size={16} className="text-red-300" />} {item.ar_customers?.legal_name || "Khách hàng"} · {item.delivery_type === "test" ? "Gửi thử" : "Gửi thật"}</div><div className="mt-1 text-xs text-slate-500">{item.subject}</div>{item.error_message && <div className="mt-1 text-xs text-red-200">{item.error_message}</div>}</div><div className="text-xs text-slate-500">{formatArDateTime(item.completed_at || item.requested_at)}</div></div>)}</div></section>

      {preview && <PreviewModal preview={preview} status={status} working={working} onClose={() => setPreview(null)} onTest={() => runDelivery("test")} onLive={(confirmation) => runDelivery("live", confirmation)} />}
    </AdminLayout>
  );
}

