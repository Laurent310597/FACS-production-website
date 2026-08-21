import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserMinus,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { invokeInsightEmail } from "../../lib/emailNotifications";
import { supabase } from "../../lib/supabaseClient";

const emptyContact = {
  email: "",
  display_name: "",
  company_name: "",
  language: "both",
  consent_source: "Existing client relationship",
  notes: "",
};

function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function csvEscape(value = "") {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function toImportRecords(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.toLowerCase().replace(/\s+/g, "_"));
  const hasHeader = header.some((value) => ["email", "e-mail", "mail"].includes(value));
  const body = hasHeader ? rows.slice(1) : rows;
  const emailIndex = hasHeader ? header.findIndex((value) => ["email", "e-mail", "mail"].includes(value)) : 0;
  const nameIndex = hasHeader ? header.findIndex((value) => ["name", "display_name", "customer_name"].includes(value)) : 1;
  const companyIndex = hasHeader ? header.findIndex((value) => ["company", "company_name"].includes(value)) : 2;

  return body
    .map((columns) => ({
      email: normalizeEmail(columns[emailIndex] || ""),
      display_name: nameIndex >= 0 ? columns[nameIndex] || null : null,
      company_name: companyIndex >= 0 ? columns[companyIndex] || null : null,
      language: "both",
      status: "subscribed",
      consent_source: "CSV import",
      consent_at: new Date().toISOString(),
    }))
    .filter((record) => isValidEmail(record.email));
}

