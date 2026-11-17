import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Loader2, Save, Send } from "lucide-react";
import {
  captionLimits,
  defaultScheduleValue,
  infographicToJpegBlob,
  listSocialAccounts,
  listSocialPosts,
  localInputToIso,
  platformName,
  postStatusLabel,
  saveSocialPost,
  uploadSocialJpeg,
} from "../../lib/hubSocial";

const inputClass = "w-full rounded-2xl border border-white/10 bg-[#0d1726]/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50";
const labelClass = "mb-2 block text-sm font-semibold text-slate-200";
const ghostButton = "inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-white disabled:opacity-50";
const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-[#071421] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";

const fmt = (value) => (value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "");

/**
 * Khung hẹn giờ / đăng bài cho một kênh (Facebook, LinkedIn, Instagram) của bộ nội dung đang mở.
 * Không có gì được đăng nếu anh/chị chưa bấm "Duyệt & hẹn giờ" hoặc "Xác nhận đăng ngay".
 */
export default function HubSchedulePanel({ channel, caption, infographic, itemId }) {
  const [accounts, setAccounts] = useState([]);
  const [recent, setRecent] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [text, setText] = useState(caption || "");
  const [withImage, setWithImage] = useState(channel === "instagram");
  const [linkUrl, setLinkUrl] = useState("");
  const [when, setWhen] = useState(defaultScheduleValue());
  const [busy, setBusy] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const imageCache = useRef({ key: "", path: "" });

  const hasInfographic = !!(infographic?.title && (infographic.points?.length || infographic.stats?.length));
  const limit = captionLimits[channel];

  const refresh = async () => {
    try {
      const [acc, posts] = await Promise.all([listSocialAccounts(), listSocialPosts(50)]);
      const usable = acc.filter((a) => a.platform === channel && a.status === "connected");
      setAccounts(usable);
      setAccountId((current) => (usable.some((a) => a.id === current) ? current : usable[0]?.id || ""));
      setRecent(posts.filter((p) => p.platform === channel && itemId && p.content_item_id === itemId).slice(0, 3));
    } catch (loadError) {
      setError(/hub_social|schema cache|does not exist/i.test(loadError.message) ? "Chưa cài đặt phần đăng bài trên cơ sở dữ liệu (xem trang Đăng & lịch đăng)." : loadError.message);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, itemId]);

  const submit = async (mode) => {
    setError("");
    setNotice("");
    setConfirmNow(false);
    if (!itemId) return setError("Hãy lưu bộ nội dung trước (bấm Tạo nội dung hoặc mở bộ nội dung đã lưu).");
    if (!accountId) return setError("Chưa chọn tài khoản đăng bài.");
    if (mode === "schedule" && !localInputToIso(when)) return setError("Giờ đăng không hợp lệ.");
    setBusy(mode);
    try {
      let imagePath = null;
      if (withImage) {
        if (!hasInfographic) throw new Error("Chưa có infographic để đính kèm. Hãy tạo infographic trước.");
        const key = JSON.stringify(infographic);
        if (imageCache.current.key !== key) {
          imageCache.current = { key, path: await uploadSocialJpeg(await infographicToJpegBlob(infographic), infographic.title) };
        }
        imagePath = imageCache.current.path;
      }
      const result = await saveSocialPost({
        contentItemId: itemId,
        accountId,
        caption: text,
        imagePath,
        linkUrl: withImage ? "" : linkUrl,
        mode,
        scheduledAt: mode === "schedule" ? localInputToIso(when) : null,
      });
      setNotice(
        mode === "now"
          ? `Đã đăng lên ${platformName[channel]}.`
          : mode === "schedule"
            ? `Đã duyệt & hẹn giờ ${fmt(result.post?.scheduled_at)}. Có thể huỷ ở trang Đăng & lịch đăng.`
            : "Đã lưu bản nháp.",
      );
      await refresh();
    } catch (submitError) {
      setError(submitError.message);
      if (submitError.post) await refresh();
    } finally {
      setBusy("");
    }
  };

  if (!loaded) return <div className="mt-6 text-sm text-slate-500"><Loader2 size={14} className="mr-2 inline animate-spin" />Đang tải…</div>;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d1726]/40 p-5">
      <div className="flex items-center gap-2 font-serif text-lg font-bold text-white"><CalendarClock size={18} className="text-cyan-300" /> Đăng lên {platformName[channel]}</div>

      {!accounts.length ? (
        <p className="mt-3 text-sm text-slate-400">
          Chưa có tài khoản {platformName[channel]} nào được kết nối. <Link to="/admin/hub/social" className="font-semibold text-cyan-300 underline">Kết nối tại trang Đăng & lịch đăng</Link>.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className={labelClass}>Tài khoản</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Nội dung sẽ đăng</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={inputClass} />
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
              <span className={text.length > limit ? "text-rose-300" : "text-slate-500"}>{text.length}/{limit} ký tự</span>
              <button type="button" className="text-cyan-300 underline" onClick={() => setText(caption || "")}>Lấy lại nội dung ở trên</button>
            </div>
          </label>

          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={withImage}
              disabled={channel === "instagram" || !hasInfographic}
              onChange={(e) => setWithImage(e.target.checked)}
              className="h-4 w-4 accent-cyan-300"
            />
            Đính kèm infographic (ảnh JPG 1080 × 1350){channel === "instagram" && " — Instagram bắt buộc có ảnh"}
            {!hasInfographic && <span className="text-xs text-amber-300">Chưa có infographic: hãy chọn tạo Infographic.</span>}
          </label>

          {!withImage && channel !== "instagram" && (
            <label className="block">
              <span className={labelClass}>Link đính kèm (không bắt buộc, https)</span>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://facs.vn/insights/…" className={inputClass} />
            </label>
          )}

          <label className="block max-w-xs">
            <span className={labelClass}>Giờ đăng (giờ Việt Nam)</span>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} onClick={() => submit("schedule")} disabled={!!busy}>
              {busy === "schedule" ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />} Duyệt & hẹn giờ
            </button>
            <button type="button" className={ghostButton} onClick={() => submit("draft")} disabled={!!busy}>
              {busy === "draft" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu nháp
            </button>
            {confirmNow ? (
              <span className="flex items-center gap-2 text-sm">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 font-bold text-[#2a1b00]" onClick={() => submit("now")} disabled={!!busy}>
                  {busy === "now" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Xác nhận đăng ngay
                </button>
                <button type="button" className={ghostButton} onClick={() => setConfirmNow(false)}>Không</button>
              </span>
            ) : (
              <button type="button" className={ghostButton} onClick={() => setConfirmNow(true)} disabled={!!busy}><Send size={15} /> Đăng ngay</button>
            )}
          </div>
          <p className="text-xs leading-5 text-slate-500">Bài sẽ hiển thị công khai trên {platformName[channel]}. Hãy rà soát số liệu và mục “Cần chuyên gia kiểm tra” trước khi duyệt.</p>
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</div>}
      {notice && <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-100"><CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {notice}</div>}

      {recent.length > 0 && (
        <div className="mt-4 space-y-1 text-xs text-slate-400">
          <div className="font-semibold text-slate-300">Bài gần đây của bộ nội dung này</div>
          {recent.map((p) => (
            <div key={p.id}>
              {postStatusLabel[p.status]} · {p.status === "published" ? fmt(p.published_at) : p.scheduled_at ? fmt(p.scheduled_at) : fmt(p.created_at)}
              {p.external_url && <> · <a href={p.external_url} target="_blank" rel="noreferrer noopener" className="text-cyan-300 underline">Mở bài</a></>}
              {p.error && <span className="text-rose-300"> · {p.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
