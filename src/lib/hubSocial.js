import { drawInfographic, preloadInfographicAssets } from "./hubInfographic";
import { supabase } from "./supabaseClient";

// FACS Hub phần 3: kết nối mạng xã hội và lịch đăng. Mọi thao tác ghi đi qua Edge Function hub-social (có kiểm tra phía máy chủ).

const LIBRARY_BUCKET = "hub-library";

export const socialPlatforms = [
  { value: "facebook", label: "Facebook Fanpage" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn cá nhân" },
];
export const platformName = Object.fromEntries(socialPlatforms.map((p) => [p.value, p.label]));
export const captionLimits = { facebook: 63000, instagram: 2200, linkedin: 3000 };

export const postStatusLabel = {
  draft: "Bản nháp",
  scheduled: "Đã hẹn giờ",
  publishing: "Đang đăng",
  published: "Đã đăng",
  failed: "Lỗi",
  cancelled: "Đã huỷ",
};

export async function invokeHubSocial(payload) {
  const { data, error } = await supabase.functions.invoke("hub-social", { body: payload });
  if (error) {
    let message = error.message || "Không thể gọi Edge Function hub-social.";
    let details = null;
    try {
      details = await error.context?.json?.();
      message = details?.error || details?.message || message;
    } catch {
      // Giữ thông báo gốc.
    }
    if (!details && /not found|404|Failed to send/i.test(message)) message = "Edge Function hub-social chưa được triển khai trên Supabase.";
    const err = new Error(message);
    err.post = details?.post || null;
    throw err;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const getSocialStatus = () => invokeHubSocial({ action: "status" });

/** Bộ hẹn giờ mỗi phút (pg_cron) đã được bật chưa. */
export async function getCronReady() {
  const { data, error } = await supabase.rpc("hub_social_cron_ready");
  return error ? null : data === true;
}

export async function startSocialConnect(platform) {
  const data = await invokeHubSocial({ action: "connect_start", platform, origin: window.location.origin });
  return data.url;
}

export const disconnectSocialAccount = (accountId) => invokeHubSocial({ action: "disconnect", account_id: accountId });
export const cancelSocialPost = (id) => invokeHubSocial({ action: "cancel_post", id });

/** mode: 'draft' | 'schedule' | 'now' */
export async function saveSocialPost({ id, contentItemId, accountId, caption, imagePath, linkUrl, mode, scheduledAt }) {
  return invokeHubSocial({
    action: "save_post",
    id: id || undefined,
    content_item_id: contentItemId || null,
    account_id: accountId,
    caption,
    image_path: imagePath || null,
    link_url: linkUrl || null,
    mode,
    scheduled_at: scheduledAt || null,
  });
}

export async function listSocialAccounts() {
  const { data, error } = await supabase.from("hub_social_accounts").select("*").order("platform").order("display_name");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listSocialPosts(limit = 100) {
  const { data, error } = await supabase
    .from("hub_social_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Vẽ infographic ra ảnh JPEG (Instagram chỉ nhận JPEG; Facebook và LinkedIn nhận được). */
export async function infographicToJpegBlob(data) {
  const canvas = document.createElement("canvas");
  await preloadInfographicAssets();
  await document.fonts?.ready;
  drawInfographic(canvas, data); // vẽ lại sau khi font đã sẵn sàng để đo chữ chính xác
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Không xuất được ảnh infographic."))), "image/jpeg", 0.92);
  });
}

/**
 * Chuyển ảnh infographic do người dùng tự làm (JPG/PNG/WebP) sang JPEG để đăng mạng xã hội.
 * Nền trong suốt được đặt lên nền trắng; ảnh quá lớn được thu nhỏ (cạnh dài tối đa 2048 px).
 */
export async function imageFileToJpeg(file) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Ảnh quá lớn (tối đa 15 MB).");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Không đọc được ảnh này. Hãy thử xuất lại ảnh dưới dạng JPG hoặc PNG.");
  }
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  for (const quality of [0.92, 0.85, 0.75]) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 8 * 1024 * 1024) return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
  }
  throw new Error("Ảnh vẫn quá nặng sau khi nén. Hãy dùng ảnh nhỏ hơn.");
}

/** Instagram nhận ảnh có tỉ lệ rộng/cao từ 0,8 (4:5) đến 1,91. */
export const instagramImageRatioOk = (width, height) => !!width && !!height && width / height >= 0.8 - 1e-9 && width / height <= 1.91 + 1e-9;

export async function uploadSocialJpeg(blob, baseName = "infographic") {
  if (blob.size > 8 * 1024 * 1024) throw new Error("Ảnh quá lớn (tối đa 8 MB).");
  const safe = String(baseName).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "infographic";
  const path = `social/${crypto.randomUUID()}/${safe}.jpg`;
  const { error } = await supabase.storage.from(LIBRARY_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function socialImageUrl(path) {
  if (!path) return null;
  const { data } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

/** Giá trị cho <input type="datetime-local"> theo giờ máy, mặc định 1 giờ sau. */
export function defaultScheduleValue(offsetMinutes = 60) {
  const d = new Date(Date.now() + offsetMinutes * 60_000);
  d.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