export default function AdminEmailPage() {
  const [connection, setConnection] = useState({ connected: false, loading: true });
  const [audience, setAudience] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(emptyContact);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadConnection = async () => {
    try {
      const data = await invokeInsightEmail("oauth_status");
      setConnection({ ...data, loading: false });
    } catch (connectionError) {
      setConnection({ connected: false, loading: false, error: connectionError.message });
    }
  };

  const loadData = async () => {
    setLoading(true);
    const [{ data: contacts, error: contactsError }, { data: logRows, error: logError }] = await Promise.all([
      supabase.from("insight_email_audience").select("*").order("created_at", { ascending: false }),
      supabase.from("insight_email_delivery_logs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (contactsError) setError(contactsError.message);
    else setAudience(contacts || []);
    if (!logError) setLogs(logRows || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const [connectionResult, contactsResult, logsResult] = await Promise.allSettled([
        invokeInsightEmail("oauth_status"),
        supabase.from("insight_email_audience").select("*").order("created_at", { ascending: false }),
        supabase.from("insight_email_delivery_logs").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (cancelled) return;

      if (connectionResult.status === "fulfilled") {
        setConnection({ ...connectionResult.value, loading: false });
      } else {
        setConnection({ connected: false, loading: false, error: connectionResult.reason?.message || "Không thể kiểm tra Microsoft 365." });
      }

      if (contactsResult.status === "fulfilled" && !contactsResult.value.error) {
        setAudience(contactsResult.value.data || []);
      } else {
        const reason = contactsResult.status === "fulfilled" ? contactsResult.value.error?.message : contactsResult.reason?.message;
        setError(reason || "Không thể tải audience.");
      }

      if (logsResult.status === "fulfilled" && !logsResult.value.error) setLogs(logsResult.value.data || []);
      setLoading(false);
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredAudience = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return audience.filter((contact) => {
      const matchesStatus = status === "all" || contact.status === status;
      const haystack = `${contact.email || ""} ${contact.display_name || ""} ${contact.company_name || ""}`.toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [audience, query, status]);

  const subscribedCount = audience.filter((contact) => contact.status === "subscribed").length;

  const addContact = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) {
      setError("Email khách hàng chưa hợp lệ.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("insight_email_audience").upsert({
      ...form,
      email,
      status: "subscribed",
      consent_at: new Date().toISOString(),
    }, { onConflict: "email" });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyContact);
    setMessage("Đã thêm hoặc cập nhật người nhận.");
    loadData();
  };

  const setContactStatus = async (contact, nextStatus) => {
    const { error: updateError } = await supabase
      .from("insight_email_audience")
      .update({ status: nextStatus })
      .eq("id", contact.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAudience((current) => current.map((item) => item.id === contact.id ? { ...item, status: nextStatus } : item));
  };

  const deleteContact = async (contact) => {
    if (!window.confirm(`Xóa ${contact.email} khỏi danh sách audience?`)) return;
    const { error: deleteError } = await supabase.from("insight_email_audience").delete().eq("id", contact.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAudience((current) => current.filter((item) => item.id !== contact.id));
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    const text = await file.text();
    const records = toImportRecords(text);
    if (!records.length) {
      setError("Không tìm thấy email hợp lệ trong file CSV.");
      return;
    }
    const unique = Array.from(new Map(records.map((record) => [record.email, record])).values());
    setSaving(true);
    const { error: importError } = await supabase.from("insight_email_audience").upsert(unique, { onConflict: "email" });
    setSaving(false);
    if (importError) {
      setError(importError.message);
      return;
    }
    setMessage(`Đã nhập ${unique.length} địa chỉ email hợp lệ.`);
    loadData();
  };

  const exportCsv = () => {
    const header = ["email", "display_name", "company_name", "status", "language", "consent_source", "consent_at"];
    const body = audience.map((contact) => header.map((key) => csvEscape(contact[key] || "")).join(","));
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facs-insight-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Email automation</div>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Email & Audience</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Gửi từ info@facs.vn; To cố định tunguyen@facs.vn; Cc cố định yendoan@facs.vn và thanhhuynh@facs.vn. Toàn bộ khách hàng chỉ xuất hiện tại Bcc.
        </p>
      </div>

      {(message || error) && (
        <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${error ? "border-red-300/20 bg-red-400/8 text-red-200" : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200"}`}>
          {error || message}
        </div>
      )}

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Mail className="text-cyan-300" size={24} />
              <h2 className="text-xl font-semibold">Microsoft 365</h2>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {connection.loading ? (
                <><Loader2 size={16} className="animate-spin text-slate-400" /> Đang kiểm tra...</>
              ) : connection.connected ? (
                <><CheckCircle2 size={17} className="text-emerald-300" /> <span className="text-emerald-200">Đã cấu hình gửi từ {connection.mailbox_email}</span></>
              ) : (
                <><XCircle size={17} className="text-amber-300" /> <span className="text-amber-200">Chưa cấu hình Microsoft Graph</span></>
              )}
            </div>
            {connection.error && <div className="mt-2 text-xs text-red-200">{connection.error}</div>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={loadConnection} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:text-white">
              <RefreshCw size={17} /> Kiểm tra lại
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Danh sách khách hàng nhận Bcc</h2>
            <p className="mt-1 text-sm text-slate-500">{subscribedCount} địa chỉ đang được phép nhận email; tổng cộng {audience.length} bản ghi.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-cyan-100">
              <Upload size={17} /> Nhập CSV
              <input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
            </label>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-cyan-100">
              <Download size={17} /> Xuất CSV
            </button>
          </div>
        </div>

        <form onSubmit={addContact} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-[#081321]/55 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="customer@example.com" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} placeholder="Tên khách hàng" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <input value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} placeholder="Công ty" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071421] disabled:opacity-50">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Thêm
          </button>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/35">
            <Search size={18} className="text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm email, tên hoặc công ty..." className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
            <option value="all">Tất cả</option>
            <option value="subscribed">Đang nhận</option>
            <option value="unsubscribed">Đã ngừng nhận</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-cyan-300" /></div>
          ) : filteredAudience.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có người nhận phù hợp.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredAudience.map((contact) => (
                <div key={contact.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{contact.email}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{contact.display_name || "Chưa có tên"}</div>
                  </div>
                  <div className="text-sm text-slate-400">{contact.company_name || "—"}</div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contact.status === "subscribed" ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-200"}`}>
                      {contact.status === "subscribed" ? "Đang nhận" : "Đã ngừng nhận"}
                    </span>
                    <button type="button" onClick={() => setContactStatus(contact, contact.status === "subscribed" ? "unsubscribed" : "subscribed")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-cyan-200" title={contact.status === "subscribed" ? "Ngừng gửi" : "Kích hoạt lại"}>
                      {contact.status === "subscribed" ? <UserMinus size={16} /> : <UserRoundCheck size={16} />}
                    </button>
                    <button type="button" onClick={() => deleteContact(contact)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-red-200" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <h2 className="text-xl font-semibold">Nhật ký gửi gần nhất</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr><th className="pb-3">Thời gian</th><th className="pb-3">Loại</th><th className="pb-3">Trạng thái</th><th className="pb-3">BCC</th><th className="pb-3">Lỗi</th></tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 text-slate-400">{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                  <td className="py-3">{log.delivery_type === "test" ? "Email thử" : "Thông báo"}</td>
                  <td className="py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${log.status === "sent" ? "bg-emerald-300/10 text-emerald-200" : log.status === "failed" ? "bg-red-300/10 text-red-200" : "bg-violet-300/10 text-violet-200"}`}>{log.status}</span></td>
                  <td className="py-3 text-slate-400">{log.bcc_count}</td>
                  <td className="max-w-md truncate py-3 text-red-200/80">{log.error_message || "—"}</td>
                </tr>
              ))}
              {!logs.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Chưa có nhật ký gửi.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
