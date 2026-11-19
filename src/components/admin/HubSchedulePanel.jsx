import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, ImagePlus, Loader2, Save, Send, X } from "lucide-react";
import { useToastSetter } from "./ui/toastContext";
import {
  captionLimits,
  defaultScheduleValue,
  imageFileToJpeg,
  instagramImageRatioOk,
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

// Ảnh tự tải lên được nhớ theo bộ nội dung để dùng chung giữa các tab Facebook / LinkedIn / Instagram.
const uploadedByItem = new Map();

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
  const cached = itemId ? uploadedByItem.get(itemId) : null;
  // none = không ảnh, uploaded = ảnh tự tải lên (infographic làm bên ngoài), generated = infographic tạo trong Hub
  const [imageMode, setImageMode] = useState(cached ? "uploaded" : channel === "instagram" ? (infographic?.title && (infographic.points?.length || infographic.stats?.length) ? "generated" : "uploaded") : "none");
  const [uploaded, setUploaded] = useState(cached || null);
  const uploadedPathRef = useRef({ blob: null, path: "" });
  const [linkUrl, setLinkUrl] = useState("");
  const [when, setWhen] = useState(defaultScheduleValue());
  const [busy, setBusy] = useState("");
  const [confirmNow, setConfirmNow] = useState(false);
  const [error, setError] = useState("");
  const setNotice = useToastSetter("success");
  const [loaded, setLoaded] = useState(false);
  const imageCache = useRef({ key: "", path: "" });

  const withImage = imageMode !== "none";
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

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const result = await imageFileToJpeg(file);
      if (channel === "instagram" && !instagramImageRatioOk(result.width, result.height)) {
        URL.revokeObjectURL(result.previewUrl);
        throw new Error("Instagram chỉ nhận ảnh có tỉ lệ từ 4:5 (đứng) đến 1,91:1 (ngang). Ảnh này nằm ngoài khoảng đó, hãy cắt lại (ví dụ 1080 × 1350).");
      }
      if (uploaded?.previewUrl) URL.revokeObjectURL(uploaded.previewUrl);
      const entry = { ...result, name: file.name };
      setUploaded(entry);
      if (itemId) uploadedByItem.set(itemId, entry);
      setImageMode("uploaded");
    } catch (pickError) {
      setError(pickError.message);
    }
  };

  const clearUploaded = () => {
    if (uploaded?.previewUrl) URL.revokeObjectURL(uploaded.previewUrl);
    setUploaded(null);
    if (itemId) uploadedByItem.delete(itemId);
    setImageMode(channel === "instagram" ? (hasInfographic ? "generated" : "uploaded") : "none");
  };

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
      if (imageMode === "uploaded") {
        if (!uploaded) throw new Error("Chưa chọn ảnh để đính kèm.");
        // Mỗi ảnh chỉ tải lên một lần dù hẹn giờ/đăng nhiều lần.
        if (uploadedPathRef.current.blob !== uploaded.blob) {
          uploadedPathRef.current = { blob: uploaded.blob, path: await uploadSocialJpeg(uploaded.blob, uploaded.name?.replace(/\.[^.]+$/, "") || "infographic") };
        }
        imagePath = uploadedPathRef.current.path;
      } else if (imageMode === "generated") {
        if (!hasInfographic) throw new Error("Chưa có infographic tạo trong Hub. Hãy tải ảnh lên hoặc tạo infographic trước.");
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

          <div>
            <span className={labelClass}>Ảnh đính kèm{channel === "instagram" && " (Instagram bắt buộc có ảnh)"}</span>
            <div className="space-y-2 text-sm text-slate-200">
              {channel !== "instagram" && (
                <label className="flex items-center gap-2"><input type="radio" name={`img-${channel}`} checked={imageMode === "none"} onChange={() => setImageMode("none")} className="accent-cyan-300" /> Không kèm ảnh</label>
              )}
              <label className="flex items-center gap-2">
                <input type="radio" name={`img-${channel}`} checked={imageMode === "uploaded"} onChange={() => setImageMode("uploaded")} disabled={!uploaded} className="accent-cyan-300" />
                Ảnh infographic của tôi (tải lên)
                {!uploaded && <span className="text-xs text-slate-500">— chọn ảnh ở bên dưới</span>}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name={`img-${channel}`} checked={imageMode === "generated"} onChange={() => setImageMode("generated")} disabled={!hasInfographic} className="accent-cyan-300" />
                Infographic tạo trong Hub (JPG 1080 × 1350)
                {!hasInfographic && <span className="text-xs text-slate-500">— chưa có</span>}
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className={`${ghostButton} cursor-pointer`}>
                <ImagePlus size={15} /> {uploaded ? "Đổi ảnh" : "Tải ảnh infographic lên"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden" />
              </label>
              {uploaded && (
                <span className="flex items-center gap-3">
                  <img src={uploaded.previewUrl} alt="Ảnh sẽ đăng" className="h-24 w-auto rounded-lg border border-white/10" />
                  <span className="text-xs text-slate-400">{uploaded.name}<br />{uploaded.width} × {uploaded.height}px</span>
                  <button type="button" onClick={clearUploaded} className="text-slate-400 hover:text-white" aria-label="Bỏ ảnh"><X size={16} /></button>
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Nhận JPG, PNG, WebP (tối đa 15 MB); hệ thống tự đổi sang JPG. Nên dùng khổ đứng 1080 × 1350 (4:5).</p>
          </div>

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
