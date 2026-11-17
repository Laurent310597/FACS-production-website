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
    input_files: item.input_files || [],
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

// ───────────────────────── Thư viện FACS Hub ─────────────────────────

export const guidelineKinds = [
  { value: "rule", label: "Quy tắc" },
  { value: "style", label: "Văn phong" },
  { value: "skill", label: "Kỹ năng" },
  { value: "reference", label: "Tài liệu tham chiếu" },
];

const LIBRARY_BUCKET = "hub-library";

function cleanFileName(name = "anh") {
  const extension = (name.split(".").pop() || "png").toLowerCase().replace("jpeg", "jpg");
  const base = slugify(name.replace(/\.[^/.]+$/, "")).slice(0, 80) || "anh";
  return `${base}.${extension}`;
}

/** Tải ảnh mẫu (infographic FACS đã làm) đính kèm một hướng dẫn. */
export function uploadHubGuidelineImage(file) {
  return uploadHubInputImage(file, "guidelines");
}

/** Tải ảnh lên thư mục riêng tư của Hub: inputs/ (đầu vào) hoặc guidelines/ (ảnh mẫu). */
export async function uploadHubInputImage(file, folder = "inputs") {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Chỉ nhận ảnh PNG, JPG hoặc WEBP.");
  if (file.size > 4 * 1024 * 1024) throw new Error("Mỗi ảnh tối đa 4 MB.");
  const path = `${folder}/${crypto.randomUUID()}/${cleanFileName(file.name)}`;
  const { error } = await supabase.storage.from(LIBRARY_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, name: file.name, type: file.type, size: file.size };
}

export async function signedInputUrls(files = []) {
  const paths = files.map((f) => f.path).filter(Boolean);
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrls(paths, 3600);
  if (error) return {};
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

export async function removeHubInputImage(path) {
  await supabase.storage.from(LIBRARY_BUCKET).remove([path]);
}

// Thư mục 1 – Hướng dẫn, quy tắc, kỹ năng
export async function listGuidelines() {
  const { data, error } = await supabase.from("hub_guidelines").select("*").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveGuideline(guideline) {
  const row = {
    title: (guideline.title || "").trim().slice(0, 200),
    kind: guideline.kind || "rule",
    applies_to: guideline.applies_to || [],
    content: (guideline.content || "").trim(),
    is_active: guideline.is_active !== false,
    sort_order: Number(guideline.sort_order) || 0,
    images: (guideline.images || []).slice(0, 3),
  };
  if (!row.title) throw new Error("Hãy đặt tên cho hướng dẫn.");
  if (!row.content) throw new Error("Nội dung hướng dẫn đang trống.");
  if (row.content.length > 20000) throw new Error("Mỗi hướng dẫn tối đa 20.000 ký tự. Hãy tách thành nhiều mục.");
  const { data: authData } = await supabase.auth.getSession();
  const request = guideline.id
    ? supabase.from("hub_guidelines").update(row).eq("id", guideline.id)
    : supabase.from("hub_guidelines").insert({ ...row, created_by: authData.session?.user?.id || null });
  const { error } = await request;
  if (error) throw new Error(error.message);
}

export async function deleteGuideline(id) {
  const { error } = await supabase.from("hub_guidelines").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Thư mục 2 – Đầu vào đã gửi
export async function listHubInputs() {
  const { data, error } = await supabase
    .from("hub_content_items")
    .select("id,title,status,source_urls,source_text,brief,input_files,requested_outputs,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

// Thư mục 3 – Kết quả đã duyệt
export async function listApprovedExamples() {
  const { data, error } = await supabase.from("hub_approved_examples").select("*").order("approved_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function setExampleReference(id, isReference) {
  const { error } = await supabase.from("hub_approved_examples").update({ is_reference: isReference }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteApprovedExample(id) {
  const { error } = await supabase.from("hub_approved_examples").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Tách bộ nội dung thành từng kết quả theo kênh (chỉ kênh được yêu cầu và có nội dung). */
export function buildApprovedRows(itemId, title, requested, outputs, userId) {
  const rows = [];
  const website = outputs?.website || {};
  for (const channel of requested) {
    let content = null;
    let rowTitle = title;
    if (channel === "website" && (website.title_vi || website.title_en) && (website.content_vi || website.content_en)) {
      content = {
        category: website.category,
        title_vi: website.title_vi,
        title_en: website.title_en,
        excerpt_vi: website.excerpt_vi,
        excerpt_en: website.excerpt_en,
        content_vi: sanitizeArticleHtml(website.content_vi),
        content_en: sanitizeArticleHtml(website.content_en),
      };
      rowTitle = website.title_vi || website.title_en;
    } else if (["facebook", "linkedin", "instagram"].includes(channel) && (outputs?.[channel] || "").trim()) {
      content = { text: outputs[channel].trim() };
    } else if (channel === "infographic" && outputs?.infographic?.title) {
      content = outputs.infographic;
      rowTitle = outputs.infographic.title;
    }
    if (content) {
      rows.push({
        content_item_id: itemId,
        channel,
        title: (rowTitle || title || "").slice(0, 200),
        category: website.category || null,
        content,
        approved_by: userId,
      });
    }
  }
  return rows;
}

/**
 * Duyệt bộ nội dung: lưu bản cuối cùng vào thư mục "Kết quả đã duyệt".
 * Duyệt lại sau khi sửa sẽ thay bản đã duyệt cũ của chính bộ nội dung đó.
 */
export async function approveHubItem(itemId, title, requested, outputs) {
  const { data: authData } = await supabase.auth.getSession();
  const rows = buildApprovedRows(itemId, title, requested, outputs, authData.session?.user?.id || null);
  if (!rows.length) throw new Error("Chưa có nội dung nào để duyệt.");
  const { error: deleteError } = await supabase.from("hub_approved_examples").delete().eq("content_item_id", itemId);
  if (deleteError) throw new Error(deleteError.message);
  const { error } = await supabase.from("hub_approved_examples").insert(rows);
  if (error) throw new Error(error.message);
  const { error: statusError } = await supabase.from("hub_content_items").update({ status: "approved" }).eq("id", itemId);
  if (statusError) throw new Error(statusError.message);
  return rows.length;
}
