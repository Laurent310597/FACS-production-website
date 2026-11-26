import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Clock3, FlaskConical, Loader2, MailCheck, RefreshCw, Search, Send, Users } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { useConfirm } from "../../components/admin/ui/confirmContext";
import { useToast } from "../../components/admin/ui/toastContext";
import { badge, btnGhost, btnPrimary, btnSecondary, card, input, subtle } from "../../components/admin/ui/styles";
import { formatLegalDate, getCategory } from "../../lib/legalCalendar";
import { currentMonth, defaultEmailMonth, formatDateTime, invokeLegalEmail, monthTitle, shiftMonth } from "../../lib/legalCalendarEmail";

const STUCK_AFTER_MS = 30 * 60 * 1000;
const statusChip = {
  sent: ["Đã gửi", "bg-emerald-400/10 text-emerald-300"],
  failed: ["Lỗi", "bg-rose-400/10 text-rose-300"],
  processing: ["Đang xử lý", "bg-amber-300/10 text-amber-200"],
};

function Step({ index, done, active, title, children }) {
  return (
    <div className={`${subtle} flex gap-4`}>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-emerald-400/15 text-emerald-300" : active ? "bg-brand/20 text-blue-200" : "bg-white/[0.05] text-ink-3"}`}>
        {done ? <CheckCircle2 size={17} /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink-1">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-ink-3">{children}</div>
      </div>
    </div>
  );
}

const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }) : "");

