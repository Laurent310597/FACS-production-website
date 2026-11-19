import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Plug, RefreshCw, Unplug, XCircle } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { AnimatePresence, motion } from "framer-motion";
import { useToastSetter } from "../../components/admin/ui/toastContext";
import { SkeletonRows } from "../../components/admin/ui/Skeleton";
import { listItem } from "../../components/admin/ui/motionPresets";
import {
  cancelSocialPost,
  disconnectSocialAccount,
  getCronReady,
  getSocialStatus,
  listSocialAccounts,
  listSocialPosts,
  platformName,
  postStatusLabel,
  startSocialConnect,
} from "../../lib/hubSocial";
import * as ui from "../../components/admin/ui/styles";

const cardClass = ui.card;
const ghostButton = ui.btnSecondary;

const fmt = (value) => (value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "—");
const statusStyle = {
  draft: "bg-slate-500/20 text-slate-300",
  scheduled: "bg-cyan-400/15 text-cyan-200",
  publishing: "bg-amber-400/15 text-amber-200",
  published: "bg-emerald-400/15 text-emerald-200",
  failed: "bg-rose-400/15 text-rose-200",
  cancelled: "bg-slate-500/20 text-slate-400",
};
const accountStatusLabel = { connected: "Đã kết nối", expired: "Hết hạn – cần kết nối lại", error: "Lỗi", disconnected: "Đã gỡ" };

