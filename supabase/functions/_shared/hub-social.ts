// Logic thuần (không gọi mạng) cho FACS Hub phần 3: kết nối & đăng mạng xã hội.
// Tách riêng để kiểm thử được bằng `npm run qa:hub-social`.

export type SocialPlatform = "facebook" | "instagram" | "linkedin";
export const SOCIAL_PLATFORMS: SocialPlatform[] = ["facebook", "instagram", "linkedin"];

/** Phiên bản API để ở một nơi duy nhất; đổi bằng secret khi cần, không phải sửa code. */
export const DEFAULT_GRAPH_VERSION = "v25.0";
export const DEFAULT_LINKEDIN_VERSION = "202608";

export const CAPTION_LIMITS: Record<SocialPlatform, number> = {
  facebook: 63000,
  instagram: 2200,
  linkedin: 3000,
};

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];
export const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const IMAGE_PATH = new RegExp(`^social/${UUID}/[A-Za-z0-9._-]{1,80}\\.(png|jpe?g)$`, "i");

/** Chỉ nhận ảnh trong thư mục social/ của bucket hub-library, không cho ../ hay đường dẫn khác. */
export function validateSocialImagePath(path: unknown): string {
  if (typeof path !== "string" || !IMAGE_PATH.test(path) || path.includes("..")) {
    throw new Error("Đường dẫn ảnh không hợp lệ.");
  }
  return path;
}

export function isPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && (SOCIAL_PLATFORMS as string[]).includes(value);
}

export type PostCheck = { ok: true; caption: string } | { ok: false; error: string };

/** Kiểm tra nội dung trước khi cho vào hàng đợi. Không tự cắt chữ: nếu quá dài thì báo để người duyệt sửa. */
export function checkCaption(platform: SocialPlatform, raw: unknown, hasImage: boolean): PostCheck {
  const caption = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
  if (!caption) return { ok: false, error: "Nội dung bài đăng đang trống." };
  const limit = CAPTION_LIMITS[platform];
  if (caption.length > limit) {
    return { ok: false, error: `Nội dung dài ${caption.length} ký tự, vượt giới hạn ${limit} của ${platformLabel(platform)}. Hãy rút gọn trước khi đăng.` };
  }
  if (platform === "instagram") {
    if (!hasImage) return { ok: false, error: "Instagram bắt buộc phải có ảnh (ví dụ infographic)." };
    const tags = caption.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
    if (tags > 30) return { ok: false, error: `Có ${tags} hashtag, Instagram chỉ cho tối đa 30.` };
  }
  return { ok: true, caption };
}

export function platformLabel(p: SocialPlatform): string {
  return p === "facebook" ? "Facebook" : p === "instagram" ? "Instagram" : "LinkedIn";
}

export type ScheduleCheck = { ok: true; at: Date } | { ok: false; error: string };

/** Giờ hẹn phải ở tương lai (trừ 'đăng ngay') và không quá 1 năm. */
export function checkScheduledAt(value: unknown, now = new Date()): ScheduleCheck {
  if (typeof value !== "string") return { ok: false, error: "Chưa chọn giờ đăng." };
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return { ok: false, error: "Giờ đăng không hợp lệ." };
  if (at.getTime() < now.getTime() + 60_000) return { ok: false, error: "Giờ đăng phải sau thời điểm hiện tại ít nhất 1 phút." };
  if (at.getTime() > now.getTime() + 366 * 86_400_000) return { ok: false, error: "Chỉ hẹn giờ trong vòng 1 năm." };
  return { ok: true, at };
}

export function graphBase(version?: string | null): string {
  const v = (version ?? "").trim();
  return `https://graph.facebook.com/${/^v\d+\.\d+$/.test(v) ? v : DEFAULT_GRAPH_VERSION}`;
}

export function linkedinVersion(version?: string | null): string {
  const v = (version ?? "").trim();
  return /^\d{6}$/.test(v) ? v : DEFAULT_LINKEDIN_VERSION;
}