/** Danh sách khách hàng để tick chọn người nhận BCC; đánh dấu ai đã nhận email của tháng đang chọn. */
function RecipientPicker({ audience, selected, onChange, disabled }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("new");
  const counts = useMemo(() => ({
    new: audience.filter((c) => !c.received).length,
    received: audience.filter((c) => c.received).length,
    all: audience.length,
  }), [audience]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audience.filter((c) => (filter === "all" || (filter === "new" ? !c.received : Boolean(c.received)))
      && (!q || [c.email, c.name, c.company].some((v) => (v || "").toLowerCase().includes(q))));
  }, [audience, filter, query]);
  const toggle = (id) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); onChange(next); };
  const chip = (key, label) => (
    <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${filter === key ? "bg-brand/20 text-blue-100 ring-1 ring-inset ring-brand/40" : "text-ink-3 hover:bg-white/[0.05] hover:text-ink-1"}`}>{label} <span className="opacity-70">{counts[key]}</span></button>
  );
  return (
    <div className="mt-3 space-y-2.5">
      <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><input className={`${input} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm email, tên, công ty…" aria-label="Tìm khách hàng" /></div>
      <div className="flex flex-wrap gap-1">{chip("new", "Chưa nhận tháng này")}{chip("received", "Đã nhận")}{chip("all", "Tất cả")}</div>
      <div className="flex items-center justify-between gap-2 text-xs text-ink-3">
        <span>Đã chọn <strong className="text-ink-1">{selected.size}</strong> khách</span>
        <span className="flex gap-3">
          <button type="button" className="font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-40" disabled={disabled || !visible.length} onClick={() => onChange(new Set([...selected, ...visible.map((c) => c.id)]))}>Chọn tất cả đang hiện</button>
          <button type="button" className="font-semibold text-ink-2 hover:text-ink-1 disabled:opacity-40" disabled={disabled || !selected.size} onClick={() => onChange(new Set())}>Bỏ chọn</button>
        </span>
      </div>
      <ul className="max-h-80 divide-y divide-white/[0.06] overflow-y-auto rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06]">
        {visible.length === 0 ? <li className="px-3 py-6 text-center text-xs text-ink-3">Không có khách hàng phù hợp.</li> : visible.map((c) => (
          <li key={c.id}>
            <label className={`flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-white/[0.04] ${selected.has(c.id) ? "bg-brand/[0.08]" : ""}`}>
              <input type="checkbox" className="mt-1 shrink-0" checked={selected.has(c.id)} disabled={disabled} onChange={() => toggle(c.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-1">{c.email}</span>
                <span className="block truncate text-xs text-ink-3">{[c.name, c.company].filter(Boolean).join(" · ") || "—"}{c.created_at ? ` · thêm ngày ${shortDate(c.created_at)}` : ""}</span>
              </span>
              {c.received && <span className={`${badge} shrink-0 ${c.received.status === "sent" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-300/10 text-amber-200"}`}>{c.received.status === "sent" ? `Đã nhận ${shortDate(c.received.at).slice(0, 5)}` : "Đang gửi"}</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminLegalEmailPage() {
  const [month, setMonth] = useState(defaultEmailMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [allowResend, setAllowResend] = useState(false);
  const [mode, setMode] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const requestRef = useRef("");
  const latestMonth = useRef("");
  const confirm = useConfirm();
  const toast = useToast();

  // Chỉ nhận kết quả của tháng đang chọn (bấm đổi tháng nhanh không bị dữ liệu cũ ghi đè).
  const load = useCallback(async (key) => {
    latestMonth.current = key;
    setLoading(true);
    setError("");
    try {
      const result = await invokeLegalEmail("preview", { month: key });
      if (latestMonth.current !== key) return;
      setData(result);
      // Bỏ những khách không còn trong danh sách; tháng đã gửi thì mặc định chuyển sang chọn từng khách.
      const ids = new Set((result.audience || []).map((c) => c.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
      if ((result.logs || []).some((log) => log.delivery_type === "send" && log.status === "sent")) setMode("selected");
    } catch (loadError) {
      if (latestMonth.current !== key) return;
      setData(null);
      setError(loadError.message);
    } finally {
      if (latestMonth.current === key) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load(month), 0);
    return () => window.clearTimeout(timer);
  }, [month, load]);

  // Đổi tháng: bỏ lựa chọn "Gửi lại" và mã lượt gửi của tháng cũ.
  function changeMonth(next) {
    setAllowResend(false);
    setSelected(new Set());
    setMode("all");
    requestRef.current = "";
    setMonth(next);
  }

  const logs = useMemo(() => data?.logs || [], [data]);
  const sends = logs.filter((log) => log.delivery_type === "send");
  const lastSent = sends.find((log) => log.status === "sent");
  const inflight = sends.find((log) => log.status === "processing");
  const events = data?.events || [];
  const audience = useMemo(() => data?.audience || [], [data]);
  const recipients = useMemo(() => (mode === "all" ? audience : audience.filter((c) => selected.has(c.id))), [mode, audience, selected]);
  const bccCount = recipients.length;
  const repeatCount = recipients.filter((c) => c.received).length;
  const needResend = mode === "all" ? Boolean(lastSent) : repeatCount > 0;
  const mailReady = data?.mail ? data.mail.connected !== false : true;
  const canTest = Boolean(data && events.length && !busy && !loading);
  const canSend = Boolean(canTest && data.tested && bccCount > 0 && bccCount <= 497 && !inflight && (!needResend || allowResend) && mailReady);

  async function sendTest() {
    setBusy("test");
    try {
      const result = await invokeLegalEmail("test", { month, content_hash: data.content_hash });
      toast.success(`Đã gửi email thử tới ${result.to}. Hãy kiểm tra hộp thư trước khi gửi khách hàng.`);
      await load(month);
    } catch (testError) {
      toast.error(testError.message);
    } finally {
      setBusy("");
    }
  }

  async function sendToClients() {
    const ok = await confirm({
      title: `Gửi lịch pháp lý ${monthTitle(month).toLowerCase()} cho ${bccCount} khách hàng${mode === "selected" ? " đã chọn" : ""}?`,
      message: `${mode === "selected" ? `BCC: ${recipients.slice(0, 5).map((c) => c.email).join(", ")}${bccCount > 5 ? ` và ${bccCount - 5} khách khác` : ""}. ` : ""}Email gồm ${events.length} mốc, gửi từ ${data.recipients.sender}; To: ${data.recipients.to.join(", ")}; CC: ${data.recipients.cc.join(", ")}.${repeatCount ? ` Có ${repeatCount} khách đã nhận email tháng này.` : ""} Thao tác này không thể thu hồi.`,
      confirmText: `Gửi ${bccCount} khách hàng`,
      danger: true,
    });
    if (!ok) return;
    if (!requestRef.current) requestRef.current = crypto.randomUUID();
    setBusy("send");
    try {
      const result = await invokeLegalEmail("send", {
        month,
        content_hash: data.content_hash,
        request_id: requestRef.current,
        audience_mode: mode,
        audience_ids: mode === "selected" ? recipients.map((c) => c.id) : undefined,
        expected_bcc: recipients.map((c) => c.email),
        allow_resend: allowResend,
        confirmation_text: "SEND-LEGAL-MONTH",
      });
      requestRef.current = "";
      setAllowResend(false);
      setSelected(new Set());
      toast.success(result.already_processed ? "Lượt gửi này đã hoàn tất trước đó." : `Đã gửi lịch ${monthTitle(month).toLowerCase()} cho ${result.recipients.bcc_count} khách hàng.`);
      await load(month);
    } catch (sendError) {
      toast.error(sendError.message);
      await load(month);
    } finally {
      setBusy("");
    }
  }

  async function settleStuck(log, outcome) {
    const ok = await confirm({
      title: outcome === "sent" ? "Ghi nhận lượt gửi là ĐÃ GỬI?" : "Ghi nhận lượt gửi là KHÔNG GỬI ĐƯỢC?",
      message: `Chỉ chọn sau khi đã kiểm tra thư mục Sent Items của ${data.recipients.sender} (lượt bắt đầu lúc ${formatDateTime(log.created_at)}).`,
      confirmText: "Đã kiểm tra, xác nhận",
    });
    if (!ok) return;
    setBusy("release");
    try {
      await invokeLegalEmail("release_stuck", { log_id: log.id, outcome, confirmation_text: "CHECKED-SENT-ITEMS" });
      toast.success("Đã cập nhật trạng thái lượt gửi.");
      await load(month);
    } catch (releaseError) {
      toast.error(releaseError.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-sunset">Legal Calendar CMS</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Email lịch pháp lý</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-2">Gửi khách hàng các mốc thời hạn pháp lý trong tháng từ infor@facs.vn. Khách hàng nhận ở BCC nên không thấy địa chỉ của nhau.</p>
        </div>
        <button type="button" onClick={() => load(month)} disabled={loading || Boolean(busy)} className={`${btnSecondary} self-start xl:self-auto`}><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Làm mới</button>
      </div>

      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="order-2 min-w-0 space-y-6 xl:order-1">
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Xem trước email</h2>
              {data?.subject && <span className="text-xs text-ink-3">Giống hệt email khách hàng nhận</span>}
            </div>
            {data?.subject && <div className={`${subtle} mt-4 text-sm`}><span className="text-ink-3">Tiêu đề: </span><span className="font-semibold text-ink-1">{data.subject}</span></div>}
            <div className="mt-4 overflow-hidden rounded-2xl bg-[#eef1f4]">
              {loading ? <div className="flex h-[520px] items-center justify-center gap-3 text-slate-500"><Loader2 size={20} className="animate-spin" /> Đang dựng email...</div>
                : data?.body_html ? <iframe title="Xem trước email lịch pháp lý" sandbox="" srcDoc={data.body_html} className="block h-[1100px] w-full border-0" />
                  : <div className="flex h-[320px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-600"><CircleDashed size={22} />{error || "Tháng này chưa có mốc pháp lý đã xuất bản và đã xác minh."}</div>}
            </div>
          </section>
        </div>

        <div className="order-1 min-w-0 space-y-6 xl:order-2">
          <section className={card}>
            <div className="flex items-center justify-between gap-3">
              <button type="button" className={btnGhost} onClick={() => changeMonth(shiftMonth(month, -1))} disabled={Boolean(busy)} aria-label="Tháng trước"><ChevronLeft size={18} /></button>
              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-3">Tháng gửi</div>
                <div className="mt-1 text-2xl font-bold">{monthTitle(month)}</div>
              </div>
              <button type="button" className={btnGhost} onClick={() => changeMonth(shiftMonth(month, 1))} disabled={Boolean(busy)} aria-label="Tháng sau"><ChevronRight size={18} /></button>
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" className={`${btnGhost} h-8 text-xs`} onClick={() => changeMonth(currentMonth())} disabled={Boolean(busy)}>Tháng này</button>
              <button type="button" className={`${btnGhost} h-8 text-xs`} onClick={() => changeMonth(shiftMonth(currentMonth(), 1))} disabled={Boolean(busy)}>Tháng sau</button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className={subtle}><div className="text-xs text-ink-3">Mốc trong email</div><div className="mt-1 text-2xl font-bold">{loading ? "…" : events.length}</div></div>
              <div className={subtle}><div className="flex items-center gap-1.5 text-xs text-ink-3"><Users size={13} /> {mode === "selected" ? "Đã chọn (BCC)" : "Khách hàng (BCC)"}</div><div className="mt-1 text-2xl font-bold">{loading ? "…" : bccCount}{mode === "selected" && !loading && <span className="text-sm font-semibold text-ink-3"> / {audience.length}</span>}</div></div>
            </div>
            <div className="mt-4 text-sm">
              {inflight ? <span className={`${badge} bg-amber-300/10 text-amber-200`}><Clock3 size={13} /> Có lượt gửi đang xử lý</span>
                : lastSent ? <span className={`${badge} bg-emerald-400/10 text-emerald-300`}><MailCheck size={13} /> Đã gửi khách hàng lúc {formatDateTime(lastSent.completed_at || lastSent.created_at)}</span>
                  : <span className={`${badge} bg-white/[0.06] text-ink-2`}>Chưa gửi khách hàng tháng này</span>}
            </div>
          </section>

          {(error || data?.warnings?.length > 0) && (
            <div className="space-y-2">
              {error && <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200">{error}</div>}
              {(data?.warnings || []).map((warning) => <div key={warning} className="flex gap-2 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-amber-100"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{warning}</div>)}
              {data?.mail?.connected === false && <div className="rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-200">Hộp thư Microsoft 365 chưa được cấu hình nên chưa gửi được email.</div>}
            </div>
          )}

          <section className={`${card} space-y-3`}>
            <h2 className="text-xl font-bold">Gửi email</h2>
            <Step index={1} done={Boolean(events.length)} active title="Kiểm tra nội dung">Rà soát email xem trước. Chỉ các mốc <strong className="text-ink-2">đã xuất bản và đã xác minh</strong> được đưa vào.</Step>
            <Step index={2} done={Boolean(data?.tested)} active={Boolean(events.length)} title="Gửi thử nội bộ">
              Gửi bản [TEST] tới {data?.recipients?.to?.[0] || "tunguyen@facs.vn"}. Nếu sửa mốc sau khi gửi thử, cần gửi thử lại.
              <div className="mt-3"><button type="button" className={btnSecondary} onClick={sendTest} disabled={!canTest}>{busy === "test" ? <Loader2 size={16} className="animate-spin" /> : <FlaskConical size={16} />} Gửi thử</button></div>
            </Step>
            <Step index={3} done={Boolean(lastSent)} active={Boolean(data?.tested)} title="Gửi khách hàng">
              Từ <strong className="text-ink-2">{data?.recipients?.sender || "infor@facs.vn"}</strong> · To {data?.recipients?.to?.join(", ") || "—"} · CC {data?.recipients?.cc?.join(", ") || "—"} · khách hàng nhận ở BCC (<Link to="/admin/email" className="text-cyan-300 hover:text-cyan-200">quản lý danh sách</Link>).
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-inset ring-white/[0.06]" role="radiogroup" aria-label="Người nhận">
                {[["all", `Tất cả (${audience.length})`], ["selected", "Chọn khách hàng"]].map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={mode === value} disabled={Boolean(busy)} onClick={() => { setMode(value); setAllowResend(false); }}
                    className={`h-9 rounded-lg text-sm font-semibold transition ${mode === value ? "bg-cms-3 text-ink-1 shadow ring-1 ring-inset ring-cyan-300/30" : "text-ink-3 hover:text-ink-1"}`}>{label}</button>
                ))}
              </div>
              {mode === "selected" && <RecipientPicker audience={audience} selected={selected} onChange={setSelected} disabled={Boolean(busy)} />}
              {needResend && !inflight && bccCount > 0 && (
                <label className="mt-3 flex items-start gap-2 text-ink-2"><input type="checkbox" className="mt-1" checked={allowResend} onChange={(e) => setAllowResend(e.target.checked)} />
                  {mode === "all" ? "Tháng này đã gửi. Tôi muốn gửi lại cho tất cả khách hàng." : `${repeatCount} khách đã chọn đã nhận email tháng này. Tôi muốn gửi lại cho họ.`}</label>
              )}
              <div className="mt-3"><button type="button" className={btnPrimary} onClick={sendToClients} disabled={!canSend}>{busy === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {mode === "selected" ? `Gửi ${bccCount} khách đã chọn` : `Gửi ${bccCount} khách hàng`}</button></div>
            </Step>
          </section>

          <section className={card}>
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Các mốc trong email</h2><Link to="/admin/legal-calendar" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Quản lý mốc</Link></div>
            {events.length === 0 ? <p className="mt-4 text-sm text-ink-3">{loading ? "Đang tải…" : "Chưa có mốc nào."}</p> : (
              <div className="mt-3 divide-y divide-white/[0.07]">
                {events.map((event) => { const category = getCategory(event.category); return (
                  <Link key={event.id} to={`/admin/legal-calendar/${event.id}/edit`} className="group flex gap-3 py-3">
                    <span className="w-14 shrink-0 text-sm font-bold text-cyan-200">{formatLegalDate(event.event_date, "vi").slice(0, 5)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-ink-1 group-hover:text-cyan-200">{event.title_vi || event.title_en}</span>
                      <span className="cms-cat-label mt-0.5 block text-xs" style={{ color: category.color }}>{category.vi}</span>
                    </span>
                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-ink-3 opacity-0 transition group-hover:opacity-100" />
                  </Link>
                ); })}
              </div>
            )}
          </section>

          <section className={card}>
            <h2 className="text-xl font-bold">Nhật ký {monthTitle(month).toLowerCase()}</h2>
            {logs.length === 0 ? <p className="mt-4 text-sm text-ink-3">Chưa có lượt gửi nào.</p> : (
              <div className="mt-3 divide-y divide-white/[0.07]">
                {logs.map((log) => {
                  const [label, tone] = statusChip[log.status] || [log.status, "bg-white/[0.06] text-ink-2"];
                  const stuck = log.status === "processing" && Date.parse(data.server_now) - Date.parse(log.created_at) > STUCK_AFTER_MS;
                  return (
                    <div key={log.id} className="py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink-1">{log.delivery_type === "test" ? "Gửi thử" : `Gửi ${log.bcc_count} khách hàng${log.audience_scope === "selected" ? " (đã chọn)" : ""}`}</span>
                        <span className={`${badge} ${tone}`}>{label}</span>
                        <span className="ml-auto text-xs text-ink-3">{formatDateTime(log.created_at)}</span>
                      </div>
                      <div className="mt-1 text-xs text-ink-3">{log.event_count} mốc{log.delivery_type === "test" ? ` · tới ${log.to_addresses?.join(", ")}` : ""}</div>
                      {log.error_message && <div className="mt-1 text-xs text-rose-200/90">{log.error_message}</div>}
                      {stuck && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className={`${btnSecondary} h-8 text-xs`} disabled={Boolean(busy)} onClick={() => settleStuck(log, "sent")}>Đã thấy trong Sent Items</button>
                          <button type="button" className={`${btnGhost} h-8 text-xs`} disabled={Boolean(busy)} onClick={() => settleStuck(log, "failed")}>Không thấy thư</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
