import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useToast } from "../../components/admin/ui/toastContext";
import { SkeletonForm, SkeletonRows } from "../../components/admin/ui/Skeleton";
import { tableRow } from "../../components/admin/ui/motionPresets";
import {
  AR_TEMPLATE_URL,
  deleteReminders,
  formatDateTime,
  formatVnd,
  invokeArEmail,
  listReminders,
  readReminderFile,
  statusLabel,
  toAmount,
  toPayload,
  validateReminder,
} from "../../lib/ar";

const card = "rounded-[28px] border border-white/10 bg-white/[0.035] p-6 md:p-7";
const input = "w-full rounded-xl border border-white/10 bg-[#081321] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/40";
const label = "mb-1.5 block text-xs font-semibold text-slate-300";
const ghost = "inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-200/30 hover:text-white disabled:opacity-40";
const primary = "inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-[#071421] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40";
const statusStyle = {
  draft: "bg-slate-400/15 text-slate-200",
  sending: "bg-amber-300/15 text-amber-200",
  sent: "bg-emerald-300/15 text-emerald-200",
  failed: "bg-rose-400/15 text-rose-200",
};

const emptyRow = () => ({ recipient_name: "", recipient_emails: "", cc_emails: "", company_name: "", tax_code: "", amount: "", period: "", note: "" });
const fields = [
  ["recipient_name", "Người nhận *", "Nguyễn Văn A"],
  ["recipient_emails", "Email người nhận *", "ketoan@khachhang.vn (nhiều email: dùng ;)"],
  ["cc_emails", "Email CC", "không bắt buộc"],
  ["company_name", "Tên công ty khách hàng *", "Công ty TNHH ABC"],
  ["tax_code", "MST", "0312345678"],
  ["amount", "Số tiền nợ (VND) *", "15.000.000"],
  ["period", "Giai đoạn nợ *", "Quý 3/2026"],
];

const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

export default function AdminARPage() {
  const [status, setStatus] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupMissing, setSetupMissing] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listReminders());
      setSetupMissing(false);
    } catch (loadError) {
      if (/ar_reminders|schema cache|does not exist/i.test(loadError.message)) setSetupMissing(true);
      else setError(loadError.message);
    }
    invokeArEmail("status").then(setStatus).catch((statusError) => setError(statusError.message));
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const notify = (text) => {
    setError("");
    toast.success(text);
  };
  const fail = (text) => setError(text);

  const showPreview = async (payload, title) => {
    setPreview({ loading: true, title });
    try {
      const data = await invokeArEmail("preview", payload);
      setPreview({ title, ...data });
    } catch (previewError) {
      setPreview(null);
      fail(previewError.message);
    }
  };

  return (
    <AdminLayout>
      <div>
        <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Finance · AR</div>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Email nhắc công nợ</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Nhập công nợ từng khách (trực tiếp hoặc bằng file Excel), xem trước rồi gửi email song ngữ từ <span className="text-cyan-200">accounting@facs.vn</span>, kèm thông tin tài khoản ngân hàng của FACS. Không có email nào được gửi khi anh/chị chưa bấm gửi và xác nhận.
        </p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-6 flex items-start justify-between gap-3 rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-4 text-sm text-red-100">
              <span className="whitespace-pre-line">{error}</span>
              <button type="button" onClick={() => setError("")} className="text-slate-400 hover:text-white" aria-label="Đóng"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {setupMissing && <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">Chưa có bảng ar_reminders trên Supabase. Cần chạy migration 20261118010000_facs_ar_reminders.sql.</div>}

      <StatusBar status={status} onEdit={() => setSettingsOpen(true)} onRefresh={load} loading={loading} />

      <AddReminders onSaved={(count) => { notify(`Đã thêm ${count} dòng vào danh sách nhắc nợ (chưa gửi).`); load(); }} onError={fail} onPreview={(row) => showPreview({ reminder: toPayload(row) }, `Xem trước: ${row.company_name || "khách hàng"}`)} />

      <ReminderList
        rows={rows}
        loading={loading}
        status={status}
        onReload={load}
        onNotify={notify}
        onError={fail}
        onPreview={(row) => showPreview({ id: row.id }, `Xem trước: ${row.company_name}`)}
        onEdit={setEditing}
      />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onSaved={() => { notify("Đã lưu mẫu email và thông tin tài khoản ngân hàng."); load(); }} />}
      {editing && <EditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); notify("Đã cập nhật dòng nhắc nợ."); load(); }} />}
      {preview && <PreviewModal preview={preview} onClose={() => setPreview(null)} />}
    </AdminLayout>
  );
}