function daysLeft(value) {
  if (!value) return null;
  return Math.floor((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export default function AdminHubSocialPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [cronReady, setCronReady] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  // Kết quả quay về sau khi kết nối (Facebook/LinkedIn chuyển hướng về trang này) được đọc một lần khi mở trang.
  const [error, setError] = useState(() => searchParams.get("error") || "");
  const [connectedNotice] = useState(() => {
    const connected = searchParams.get("connected");
    return connected ? `Đã kết nối ${connected === "linkedin" ? "LinkedIn" : "Facebook/Instagram"} (${searchParams.get("count") || 1} tài khoản).` : "";
  });
  const setNotice = useToastSetter("success", connectedNotice);
  const [confirmId, setConfirmId] = useState("");
  const [setupMissing, setSetupMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [acc, pst] = await Promise.all([listSocialAccounts(), listSocialPosts()]);
      setAccounts(acc);
      setPosts(pst);
      setSetupMissing(false);
    } catch (loadError) {
      if (/hub_social|schema cache|does not exist/i.test(loadError.message)) setSetupMissing(true);
      else setError(loadError.message);
    }
    getSocialStatus().then(setStatus).catch(() => setStatus(null));
    getCronReady().then(setCronReady);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") || searchParams.get("error")) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const connect = async (platform) => {
    setBusy(platform);
    setError("");
    try {
      window.location.assign(await startSocialConnect(platform));
    } catch (connectError) {
      setError(connectError.message);
      setBusy("");
    }
  };

  const disconnect = async (id) => {
    setBusy(id);
    setError("");
    try {
      await disconnectSocialAccount(id);
      setConfirmId("");
      setNotice("Đã gỡ kết nối. Các bài đang hẹn giờ của tài khoản này đã được huỷ.");
      await load();
    } catch (disconnectError) {
      setError(disconnectError.message);
    } finally {
      setBusy("");
    }
  };

  const cancelPost = async (id) => {
    setBusy(id);
    setError("");
    try {
      await cancelSocialPost(id);
      await load();
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setBusy("");
    }
  };

  const accountName = (id) => {
    const a = accounts.find((row) => row.id === id);
    return a ? `${platformName[a.platform]} · ${a.display_name}` : "—";
  };
  const activeAccounts = accounts.filter((a) => a.status !== "disconnected");

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sunset">FACS Hub</div>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white">Đăng & lịch đăng mạng xã hội</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Kết nối Facebook Fanpage, Instagram và LinkedIn cá nhân bằng quyền chính thức. Bài chỉ được đăng khi anh/chị bấm “Duyệt & hẹn giờ” hoặc “Đăng ngay” trong trang Tạo nội dung; không có gì tự đăng.
          </p>
        </div>
        <button type="button" className={ghostButton} onClick={load} disabled={loading}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Làm mới
        </button>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-sm text-rose-100">{error}</div>}
      {setupMissing && (
        <div className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
          Cơ sở dữ liệu chưa có các bảng đăng bài (migration 20261117020000_facs_hub_social.sql). Cần chạy migration này trên Supabase.
        </div>
      )}

      <section className={cardClass}>
        <h2 className="font-serif text-xl font-bold text-white">1. Tài khoản đã kết nối</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={ghostButton} onClick={() => connect("facebook")} disabled={busy === "facebook" || status?.meta_configured === false}>
            {busy === "facebook" ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />} Kết nối Facebook & Instagram
          </button>
          <button type="button" className={ghostButton} onClick={() => connect("linkedin")} disabled={busy === "linkedin" || status?.linkedin_configured === false}>
            {busy === "linkedin" ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />} Kết nối LinkedIn
          </button>
        </div>
        {status && (!status.meta_configured || !status.linkedin_configured || cronReady === false) && (
          <div className="mt-4 space-y-1 rounded-2xl border border-amber-300/20 bg-amber-400/5 p-4 text-sm text-amber-100">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> Còn thiếu cấu hình trên Supabase (Edge Function Secrets):</div>
            {!status.meta_configured && <div>• Facebook/Instagram: META_APP_ID, META_APP_SECRET</div>}
            {!status.linkedin_configured && <div>• LinkedIn: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET</div>}
            {cronReady === false && <div>• Bộ hẹn giờ mỗi phút chưa bật (cần chạy migration 20261117030000_facs_hub_social_cron.sql)</div>}
            <div className="pt-1 text-xs text-amber-200/80">Địa chỉ chuyển hướng (Redirect URI) cần khai báo ở cả Meta và LinkedIn: <span className="break-all font-mono">{status.redirect_uri}</span></div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {!activeAccounts.length && !loading && <p className="text-sm text-ink-3">Chưa có tài khoản nào được kết nối.</p>}
          {activeAccounts.map((account) => {
            const left = daysLeft(account.token_expires_at);
            const soon = left !== null && left <= 10;
            return (
              <div key={account.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-cms-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white">{platformName[account.platform]} · {account.display_name}</div>
                  <div className="mt-0.5 text-xs text-ink-3">
                    {account.status === "connected" ? <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 size={12} /> {accountStatusLabel.connected}</span> : <span className="inline-flex items-center gap-1 text-rose-300"><XCircle size={12} /> {accountStatusLabel[account.status]}</span>}
                    {account.token_expires_at && <span className={soon ? "ml-3 text-amber-300" : "ml-3"}>Hết hạn {fmt(account.token_expires_at)}{left !== null && left >= 0 ? ` (còn ${left} ngày)` : ""}</span>}
                    {account.last_error && <span className="ml-3 text-rose-300">{account.last_error}</span>}
                  </div>
                </div>
                {(account.status !== "connected" || soon) && (
                  <button type="button" className={ghostButton} onClick={() => connect(account.platform === "linkedin" ? "linkedin" : "facebook")}><Plug size={14} /> Kết nối lại</button>
                )}
                {confirmId === account.id ? (
                  <span className="flex items-center gap-2 text-sm">
                    <button type="button" className="rounded-xl bg-rose-400 px-3 py-1.5 font-bold text-[#240a0a]" onClick={() => disconnect(account.id)} disabled={busy === account.id}>Gỡ kết nối</button>
                    <button type="button" className={ghostButton} onClick={() => setConfirmId("")}>Không</button>
                  </span>
                ) : (
                  <button type="button" className={ghostButton} onClick={() => setConfirmId(account.id)}><Unplug size={14} /> Gỡ</button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-ink-3">LinkedIn cấp mã có hiệu lực khoảng 60 ngày; hết hạn cần bấm “Kết nối lại”. Mã kết nối được lưu ở bảng chỉ máy chủ đọc được, trình duyệt không thấy.</p>
      </section>

      <section className={`${cardClass} mt-6`}>
        <h2 className="font-serif text-xl font-bold text-white">2. Hàng đợi & lịch sử đăng</h2>
        <p className="mt-1 text-sm text-slate-400">Hệ thống kiểm tra giờ hẹn mỗi phút. Bài lỗi sẽ không tự đăng lại, để tránh đăng trùng.</p>
        <div className="mt-4 space-y-3">
          {loading && !posts.length && <SkeletonRows rows={3} />}
          {!posts.length && !loading && <p className="text-sm text-ink-3">Chưa có bài đăng nào.</p>}
          <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.div key={post.id} layout {...listItem} className="facs-card facs-tile rounded-2xl border border-cyan-300/[0.14] bg-cms-2 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyle[post.status]}`}>{postStatusLabel[post.status]}</span>
                <span className="text-sm font-semibold text-white">{accountName(post.account_id)}</span>
                <span className="text-xs text-ink-3">
                  {post.status === "published" ? `Đăng lúc ${fmt(post.published_at)}` : post.scheduled_at ? `Hẹn ${fmt(post.scheduled_at)}` : `Tạo ${fmt(post.created_at)}`}
                </span>
                <span className="ml-auto flex items-center gap-2">
                  {post.external_url && <a href={post.external_url} target="_blank" rel="noreferrer noopener" className={ghostButton}><ExternalLink size={14} /> Mở bài</a>}
                  {post.content_item_id && post.status !== "published" && <Link to={`/admin/hub/content?item=${post.content_item_id}`} className={ghostButton}>Mở bộ nội dung</Link>}
                  {["draft", "scheduled", "failed"].includes(post.status) && (
                    <button type="button" className={ghostButton} onClick={() => cancelPost(post.id)} disabled={busy === post.id}>Huỷ</button>
                  )}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{post.caption}</p>
              {post.image_path && <div className="mt-1 text-xs text-ink-3">Kèm 1 ảnh</div>}
              {post.error && <div className="mt-2 rounded-xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{post.error}</div>}
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      </section>
    </AdminLayout>
  );
}
