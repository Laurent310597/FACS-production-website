import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Loader2, Plus, RefreshCw, Save, ShieldAlert, Trash2, Wifi, WifiOff } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { AnimatePresence, motion } from "framer-motion";
import { useToastSetter } from "../../components/admin/ui/toastContext";
import { SkeletonRows } from "../../components/admin/ui/Skeleton";
import { listItem } from "../../components/admin/ui/motionPresets";
import {
  commandLabel,
  commandStatusLabel,
  createDevice,
  isOnline,
  listCommands,
  listDevices,
  listMirror,
  revokeDevice,
  sendCommand,
} from "../../lib/hubZalo";
import * as ui from "../../components/admin/ui/styles";

const cardClass = ui.card;
const ghostButton = ui.btnSecondary;
const primaryButton = ui.btnPrimary;
const inputClass = ui.input;

const fmtTs = (ms) => (ms ? new Date(Number(ms)).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "—");
const fmtIso = (value) => (value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "—");
const tabs = [
  ["overview", "Tổng quan"],
  ["conversations", "Hội thoại"],
  ["leads", "Lead & chuyển giao"],
  ["groups", "Nhóm & việc tồn"],
  ["security", "Nhật ký bảo mật"],
  ["config", "Cấu hình"],
  ["commands", "Lệnh đã gửi"],
];
const stateLabel = { FORM: "Thu thập thông tin", QUOTE: "Báo giá", HANDOVER: "Đã chuyển giao", NEW: "Mới" };

