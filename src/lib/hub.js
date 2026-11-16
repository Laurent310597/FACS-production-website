import DOMPurify from "dompurify";
import { slugify } from "./insights";
import { supabase } from "./supabaseClient";

export const hubOutputOptions = [
  { value: "website", label: "Bài website (Việt + Anh)" },
  { value: "facebook", label: "Bài Facebook" },
  { value: "linkedin", label: "Bài LinkedIn" },
  { value: "instagram", label: "Caption Instagram" },
  { value: "infographic", label: "Infographic" },
];

const ARTICLE_TAGS = ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "blockquote", "a", "br"];

/** Làm sạch HTML do AI sinh ra trước khi hiển thị hoặc lưu vào CMS. */
export function sanitizeArticleHtml(html = "") {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ARTICLE_TAGS, ALLOWED_ATTR: ["href", "target", "rel"] });
}

export function parseSourceUrls(value = "") {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function invokeHubContent(payload) {
  const { data, error } = await supabase.functions.invoke("hub-content", { body: { action: "generate", ...payload } });
  if (error) {
    let message = error.message || "Không thể gọi Edge Function hub-content.";
    try {
      const details = await error.context?.json?.();
      message = details?.error || details?.message || message;
    } catch {
      // Giữ thông báo gốc khi không đọc được nội dung phản hồi.
    }
    if (/not found|404|Failed to send/i.test(message)) message = "Edge Function hub-content chưa được triển khai trên Supabase (xem HUONG-DAN-FACS-HUB.md).";
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listHubItems() {
  const { data, error } = await supabase
    .from("hub_content_items")
    .select("id,title,status,requested_outputs,post_id,updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function loadHubItem(id) {
  const { data, error } = await supabase.from("hub_content_items").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveHubItem(item) {
  const { data: authData } = await supabase.auth.getSession();
  const row = {
    title: (item.title || "").slice(0, 200) || "Nội dung chưa đặt tên",
    source_urls: item.source_urls || [],
    source_text: item.source_text || "",
    brief: item.brief || "",
    requested_outputs: item.requested_outputs || [],
    outputs: item.outputs || {},
    status: item.status || "draft",
    post_id: item.post_id || null,
  };
  const request = item.id
    ? supabase.from("hub_content_items").update(row).eq("id", item.id).select().single()
    : supabase.from("hub_content_items").insert({ ...row, created_by: authData.session?.user?.id || null }).select().single();
  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return data;
}

export async function archiveHubItem(id) {
  const { error } = await supabase.from("hub_content_items").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Tạo BÀI NHÁP trong CMS Insights từ nội dung website của Hub.
 * Luôn là status = "draft" và email_delivery_mode = "disabled": không tự đăng, không tự gửi email.
 * Việc đăng bài / hẹn giờ / gửi email vẫn do người dùng thực hiện trong trình soạn bài hiện có.
 */
export async function createPostDraftFromHub(website) {
  const titleVi = (website.title_vi || "").trim();
  const titleEn = (website.title_en || "").trim();
  const contentVi = sanitizeArticleHtml(website.content_vi || "");
  const contentEn = sanitizeArticleHtml(website.content_en || "");
  if (!titleVi && !titleEn) throw new Error("Bài viết chưa có tiêu đề.");
  if (!contentVi.trim() && !contentEn.trim()) throw new Error("Bài viết chưa có nội dung.");

  const { data: authData } = await supabase.auth.getSession();
  const baseVi = slugify(titleVi || titleEn);
  const baseEn = slugify(titleEn || titleVi);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${Math.random().toString(36).slice(2, 6)}`;
    const slugVi = `${baseVi.slice(0, 94)}${suffix}`;
    let slugEn = `${baseEn.slice(0, 94)}${suffix}`;
    if (slugEn === slugVi) slugEn = `${slugVi.slice(0, 96)}-en`;
    const payload = {
      slug: slugVi,
      slug_vi: slugVi,
      slug_en: slugEn,
      category: website.category || "business",
      title_vi: titleVi,
      title_en: titleEn,
      excerpt_vi: website.excerpt_vi || "",
      excerpt_en: website.excerpt_en || "",
      content_vi: contentVi,
      content_en: contentEn,
      author_name: "FACS",
      author_name_vi: "FACS",
      author_name_en: "FACS",
      featured: false,
      seo_title_vi: titleVi,
      seo_title_en: titleEn,
      seo_description_vi: (website.seo_description_vi || "").slice(0, 160),
      seo_description_en: (website.seo_description_en || "").slice(0, 160),
      status: "draft",
      published_at: null,
      email_delivery_mode: "disabled",
      created_by: authData.session?.user?.id || null,
    };
    const { data, error } = await supabase.from("posts").insert(payload).select("id").single();
    if (!error) return data.id;
    if (error.code !== "23505") throw new Error(error.message);
  }
  throw new Error("Đường dẫn bài viết bị trùng. Hãy đổi tiêu đề rồi thử lại.");
}
