// Thẻ danh thiếp số: thông tin do chủ thẻ tự cập nhật (bảng digital_cards trên Supabase).
// Thông tin trong src/data/team.js là bản dự phòng: dùng khi chưa tải được (mất mạng, lần mở đầu tiên).
import { supabase, supabaseUrl } from "./supabaseClient";

export const CARD_COLUMNS =
  "slug,name,title_vi,title_en,role_vi,role_en,phone,email,credentials_vi,credentials_en,photo_path,updated_at";

const cacheKey = (slug) => `facs-card:${slug}`;

export function readCardCache(slug) {
  try {
    const raw = localStorage.getItem(cacheKey(slug));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCardCache(slug, row) {
  try {
    localStorage.setItem(cacheKey(slug), JSON.stringify(row));
  } catch {
    /* bộ nhớ trình duyệt bị chặn: bỏ qua, lần sau tải lại */
  }
}

export async function fetchCardRow(slug) {
  if (!supabase) return null;
  const { data, error } = await supabase.from("digital_cards").select(CARD_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

/** Ảnh thẻ: ảnh chủ thẻ đã tải lên, nếu chưa có thì ảnh mặc định đi kèm website. */
export function cardPhotoUrl(slug, row) {
  if (row?.photo_path && supabaseUrl) return `${supabaseUrl}/storage/v1/object/public/card-photos/${row.photo_path}`;
  return `/card/${slug}.jpg`;
}

/** Tệp danh bạ luôn theo thông tin mới nhất; mất mạng thì dùng tệp lưu sẵn trong app. */
export function cardVcfUrl(slug, isVi) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (supabaseUrl && !offline) return `${supabaseUrl}/functions/v1/card-vcf?slug=${encodeURIComponent(slug)}&lang=${isVi ? "vi" : "en"}`;
  return `/card/${slug}/${isVi ? "contact.vcf" : "contact-en.vcf"}`;
}

/** Ghép thông tin mới nhất lên bản dự phòng. */
export function mergeCard(base, row) {
  if (!base) return null;
  if (!row) return { ...base, photoUrl: cardPhotoUrl(base.slug, null) };
  const pick = (value, fallback) => (typeof value === "string" && value.trim() ? value.trim() : fallback);
  const list = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback);
  return {
    ...base,
    name: pick(row.name, base.name),
    titleVi: pick(row.title_vi, base.titleVi),
    title: pick(row.title_en, base.title),
    roleVi: pick(row.role_vi, base.roleVi),
    role: pick(row.role_en, base.role),
    phone: pick(row.phone, base.phone),
    email: pick(row.email, base.email),
    credentialsVi: list(row.credentials_vi, base.credentialsVi),
    credentials: list(row.credentials_en, base.credentials),
    photoUrl: cardPhotoUrl(base.slug, row),
  };
}
