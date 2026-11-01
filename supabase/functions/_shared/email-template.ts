import { buildEmailShell, buildEmailSignature } from "./form-email-templates.ts";

export const INSIGHT_EMAIL_TEMPLATE_VERSION = "2026-11-01-arial-v3";

export type InsightPost = {
  id: string;
  slug: string;
  slug_vi?: string | null;
  slug_en?: string | null;
  title_vi?: string | null;
  title_en?: string | null;
  excerpt_vi?: string | null;
  excerpt_en?: string | null;
  published_at?: string | null;
};

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortTitle(value: string | null | undefined, fallback: string) {
  const normalized = (value || fallback).trim();
  return normalized.length > 120 ? `${normalized.slice(0, 117).trim()}...` : normalized;
}

function formatDateVi(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateEn(iso: string | null | undefined) {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function buildInsightEmail(post: InsightPost, siteUrl: string, isTest = false) {
  const titleVi = shortTitle(post.title_vi, post.title_en || "FACS Insight");
  const titleEn = shortTitle(post.title_en, post.title_vi || "FACS Insight");
  const excerptVi = (post.excerpt_vi || post.excerpt_en || "").trim();
  const excerptEn = (post.excerpt_en || post.excerpt_vi || "").trim();
  const articleUrlVi = `${siteUrl.replace(/\/$/, "")}/insights/${encodeURIComponent(post.slug_vi || post.slug_en || post.slug)}`;
  const articleUrlEn = `${siteUrl.replace(/\/$/, "")}/insights/${encodeURIComponent(post.slug_en || post.slug_vi || post.slug)}`;
  const baseSubject = `[FACS Insight] - ${titleVi} | ${titleEn}`;
  const subject = isTest ? `[TEST] ${baseSubject}` : baseSubject;

  const link = (url: string, label: string) => `<p style="font-family:Arial,Helvetica,sans-serif;margin:20px 0 0;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="font-family:Arial,Helvetica,sans-serif;display:inline-block;background:#0f315a;color:#ffffff;text-decoration:none;padding:11px 17px;font-weight:700;">${label}</a></p><p style="font-family:Arial,Helvetica,sans-serif;margin:12px 0 0;font-size:12px;overflow-wrap:anywhere;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="font-family:Arial,Helvetica,sans-serif;color:#067a98;">${escapeHtml(url)}</a></p>`;
  const html = buildEmailShell(`
    ${isTest ? '<p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 20px;padding:10px 14px;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;font-weight:700;">EMAIL THỬ NỘI BỘ / INTERNAL TEST — KHÔNG GỬI KHÁCH HÀNG</p>' : ''}
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;">Kính gửi Quý Khách hàng,</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;">FACS trân trọng giới thiệu bài viết mới trên chuyên mục Insights:</p>
    <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.4;color:#0f315a;">${escapeHtml(titleVi)}</h2>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;font-size:12px;color:#687386;">Ngày đăng: ${escapeHtml(formatDateVi(post.published_at))}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;white-space:pre-line;">${escapeHtml(excerptVi || "Thông tin chi tiết được trình bày trong bài viết.")}</p>
    ${link(articleUrlVi, "Đọc toàn bộ bài viết")}
    ${buildEmailSignature("infor@facs.vn", "Trân trọng,", "PHÒNG THÔNG TIN &amp; TRUYỀN THÔNG")}
    <div style="font-family:Arial,Helvetica,sans-serif;margin:30px 0;text-align:center;color:#a3acb9;letter-spacing:1px;">-------------------</div>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;">Dear Valued Clients,</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;">We are pleased to share a new article from FACS Insights:</p>
    <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.4;color:#0f315a;">${escapeHtml(titleEn)}</h2>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;font-size:12px;color:#687386;">Publication date: ${escapeHtml(formatDateEn(post.published_at))}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;margin:0 0 16px;white-space:pre-line;">${escapeHtml(excerptEn || "Further details are available in the full article.")}</p>
    ${link(articleUrlEn, "Read the full article")}
    ${buildEmailSignature("infor@facs.vn", "Sincerely,", "INFORMATION &amp; COMMUNICATION DEPARTMENT")}
  `, siteUrl);

  const plainText = `${isTest ? "[TEST EMAIL]\n\n" : ""}Kính gửi Quý Khách hàng,\n\nFACS vừa phát hành một bài viết mới:\n- Tên bài viết: ${titleVi}\n- Ngày đăng: ${formatDateVi(post.published_at)}\n- Mô tả ngắn: ${excerptVi || "Thông tin chi tiết được trình bày trong bài viết."}\n\nĐọc toàn bộ bài viết tại ${articleUrlVi}\n\n-----------\n\nDear Valued Clients,\n\nFACS has recently published a new insight:\n- Article title: ${titleEn}\n- Publication date: ${formatDateEn(post.published_at)}\n- Brief description: ${excerptEn || "Further details are available in the full article."}\n\nRead the full article at ${articleUrlEn}\n\nPhòng Thông tin & Truyền thông\nInformation & Communication Department\nwww.facs.vn`;

  return { subject, html, plainText, articleUrl: articleUrlVi, articleUrlVi, articleUrlEn };
}