export function metaAuthorizeUrl(opts: { appId: string; redirectUri: string; state: string; version?: string | null }): string {
  const v = /^v\d+\.\d+$/.test((opts.version ?? "").trim()) ? opts.version!.trim() : DEFAULT_GRAPH_VERSION;
  const u = new URL(`https://www.facebook.com/${v}/dialog/oauth`);
  u.searchParams.set("client_id", opts.appId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", META_SCOPES.join(","));
  return u.toString();
}

export function linkedinAuthorizeUrl(opts: { clientId: string; redirectUri: string; state: string }): string {
  const u = new URL("https://www.linkedin.com/oauth/v2/authorization");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", opts.clientId);
  u.searchParams.set("redirect_uri", opts.redirectUri);
  u.searchParams.set("state", opts.state);
  u.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  return u.toString();
}

/** state = platform + "." + chuỗi ngẫu nhiên; chỉ băm SHA-256 mới lưu trong DB. */
export function makeState(platform: "facebook" | "linkedin"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const rand = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${platform}.${rand}`;
}

export function platformFromState(state: string): "facebook" | "linkedin" | null {
  const p = state.split(".")[0];
  return p === "facebook" || p === "linkedin" ? p : null;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** So sánh thời gian cố định để kiểm tra secret của cron. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Chuyển lỗi API thành câu tiếng Việt dễ hiểu, không lộ token. */
export function friendlyError(platform: SocialPlatform, status: number, body: unknown): string {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "");
  const redacted = text.replace(/(access_token|token|client_secret)["':=\s]+[A-Za-z0-9._~+/-]{8,}/gi, "$1=***").slice(0, 400);
  if (platform === "linkedin") {
    if (status === 401) return "LinkedIn từ chối: mã kết nối đã hết hạn. Hãy bấm Kết nối lại LinkedIn.";
    if (status === 403) return "LinkedIn từ chối: thiếu quyền w_member_social. Kiểm tra app đã thêm sản phẩm 'Share on LinkedIn'.";
    if (status === 426) return "LinkedIn báo phiên bản API đã hết hạn. Cần cập nhật HUB_LINKEDIN_VERSION.";
    if (status === 429) return "LinkedIn giới hạn số bài trong ngày. Thử lại sau 0h UTC.";
  } else {
    if (/"code"\s*:\s*(190|102)/.test(text) || status === 401) return "Meta từ chối: mã kết nối đã hết hạn hoặc bị thu hồi. Hãy kết nối lại Facebook/Instagram.";
    if (/"code"\s*:\s*(10|200|283)/.test(text) || status === 403) return "Meta từ chối: thiếu quyền đăng bài. Kiểm tra app Meta và quyền của tài khoản trên Page.";
    if (/"code"\s*:\s*(4|17|32|613)/.test(text) || status === 429) return "Meta giới hạn tần suất gọi API. Thử lại sau ít phút.";
    if (/"code"\s*:\s*9004|2207/.test(text)) return "Instagram không tải được ảnh. Kiểm tra ảnh là JPG/PNG hợp lệ, tỉ lệ 4:5 đến 1.91:1.";
  }
  return `${platformLabel(platform)} trả lỗi ${status}: ${redacted}`;
}

/**
 * LinkedIn dùng "little text format": các ký tự | { } @ [ ] ( ) < > * _ ~ \ là ký tự đặc biệt và làm CỤT bài nếu không escape.
 * Giữ nguyên #hashtag (chữ/số theo sau) để LinkedIn tự nhận hashtag; '#' lẻ thì escape.
 */
export function escapeLinkedInText(text: string): string {
  return text
    .replace(/[\\|{}@\[\]()<>*_~]/g, (c) => `\\${c}`)
    .replace(/#(?![\p{L}\p{N}])/gu, "\\#");
}

/** Instagram Content Publishing API chỉ nhận ảnh JPEG. */
export function isJpegPath(path: string): boolean {
  return /\.jpe?g$/i.test(path);
}

/** Instagram: ảnh PNG/JPG; tỉ lệ khung 4:5..1.91:1 (kiểm tra ở trình duyệt trước khi tải lên). */
export function instagramRatioOk(width: number, height: number): boolean {
  if (!width || !height) return false;
  const r = width / height;
  return r >= 0.8 - 1e-9 && r <= 1.91 + 1e-9;
}