export default function AdminHubZaloPage() {
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setNotice = useToastSetter("success");
  const [setupMissing, setSetupMissing] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("Laptop văn phòng");
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const device = useMemo(() => devices.find((d) => d.id === deviceId) || devices[0] || null, [devices, deviceId]);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listDevices();
      setDevices(rows);
      setSetupMissing(false);
    } catch (e) {
      if (/hub_zalo|schema cache|does not exist/i.test(e.message)) setSetupMissing(true);
      else setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDevices();
    const timer = setInterval(loadDevices, 30000);
    return () => clearInterval(timer);
  }, [loadDevices]);

  const add = async () => {
    setBusy(true);
    setError("");
    try {
      setNewKey(await createDevice(newName.trim() || "Laptop văn phòng"));
      await loadDevices();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  const revoke = async () => {
    if (!device) return;
    setBusy(true);
    try {
      await revokeDevice(device.id);
      setConfirmRevoke(false);
      setNotice("Đã thu hồi khóa. Laptop dùng khóa này sẽ không đồng bộ được nữa.");
      await loadDevices();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">AI Zalo — giám sát & cấu hình</h1>
            <p className="mt-1 text-sm text-slate-400">Xem hoạt động và chỉnh luật của AI Zalo chạy trên laptop. Dữ liệu do laptop gửi lên; lệnh được laptop kiểm tra lại trước khi làm.</p>
          </div>
          <button type="button" className={ghostButton} onClick={loadDevices} disabled={loading}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Làm mới
          </button>
        </div>

        {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}
        {setupMissing && <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Bảng AI Zalo chưa có trên Supabase. Cần chạy migration 20261117040000_facs_hub_zalo.sql.</div>}

        {newKey && (
          <div className={`${cardClass} border-amber-300/30`}>
            <div className="flex items-center gap-2 font-bold text-amber-200"><AlertTriangle size={18} /> Khóa thiết bị — chỉ hiện một lần</div>
            <p className="mt-2 text-sm text-slate-300">Sao chép ngay và dán vào file .env của AI Zalo (HUB_DEVICE_KEY). Đóng khung này là không xem lại được; nếu mất, hãy thu hồi và tạo khóa mới.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="break-all rounded-xl bg-black/40 px-3 py-2 text-sm text-cyan-100">{newKey}</code>
              <button type="button" className={ghostButton} onClick={() => navigator.clipboard?.writeText(newKey).then(() => setNotice("Đã sao chép khóa."))}><Copy size={15} /> Sao chép</button>
              <button type="button" className={ghostButton} onClick={() => setNewKey("")}>Tôi đã lưu khóa</button>
            </div>
          </div>
        )}

        {!setupMissing && !loading && !device && (
          <div className={cardClass}>
            <h2 className="font-bold">Chưa có laptop nào kết nối</h2>
            <p className="mt-1 text-sm text-slate-400">Tạo khóa thiết bị, rồi điền HUB_SYNC_URL và HUB_DEVICE_KEY vào .env của AI Zalo (xem HUONG-DAN-FACS-HUB.md).</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input className={`${inputClass} max-w-xs`} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
              <button type="button" className={ghostButton} onClick={add} disabled={busy}><Plus size={16} /> Tạo khóa thiết bị</button>
            </div>
          </div>
        )}

        {device && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {devices.length > 1 && (
                <select className={`${inputClass} max-w-xs`} value={device.id} onChange={(e) => setDeviceId(e.target.value)}>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${isOnline(device) ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                {isOnline(device) ? <Wifi size={14} /> : <WifiOff size={14} />} {isOnline(device) ? "Đang trực tuyến" : "Ngoại tuyến"} · thấy lần cuối {fmtIso(device.last_seen_at)}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-cyan-300/[0.12] text-cyan-100" : "border border-white/10 text-slate-300 hover:text-white"}`}>{label}</button>
              ))}
            </div>

            {tab === "overview" && <Overview device={device} confirmRevoke={confirmRevoke} setConfirmRevoke={setConfirmRevoke} revoke={revoke} add={add} busy={busy} newName={newName} setNewName={setNewName} />}
            {tab === "conversations" && <Conversations device={device} setError={setError} setNotice={setNotice} />}
            {tab === "leads" && <Leads device={device} />}
            {tab === "groups" && <Groups device={device} setError={setError} setNotice={setNotice} />}
            {tab === "security" && <Security device={device} />}
            {tab === "config" && <Config device={device} setError={setError} setNotice={setNotice} />}
            {tab === "commands" && <Commands device={device} />}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function useMirror(deviceId, kind, options) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const convKey = options?.convKey;
  const limit = options?.limit;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listMirror(deviceId, kind, { convKey, limit }));
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [deviceId, kind, convKey, limit]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);
  return { rows, loading, error, reload };
}

const Empty = ({ children }) => <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-ink-3">{children}</div>;
const Loading = () => <SkeletonRows rows={3} />;

function Overview({ device, confirmRevoke, setConfirmRevoke, revoke, add, busy, newName, setNewName }) {
  const hb = device.heartbeat || {};
  const conv = useMirror(device.id, "conversation", { limit: 500 });
  const lead = useMirror(device.id, "lead", { limit: 500 });
  const handover = useMirror(device.id, "handover", { limit: 500 });
  const items = useMirror(device.id, "item", { limit: 500 });
  const [weekAgo] = useState(() => Date.now() - 7 * 86_400_000);
  const stats = {
    convWeek: conv.rows.filter((r) => Number(r.ts) >= weekAgo).length,
    leadWeek: lead.rows.filter((r) => Number(r.ts) >= weekAgo).length,
    handoverWeek: handover.rows.filter((r) => Number(r.ts) >= weekAgo).length,
    openItems: items.rows.filter((r) => r.data?.status === "OPEN").length,
    muted: conv.rows.filter((r) => r.data?.is_muted).length,
  };
  const tile = (label, value) => (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-2xl font-black text-cyan-200">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <h2 className="font-bold">Trạng thái AI Zalo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tile("Kết nối Zalo", hb.zaloStatus || "—")}
          {tile("Tài khoản Zalo", hb.accountName || "—")}
          {tile("AI trả lời khách", hb.aiEnabled === undefined ? "—" : hb.aiEnabled ? "Đang bật" : "Đang tắt")}
          {tile("Token hôm nay", hb.tokenLimit ? `${hb.tokensToday ?? 0} / ${hb.tokenLimit}` : hb.tokensToday ?? "—")}
          {tile("Có OpenAI key", hb.hasOpenAiKey === undefined ? "—" : hb.hasOpenAiKey ? "Có" : "Chưa")}
          {tile("Phiên bản", hb.version || "—")}
          {tile("Chạy liên tục", hb.uptimeS ? `${Math.round(hb.uptimeS / 3600)} giờ` : "—")}
          {tile("Đồng bộ tin nhắn", hb.syncMessages === undefined ? "—" : hb.syncMessages ? "Bật" : "Tắt")}
        </div>
      </div>
      <div className={cardClass}>
        <h2 className="font-bold">Báo cáo 7 ngày gần nhất</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {tile("Hội thoại có hoạt động", stats.convWeek)}
          {tile("Lead cập nhật", stats.leadWeek)}
          {tile("Lượt chuyển giao", stats.handoverWeek)}
          {tile("Việc đang mở", stats.openItems)}
          {tile("Hội thoại đang tắt AI", stats.muted)}
        </div>
        <p className="mt-3 text-xs text-ink-3">Số liệu tính trên dữ liệu đã đồng bộ lên Hub (tối đa 500 dòng mỗi loại).</p>
      </div>
      <div className={cardClass}>
        <h2 className="font-bold">Quản lý khóa thiết bị</h2>
        <p className="mt-1 text-sm text-slate-400">Khóa chỉ cho phép laptop gửi/nhận dữ liệu AI Zalo; không phải khóa quản trị. Nghi ngờ lộ khóa thì thu hồi và tạo khóa mới.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {confirmRevoke ? (
            <>
              <span className="text-sm text-rose-200">Thu hồi khóa của “{device.name}”?</span>
              <button type="button" className={ghostButton} onClick={revoke} disabled={busy}><Trash2 size={15} /> Xác nhận thu hồi</button>
              <button type="button" className={ghostButton} onClick={() => setConfirmRevoke(false)}>Hủy</button>
            </>
          ) : (
            <button type="button" className={ghostButton} onClick={() => setConfirmRevoke(true)}><Trash2 size={15} /> Thu hồi khóa này</button>
          )}
          <input className={`${inputClass} max-w-[14rem]`} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
          <button type="button" className={ghostButton} onClick={add} disabled={busy}><Plus size={15} /> Tạo khóa mới</button>
        </div>
      </div>
    </div>
  );
}

function Conversations({ device, setError, setNotice }) {
  const { rows, loading, error } = useMirror(device.id, "conversation", { limit: 200 });
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const msgs = useMirror(device.id, "message", { convKey: selected?.key, limit: 200 });
  const ordered = useMemo(() => [...msgs.rows].reverse(), [msgs.rows]);

  const toggle = async (row) => {
    setBusy(true);
    try {
      await sendCommand(device.id, "mute_conversation", { local_id: Number(row.key), muted: !row.data?.is_muted });
      setNotice("Đã gửi lệnh. Laptop sẽ thực hiện trong khoảng nửa phút.");
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  if (loading) return <Loading />;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className={`${cardClass} max-h-[70vh] overflow-y-auto`}>
        {error && <div className="mb-2 text-sm text-rose-200">{error}</div>}
        {!rows.length && <Empty>Chưa có hội thoại nào được đồng bộ.</Empty>}
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.key}>
              <button type="button" onClick={() => setSelected(row)} className={`w-full rounded-2xl border p-3 text-left text-sm transition ${selected?.key === row.key ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 hover:border-white/25"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{row.data?.display_name || `Khách #${row.key}`}</span>
                  {row.data?.is_muted ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] text-amber-200">AI đang tắt</span> : null}
                </div>
                <div className="mt-1 text-xs text-slate-400">{stateLabel[row.data?.state] || row.data?.state || "—"} · {fmtTs(row.ts)}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={`${cardClass} max-h-[70vh] overflow-y-auto`}>
        {!selected ? <Empty>Chọn một hội thoại để xem nội dung.</Empty> : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold">{selected.data?.display_name || `Khách #${selected.key}`}</h3>
              <button type="button" className={ghostButton} disabled={busy} onClick={() => toggle(selected)}>
                {selected.data?.is_muted ? "Bật lại AI cho khách này" : "Tắt AI (tôi tự trả lời)"}
              </button>
            </div>
            {selected.data?.muted_reason && <p className="mt-1 text-xs text-slate-400">Lý do tắt: {selected.data.muted_reason}</p>}
            {msgs.loading ? <Loading /> : !ordered.length ? <div className="mt-3"><Empty>Chưa có tin nhắn nào được đồng bộ (hoặc laptop đang tắt đồng bộ tin nhắn).</Empty></div> : (
              <ul className="mt-4 space-y-2">
                {ordered.map((m) => (
                  <li key={m.key} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.data?.role === "user" ? "bg-white/[0.07]" : "ml-auto bg-cyan-300/15 text-cyan-50"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.data?.content}</div>
                    <div className="mt-1 text-[11px] text-ink-3">{m.data?.role === "user" ? "Khách" : m.data?.role === "assistant" ? "AI" : m.data?.role} · {fmtTs(m.ts)}{m.data?.flagged ? " · đã gắn cờ" : ""}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Leads({ device }) {
  const leads = useMirror(device.id, "lead", { limit: 200 });
  const handovers = useMirror(device.id, "handover", { limit: 100 });
  if (leads.loading || handovers.loading) return <Loading />;
  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <h2 className="font-bold">Lead ({leads.rows.length})</h2>
        {!leads.rows.length ? <div className="mt-3"><Empty>Chưa có lead.</Empty></div> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-slate-400"><tr><th className="py-2">Công ty</th><th>MST</th><th>Liên hệ</th><th>Nhu cầu</th><th>Cập nhật</th></tr></thead>
              <tbody>
                {leads.rows.map((r) => (
                  <tr key={r.key} className="border-t border-white/10 align-top">
                    <td className="py-2 pr-2 font-semibold">{r.data?.company_name || r.data?.company || "—"}</td>
                    <td className="pr-2">{r.data?.tax_code || "—"}</td>
                    <td className="pr-2">{[r.data?.contact_name, r.data?.phone, r.data?.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="pr-2 text-slate-300">{r.data?.service || r.data?.need || "—"}</td>
                    <td className="text-xs text-slate-400">{fmtTs(r.ts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className={cardClass}>
        <h2 className="font-bold">Chuyển giao cho nhân viên ({handovers.rows.length})</h2>
        {!handovers.rows.length ? <div className="mt-3"><Empty>Chưa có lượt chuyển giao.</Empty></div> : (
          <ul className="mt-3 space-y-3">
            {handovers.rows.map((r) => (
              <li key={r.key} className="facs-card facs-tile rounded-2xl border border-cyan-300/[0.14] p-3 text-sm">
                <div className="flex justify-between gap-2"><span className="font-semibold">{r.data?.category || "Chuyển giao"}</span><span className="text-xs text-slate-400">{fmtTs(r.ts)}</span></div>
                {r.data?.reason && <p className="mt-1 text-slate-300">{r.data.reason}</p>}
                {r.data?.brief && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">{r.data.brief}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Groups({ device, setError, setNotice }) {
  const groups = useMirror(device.id, "group", { limit: 200 });
  const items = useMirror(device.id, "item", { limit: 200 });
  const [busy, setBusy] = useState("");
  const run = async (id, type, payload, okText) => {
    setBusy(id);
    try {
      await sendCommand(device.id, type, payload);
      setNotice(okText);
    } catch (e) {
      setError(e.message);
    }
    setBusy("");
  };
  if (groups.loading || items.loading) return <Loading />;
  const open = items.rows.filter((r) => r.data?.status === "OPEN");
  return (
    <div className="space-y-5">
      <div className={cardClass}>
        <h2 className="font-bold">Việc đang mở ({open.length})</h2>
        {!open.length ? <div className="mt-3"><Empty>Không có việc tồn.</Empty></div> : (
          <ul className="mt-3 space-y-2">
            <AnimatePresence initial={false}>
            {open.map((r) => (
              <motion.li key={r.key} layout {...listItem} className="facs-card facs-tile flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-300/[0.14] p-3 text-sm">
                <div><span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{r.data?.priority || "NORMAL"}</span>{r.data?.summary}<div className="mt-1 text-xs text-ink-3">{fmtTs(r.ts)}</div></div>
                <button type="button" className={ghostButton} disabled={busy === `i${r.key}`} onClick={() => run(`i${r.key}`, "resolve_item", { local_id: Number(r.key) }, "Đã gửi lệnh đánh dấu xong.")}><CheckCircle2 size={15} /> Xong</button>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <div className={cardClass}>
        <h2 className="font-bold">Nhóm Zalo ({groups.rows.length})</h2>
        {!groups.rows.length ? <div className="mt-3"><Empty>Chưa có nhóm.</Empty></div> : (
          <ul className="mt-3 space-y-2">
            {groups.rows.map((r) => (
              <li key={r.key} className="facs-card facs-tile flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-300/[0.14] p-3 text-sm">
                <div>
                  <span className="font-semibold">{r.data?.name || r.data?.code}</span>
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{r.data?.kind}</span>
                  {r.data?.client_company && <div className="text-xs text-slate-400">{r.data.client_company}</div>}
                </div>
                {r.data?.kind !== "CONTROL" && (
                  <div className="flex gap-2">
                    {r.data?.kind !== "CLIENT" && <button type="button" className={ghostButton} disabled={busy === r.key} onClick={() => run(r.key, "set_group", { group_id: r.key, kind: "CLIENT" }, "Đã gửi lệnh duyệt nhóm khách.")}>Duyệt là nhóm khách</button>}
                    {r.data?.kind !== "REJECTED" && <button type="button" className={ghostButton} disabled={busy === r.key} onClick={() => run(r.key, "set_group", { group_id: r.key, kind: "REJECTED" }, "Đã gửi lệnh loại nhóm.")}>Loại</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-3">Nhóm quản lý (CONTROL) chỉ đặt được trong Zalo hoặc dashboard trên laptop, không đổi từ xa.</p>
      </div>
    </div>
  );
}

function Security({ device }) {
  const { rows, loading } = useMirror(device.id, "security", { limit: 200 });
  if (loading) return <Loading />;
  const sev = { INFO: "text-slate-300", WARN: "text-amber-200", HIGH: "text-rose-200", CRITICAL: "text-rose-300" };
  return (
    <div className={cardClass}>
      <h2 className="flex items-center gap-2 font-bold"><ShieldAlert size={18} /> Nhật ký bảo mật ({rows.length})</h2>
      {!rows.length ? <div className="mt-3"><Empty>Chưa có sự kiện.</Empty></div> : (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="py-2">
              <span className={`mr-2 text-xs font-bold ${sev[r.data?.severity] || "text-slate-300"}`}>{r.data?.severity}</span>
              <span className="mr-2 text-xs text-ink-3">{r.data?.type}</span>{r.data?.detail}
              <div className="text-xs text-ink-3">{fmtTs(r.ts)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Config({ device, setError, setNotice }) {
  const { rows, loading } = useMirror(device.id, "config", { limit: 1 });
  const current = rows[0]?.data;
  if (loading) return <Loading />;
  if (!current) return <Empty>Laptop chưa gửi cấu hình. Chờ lần đồng bộ đầu tiên.</Empty>;
  return <ConfigForm key={rows[0].ts} deviceId={device.id} current={current} setError={setError} setNotice={setNotice} />;
}

function ConfigForm({ deviceId, current, setError, setNotice }) {
  const [aiEnabled, setAiEnabled] = useState(!!current.aiEnabled);
  const [systemPrompt, setSystemPrompt] = useState(current.systemPrompt || "");
  const [knowledgeBase, setKnowledgeBase] = useState(current.knowledgeBase || "");
  const [pricing, setPricing] = useState(JSON.stringify(current.pricing ?? {}, null, 2));
  const [company, setCompany] = useState(JSON.stringify(current.company ?? {}, null, 2));
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const save = async () => {
    setError("");
    let patch;
    try {
      patch = { aiEnabled, systemPrompt, knowledgeBase, pricing: JSON.parse(pricing), company: JSON.parse(company) };
    } catch {
      setError("Bảng giá hoặc thông tin công ty không phải JSON hợp lệ.");
      return;
    }
    // Chỉ gửi những mục thật sự đổi
    const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(current[k] ?? (k === "knowledgeBase" || k === "systemPrompt" ? "" : null))));
    if (!Object.keys(changed).length) {
      setNotice("Không có thay đổi nào.");
      setConfirm(false);
      return;
    }
    setBusy(true);
    try {
      await sendCommand(deviceId, "set_config", { patch: changed });
      setNotice(`Đã gửi lệnh đổi: ${Object.keys(changed).join(", ")}. Xem kết quả ở tab “Lệnh đã gửi”.`);
      setConfirm(false);
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  };

  return (
    <div className={`${cardClass} space-y-5`}>
      <p className="text-sm text-slate-400">Khóa OpenAI và model chỉ đổi được trực tiếp trên laptop (vì an toàn), không có ở đây. Laptop sẽ từ chối prompt sai quy tắc (thiếu {"{{CANARY}}"}, quá ngắn/dài).</p>
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} /> AI được phép trả lời khách (công tắc tổng)
      </label>
      <div>
        <div className="mb-1 text-sm font-semibold">Prompt hệ thống (luật cho AI)</div>
        <textarea className={`${inputClass} h-64 font-mono text-xs`} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
      </div>
      <div>
        <div className="mb-1 text-sm font-semibold">Kiến thức doanh nghiệp</div>
        <textarea className={`${inputClass} h-40`} value={knowledgeBase} onChange={(e) => setKnowledgeBase(e.target.value)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-1 text-sm font-semibold">Bảng giá (JSON)</div>
          <textarea className={`${inputClass} h-56 font-mono text-xs`} value={pricing} onChange={(e) => setPricing(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 text-sm font-semibold">Thông tin công ty (JSON)</div>
          <textarea className={`${inputClass} h-56 font-mono text-xs`} value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
      </div>
      {confirm ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-amber-200">Gửi thay đổi xuống AI Zalo?</span>
          <button type="button" className={primaryButton} onClick={save} disabled={busy}><Save size={16} /> Xác nhận gửi</button>
          <button type="button" className={ghostButton} onClick={() => setConfirm(false)}>Hủy</button>
        </div>
      ) : (
        <button type="button" className={primaryButton} onClick={() => setConfirm(true)}><Save size={16} /> Gửi cấu hình xuống AI Zalo</button>
      )}
    </div>
  );
}

function Commands({ device }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setRows(await listCommands(device.id));
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [device.id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);
  if (loading) return <Loading />;
  const style = { pending: "text-slate-300", delivered: "text-cyan-200", done: "text-emerald-200", failed: "text-rose-200" };
  return (
    <div className={cardClass}>
      <h2 className="font-bold">Lệnh gần đây</h2>
      {error && <div className="mt-2 text-sm text-rose-200">{error}</div>}
      {!rows.length ? <div className="mt-3"><Empty>Chưa gửi lệnh nào.</Empty></div> : (
        <ul className="mt-3 divide-y divide-white/10 text-sm">
          <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li key={r.id} layout {...listItem} className="py-2">
              <span className="font-semibold">{commandLabel[r.type] || r.type}</span>
              <span className={`ml-2 text-xs font-bold ${style[r.status]}`}>{commandStatusLabel[r.status] || r.status}</span>
              {r.result && <div className="text-xs text-slate-400">{r.result}</div>}
              <div className="text-xs text-ink-3">{fmtIso(r.created_at)}</div>
            </motion.li>
          ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