function StatusBar({ status, onEdit, onRefresh, loading }) {
  return (
    <section className={`${card} mt-7`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {!status ? <Loader2 size={16} className="animate-spin text-slate-400" /> : status.connected ? <CheckCircle2 size={17} className="text-emerald-300" /> : <XCircle size={17} className="text-amber-300" />}
            <span>Gửi từ <strong className="text-cyan-200">accounting@facs.vn</strong> qua Microsoft 365{status && !status.connected && " — chưa cấu hình Microsoft Graph"}</span>
          </div>
          <div className="flex items-center gap-2">
            {!status ? <Loader2 size={16} className="animate-spin text-slate-400" /> : status.bank_ready ? <Landmark size={17} className="text-emerald-300" /> : <AlertTriangle size={17} className="text-amber-300" />}
            <span>{!status ? "Đang kiểm tra…" : status.bank_ready ? "Đã có thông tin tài khoản ngân hàng trong email" : "Chưa điền tài khoản ngân hàng — cần điền trước khi gửi"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primary} onClick={onEdit}><Pencil size={16} /> Mẫu email & tài khoản ngân hàng</button>
          <button type="button" className={ghost} onClick={onRefresh} disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Làm mới</button>
        </div>
      </div>
    </section>
  );
}

function AddReminders({ onSaved, onError, onPreview }) {
  const [mode, setMode] = useState("manual");
  const [manual, setManual] = useState([emptyRow()]);
  const [fileRows, setFileRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fileErrors, setFileErrors] = useState([]);
  const [batchLabel, setBatchLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const setCell = (index, key, value) => setManual((list) => list.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const save = async (list, reset) => {
    const invalid = list.map((row, i) => ({ i, errors: validateReminder(row) })).filter((x) => x.errors.length);
    if (invalid.length) {
      onError(invalid.slice(0, 8).map((x) => `Dòng ${list[x.i]._line || x.i + 1}: ${x.errors.join(", ")}`).join("\n"));
      return;
    }
    setBusy(true);
    try {
      const data = await invokeArEmail("add_reminders", { rows: list.map(toPayload), batch_label: batchLabel });
      reset();
      onSaved(data.inserted);
    } catch (saveError) {
      const detail = saveError.rowErrors?.slice(0, 8).map((x) => `Dòng ${list[x.index]?._line || x.index + 1}: ${x.error}`).join("\n");
      onError(detail ? `${saveError.message}\n${detail}` : saveError.message);
    }
    setBusy(false);
  };

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileName(file.name);
    try {
      const result = await readReminderFile(file);
      setFileRows(result.rows);
      setFileErrors(result.errors);
    } catch (readError) {
      setFileRows([]);
      setFileErrors([readError.message]);
    }
  };

  const fileInvalid = fileRows.filter((r) => r._errors.length).length;
  const fileTotal = fileRows.reduce((sum, r) => sum + (Number.isFinite(toAmount(r.amount)) ? toAmount(r.amount) : 0), 0);

  return (
    <section className={`${card} mt-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Thêm khách hàng cần nhắc nợ</h2>
          <p className="mt-1 text-sm text-slate-500">Ít khách: nhập trực tiếp. Nhiều khách: tải file Excel theo mẫu. Các dòng được lưu ở trạng thái “Chưa gửi”.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("manual")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "manual" ? "bg-cyan-300 text-[#071421]" : "border border-white/10 text-slate-300"}`}>Nhập trực tiếp</button>
          <button type="button" onClick={() => setMode("file")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === "file" ? "bg-cyan-300 text-[#071421]" : "border border-white/10 text-slate-300"}`}>Tải file Excel</button>
        </div>
      </div>

      <label className="mt-5 block max-w-md">
        <span className={label}>Tên đợt nhắc (không bắt buộc, để lọc sau này)</span>
        <input className={input} value={batchLabel} maxLength={200} onChange={(e) => setBatchLabel(e.target.value)} placeholder="Ví dụ: Nhắc nợ Quý 3/2026" />
      </label>

      {mode === "manual" ? (
        <div className="mt-5 space-y-4">
          {manual.map((row, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-[#081321]/50 p-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-300">
                <span>Khách hàng {index + 1}</span>
                <div className="flex gap-3">
                  <button type="button" className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-100" onClick={() => onPreview(row)}><Eye size={14} /> Xem trước email</button>
                  {manual.length > 1 && <button type="button" className="text-slate-500 hover:text-rose-200" onClick={() => setManual((list) => list.filter((_, i) => i !== index))} aria-label="Xóa dòng"><Trash2 size={15} /></button>}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {fields.map(([key, text, placeholder]) => (
                  <label key={key} className="block">
                    <span className={label}>{text}</span>
                    <input className={input} value={row[key]} placeholder={placeholder} inputMode={key === "amount" ? "numeric" : undefined} onChange={(e) => setCell(index, key, e.target.value)} />
                  </label>
                ))}
                <label className="block md:col-span-2 xl:col-span-4">
                  <span className={label}>Ghi chú (hiện trong email gửi khách này)</span>
                  <textarea className={`${input} min-h-[64px]`} value={row.note} onChange={(e) => setCell(index, "note", e.target.value)} placeholder="Ví dụ: Phí dịch vụ kế toán tháng 7–9/2026, hóa đơn số 123" />
                </label>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghost} onClick={() => setManual((list) => [...list, emptyRow()])} disabled={manual.length >= 20}><Plus size={16} /> Thêm khách</button>
            <button type="button" className={primary} disabled={busy} onClick={() => save(manual, () => setManual([emptyRow()]))}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu vào danh sách</button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={AR_TEMPLATE_URL} download className={ghost}><Download size={16} /> Tải file mẫu Excel</a>
            <label className={`${ghost} cursor-pointer`}>
              <UploadCloud size={16} /> Chọn file (.xlsx, .csv)
              <input type="file" accept=".xlsx,.csv" className="hidden" onChange={pickFile} />
            </label>
            {fileName && <span className="inline-flex items-center gap-2 text-sm text-slate-400"><FileSpreadsheet size={15} /> {fileName}</span>}
          </div>
          <p className="text-xs text-slate-500">Cột cần có: Người nhận, Email người nhận, Email CC, Tên công ty khách hàng, MST, Số tiền nợ, Giai đoạn nợ, Ghi chú. Nhiều email trong một ô thì ngăn bằng dấu chấm phẩy. Tối đa 500 dòng.</p>
          {fileErrors.length > 0 && <div className="rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">{fileErrors.join(" ")}</div>}
          {fileRows.length > 0 && (
            <>
              <div className="text-sm text-slate-300">
                {fileRows.length} dòng · tổng {formatVnd(fileTotal)}
                {fileInvalid > 0 && <span className="ml-2 text-rose-200">· {fileInvalid} dòng có lỗi (tô đỏ) — sửa trong file rồi tải lại</span>}
              </div>
              <div className="max-h-[420px] overflow-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#0d1726] text-xs text-slate-400">
                    <tr><th className="p-3">Dòng</th><th>Người nhận</th><th>Email</th><th>Công ty / MST</th><th className="text-right">Số tiền</th><th className="pl-4">Giai đoạn</th><th>Ghi chú</th><th /></tr>
                  </thead>
                  <tbody>
                    {fileRows.map((r) => (
                      <tr key={r._line} className={`border-t border-white/5 align-top ${r._errors.length ? "bg-rose-500/10" : ""}`}>
                        <td className="p-3 text-slate-500">{r._line}</td>
                        <td className="py-3 pr-3">{r.recipient_name}</td>
                        <td className="py-3 pr-3 text-xs text-slate-300">{r.recipient_emails}{r.cc_emails && <div className="text-slate-500">CC: {r.cc_emails}</div>}</td>
                        <td className="py-3 pr-3">{r.company_name}<div className="text-xs text-slate-500">{r.tax_code}</div></td>
                        <td className="py-3 text-right font-semibold">{Number.isFinite(toAmount(r.amount)) ? formatVnd(toAmount(r.amount)) : r.amount}</td>
                        <td className="py-3 pl-4 pr-3">{r.period}</td>
                        <td className="max-w-[220px] py-3 pr-3 text-xs text-slate-400">{r.note}{r._errors.length > 0 && <div className="mt-1 font-semibold text-rose-200">{r._errors.join(", ")}</div>}</td>
                        <td className="py-3 pr-3"><button type="button" className="text-cyan-300 hover:text-cyan-100" onClick={() => onPreview(r)} aria-label="Xem trước"><Eye size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className={primary} disabled={busy || fileInvalid > 0} onClick={() => save(fileRows, () => { setFileRows([]); setFileName(""); })}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu {fileRows.length} dòng vào danh sách
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function ReminderList({ rows, loading, status, onReload, onNotify, onError, onPreview, onEdit }) {
  const [filter, setFilter] = useState("unsent");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [confirm, setConfirm] = useState(null); // { ids, resend }
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "unsent" && !["draft", "failed"].includes(r.status)) return false;
      if (filter !== "unsent" && filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.company_name, r.tax_code, r.recipient_name, r.batch_label, r.period, ...(r.recipient_emails || [])].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  const selectable = visible.filter((r) => ["draft", "failed"].includes(r.status));
  const chosen = rows.filter((r) => selected.has(r.id) && ["draft", "failed"].includes(r.status));
  const chosenTotal = chosen.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const counts = useMemo(() => rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {}), [rows]);

  const toggle = (id) => setSelected((set) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((set) => (selectable.every((r) => set.has(r.id)) ? new Set() : new Set(selectable.map((r) => r.id))));

  const send = async ({ ids, resend }) => {
    setConfirm(null);
    let sent = 0;
    const failed = [];
    let skipped = 0;
    setProgress({ done: 0, total: ids.length });
    try {
      for (const part of chunk(ids, 10)) {
        const data = await invokeArEmail("send", { ids: part, resend });
        for (const r of data.results || []) {
          if (r.status === "sent") sent += 1;
          else failed.push(r.error);
        }
        skipped += (data.skipped || []).length;
        setProgress((p) => ({ ...p, done: p.done + part.length }));
      }
    } catch (sendError) {
      failed.push(sendError.message);
    }
    setProgress(null);
    setSelected(new Set());
    const lines = [`Đã gửi ${sent}/${ids.length} email (người gửi: accounting@facs.vn).`];
    if (skipped) lines.push(`${skipped} dòng bỏ qua vì đã gửi hoặc đang được gửi ở nơi khác.`);
    if (failed.length) lines.push(`${failed.length} lỗi: ${[...new Set(failed)].slice(0, 3).join(" | ")}`);
    if (failed.length) onError(lines.join("\n"));
    else onNotify(lines.join("\n"));
    onReload();
  };

  const test = async () => {
    setBusy("test");
    try {
      const data = await invokeArEmail("test", { id: chosen[0]?.id });
      onNotify(`Đã gửi bản thử đến ${data.sent_to}${chosen[0] ? ` (dữ liệu của ${chosen[0].company_name})` : " (dữ liệu minh họa)"} — ${data.route_text || "từ accounting@facs.vn"}. Hãy kiểm tra hộp thư.`);
    } catch (testError) {
      onError(testError.message);
    }
    setBusy("");
  };

  const remove = async () => {
    if (!chosen.length || !window.confirm(`Xóa ${chosen.length} dòng chưa gửi?`)) return;
    setBusy("delete");
    try {
      await deleteReminders(chosen.map((r) => r.id));
      setSelected(new Set());
      onNotify(`Đã xóa ${chosen.length} dòng.`);
      onReload();
    } catch (deleteError) {
      onError(deleteError.message);
    }
    setBusy("");
  };

  const canSend = status?.connected && status?.bank_ready;

  return (
    <section className={`${card} mt-6`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Danh sách nhắc nợ</h2>
          <p className="mt-1 text-sm text-slate-500">Chưa gửi: {counts.draft || 0} · Lỗi: {counts.failed || 0} · Đã gửi: {counts.sent || 0}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={`${input} w-auto`} value={filter} onChange={(e) => { setFilter(e.target.value); setSelected(new Set()); }}>
            <option value="unsent">Chưa gửi & lỗi</option>
            <option value="sent">Đã gửi</option>
            <option value="all">Tất cả</option>
          </select>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className={`${input} w-64 pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm công ty, MST, email, đợt…" />
          </div>
        </div>
      </div>

      {loading && !rows.length ? (
        <div className="mt-6"><SkeletonRows rows={4} /></div>
      ) : !visible.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">Chưa có dòng nào{filter === "unsent" ? " cần gửi" : ""}.</div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-white/[0.03] text-xs text-slate-400">
              <tr>
                <th className="w-10 p-3">{selectable.length > 0 && <input type="checkbox" className="accent-cyan-300" checked={selectable.every((r) => selected.has(r.id))} onChange={toggleAll} aria-label="Chọn tất cả" />}</th>
                <th>Công ty / MST</th>
                <th>Người nhận</th>
                <th className="text-right">Số tiền</th>
                <th className="pl-4">Giai đoạn</th>
                <th>Trạng thái</th>
                <th className="pr-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
              {visible.map((r) => {
                const editable = ["draft", "failed"].includes(r.status);
                return (
                  <motion.tr key={r.id} {...tableRow} className="border-t border-white/5 align-top">
                    <td className="p-3">{editable && <input type="checkbox" className="accent-cyan-300" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label="Chọn" />}</td>
                    <td className="py-3 pr-3">
                      <div className="font-semibold">{r.company_name}</div>
                      <div className="text-xs text-slate-500">{[r.tax_code && `MST ${r.tax_code}`, r.batch_label].filter(Boolean).join(" · ")}</div>
                      {r.note && <div className="mt-1 max-w-[280px] text-xs text-slate-400">{r.note}</div>}
                    </td>
                    <td className="py-3 pr-3">
                      <div>{r.recipient_name}</div>
                      <div className="text-xs text-slate-400">{(r.recipient_emails || []).join("; ")}</div>
                      {r.cc_emails?.length > 0 && <div className="text-xs text-slate-500">CC: {r.cc_emails.join("; ")}</div>}
                    </td>
                    <td className="py-3 text-right font-semibold">{formatVnd(r.amount)}</td>
                    <td className="py-3 pl-4 pr-3">{r.period}</td>
                    <td className="py-3 pr-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusStyle[r.status]}`}>{statusLabel[r.status]}</span>
                      {r.sent_at && <div className="mt-1 text-xs text-slate-500">{formatDateTime(r.sent_at)}</div>}
                      {r.last_error && <div className="mt-1 max-w-[220px] text-xs text-rose-200">{r.last_error}</div>}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-3 text-slate-400">
                        <button type="button" className="hover:text-cyan-200" onClick={() => onPreview(r)} title="Xem trước email"><Eye size={16} /></button>
                        {editable && <button type="button" className="hover:text-cyan-200" onClick={() => onEdit(r)} title="Sửa"><Pencil size={16} /></button>}
                        {r.status === "sent" && <button type="button" className="hover:text-amber-200" onClick={() => setConfirm({ ids: [r.id], resend: true, rows: [r] })} disabled={!canSend} title="Gửi lại"><RotateCcw size={16} /></button>}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-300">Đã chọn {chosen.length} dòng{chosen.length > 0 && ` · tổng ${formatVnd(chosenTotal)}`}</span>
        <button type="button" className={primary} disabled={!chosen.length || !canSend || !!progress} onClick={() => setConfirm({ ids: chosen.map((r) => r.id), resend: false, rows: chosen })}>
          <Send size={16} /> Gửi email
        </button>
        <button type="button" className={ghost} disabled={!status?.connected || busy === "test"} onClick={test}>{busy === "test" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi thử tới {status?.test_recipient || "tunguyen@facs.vn"}</button>
        <button type="button" className={ghost} disabled={!chosen.length || busy === "delete"} onClick={remove}><Trash2 size={16} /> Xóa dòng đã chọn</button>
        {status && !status.bank_ready && <span className="text-xs text-amber-200">Cần điền tài khoản ngân hàng trước khi gửi.</span>}
        {progress && <span className="inline-flex items-center gap-2 text-sm text-cyan-200"><Loader2 size={16} className="animate-spin" /> Đang gửi {progress.done}/{progress.total}… (mỗi email cách nhau ~2 giây, đừng đóng trang)</span>}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020812]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-[28px] border border-cyan-200/20 bg-[#0d1726] p-6">
            <h3 className="text-xl font-bold">{confirm.resend ? "Gửi lại email nhắc nợ?" : `Gửi ${confirm.ids.length} email nhắc nợ?`}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Email sẽ được gửi từ <strong className="text-cyan-200">accounting@facs.vn</strong> đến khách hàng thật, tổng công nợ {formatVnd(confirm.rows.reduce((s, r) => s + Number(r.amount || 0), 0))}. Không thể thu hồi sau khi gửi.
            </p>
            <ul className="mt-3 max-h-40 overflow-auto text-xs text-slate-400">
              {confirm.rows.slice(0, 20).map((r) => <li key={r.id}>• {r.company_name} — {(r.recipient_emails || []).join(", ")} — {formatVnd(r.amount)}</li>)}
              {confirm.rows.length > 20 && <li>… và {confirm.rows.length - 20} khách khác</li>}
            </ul>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className={ghost} onClick={() => setConfirm(null)}>Hủy</button>
              <button type="button" className={primary} onClick={() => send(confirm)}><Send size={16} /> Xác nhận gửi</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SettingsModal({ onClose, onSaved }) {
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    invokeArEmail("get_settings").then((data) => {
      setSettings(data.settings);
      setDefaults(data.defaults);
    }).catch((loadError) => setError(loadError.message));
  }, []);

  const set = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const doPreview = async () => {
    setBusy("preview");
    setError("");
    try {
      setPreviewHtml((await invokeArEmail("preview", { settings })).html);
    } catch (previewError) {
      setError(previewError.message);
    }
    setBusy("");
  };

  const save = async () => {
    setBusy("save");
    setError("");
    try {
      await invokeArEmail("save_settings", { settings });
      onSaved();
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    }
    setBusy("");
  };

  const bankFields = [
    ["bank_name", "Ngân hàng *", "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)"],
    ["bank_branch", "Chi nhánh", "Chi nhánh …"],
    ["account_number", "Số tài khoản *", "0071000…"],
    ["account_holder", "Chủ tài khoản *", "CÔNG TY TNHH …"],
    ["swift_code", "Mã SWIFT (cho khách nước ngoài)", "BFTVVNVX"],
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020812]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[30px] border border-cyan-200/20 bg-[#0d1726] p-5 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">accounting@facs.vn</div>
            <h2 className="mt-2 text-2xl font-bold">Mẫu email nhắc nợ & tài khoản ngân hàng</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300"><X size={19} /></button>
        </div>
        {error && <div className="mt-4 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>}
        {!settings ? (
          <div className="mt-6 grid gap-6 xl:grid-cols-2"><SkeletonForm fields={6} /><SkeletonForm fields={2} /></div>
        ) : (
          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#081321]/50 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold"><Landmark size={17} className="text-cyan-300" /> Tài khoản nhận thanh toán</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {bankFields.map(([key, text, placeholder]) => (
                    <label key={key} className="block">
                      <span className={label}>{text}</span>
                      <input className={input} value={settings[key]} placeholder={placeholder} onChange={(e) => set(key, e.target.value)} />
                    </label>
                  ))}
                  <label className="block md:col-span-2">
                    <span className={label}>Nội dung chuyển khoản gợi ý</span>
                    <input className={input} value={settings.transfer_note} onChange={(e) => set("transfer_note", e.target.value)} />
                  </label>
                </div>
              </div>
              <label className="block">
                <span className={label}>Tiêu đề email</span>
                <input className={input} value={settings.subject} onChange={(e) => set("subject", e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>Nội dung tiếng Việt</span>
                <textarea className={`${input} min-h-[200px] leading-relaxed`} value={settings.body_vi} onChange={(e) => set("body_vi", e.target.value)} />
              </label>
              <label className="block">
                <span className={label}>English content</span>
                <textarea className={`${input} min-h-[200px] leading-relaxed`} value={settings.body_en} onChange={(e) => set("body_en", e.target.value)} />
              </label>
              <p className="text-xs leading-relaxed text-slate-500">
                Biến dùng được: <code>{"{{recipient_name}}"}</code> <code>{"{{company_name}}"}</code> <code>{"{{tax_code}}"}</code> <code>{"{{amount}}"}</code> <code>{"{{period}}"}</code> <code>{"{{note}}"}</code>. Bảng “Chi tiết công nợ”, bảng “Thông tin chuyển khoản” (song ngữ, hiện một lần) được hệ thống tự thêm cuối phần tiếng Việt, trước chữ ký; mỗi phần có chữ ký Phòng Kế toán riêng.
              </p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">Xem trước (dữ liệu minh họa)</span>
                <button type="button" className={ghost} onClick={doPreview} disabled={busy === "preview"}>{busy === "preview" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Cập nhật xem trước</button>
              </div>
              {previewHtml ? <iframe title="Xem trước email" sandbox="" srcDoc={previewHtml} className="h-[70vh] w-full rounded-2xl border border-white/10 bg-white" /> : <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">Bấm “Cập nhật xem trước”.</div>}
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5">
          <button type="button" className={ghost} disabled={!defaults} onClick={() => window.confirm("Khôi phục tiêu đề và nội dung mặc định? (Thông tin ngân hàng giữ nguyên)") && setSettings((s) => ({ ...s, subject: defaults.subject, body_vi: defaults.body_vi, body_en: defaults.body_en, transfer_note: defaults.transfer_note }))}>
            <RotateCcw size={16} /> Nội dung mặc định
          </button>
          <div className="flex gap-3">
            <button type="button" className={ghost} onClick={onClose}>Đóng</button>
            <button type="button" className={primary} onClick={save} disabled={!settings || busy === "save"}>{busy === "save" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...toPayload(row),
    recipient_emails: (row.recipient_emails || []).join("; "),
    cc_emails: (row.cc_emails || []).join("; "),
    amount: String(Number(row.amount)),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const errors = validateReminder(form);
    if (errors.length) return setError(errors.join(", "));
    setBusy(true);
    try {
      await invokeArEmail("update_reminder", { id: row.id, row: form });
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020812]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-[28px] border border-cyan-200/20 bg-[#0d1726] p-6">
        <div className="flex items-center justify-between"><h3 className="text-xl font-bold">Sửa dòng nhắc nợ</h3><button type="button" onClick={onClose} className="text-slate-400"><X size={19} /></button></div>
        {error && <div className="mt-3 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {fields.map(([key, text]) => (
            <label key={key} className="block"><span className={label}>{text}</span><input className={input} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></label>
          ))}
          <label className="block md:col-span-2"><span className={label}>Ghi chú</span><textarea className={`${input} min-h-[70px]`} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className={ghost} onClick={onClose}>Hủy</button>
          <button type="button" className={primary} onClick={save} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu</button>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ preview, onClose }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#020812]/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-[28px] border border-cyan-200/20 bg-[#0d1726] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">{preview.title}</h3>
            {preview.subject && <div className="mt-1 text-sm text-slate-300"><span className="text-slate-500">Tiêu đề:</span> {preview.subject}</div>}
            {preview.bank_warning && <div className="mt-1 text-xs text-amber-200">{preview.bank_warning}</div>}
          </div>
          <button type="button" onClick={onClose} className="text-slate-400"><X size={19} /></button>
        </div>
        {preview.loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Đang dựng email…</div>
        ) : (
          <iframe title="Xem trước email" sandbox="" srcDoc={preview.html} className="mt-4 h-[75vh] w-full rounded-2xl bg-white" />
        )}
      </div>
    </div>
  );
}
