type InsightPost = {
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

function signatureHtml(siteUrl: string) {
  const signatureImage = `${siteUrl.replace(/\/$/, "")}/facs-email-signature-banner.png`;
  return `
  <div style="padding-top:18px;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <div style="border-top:1px solid #666;padding-top:14px;"></div>
    <div style="margin:4px 0;font-size:16px;font-weight:700;color:#272727;">Phòng Thông tin &amp; Truyền thông</div>
    <div style="margin:4px 0;font-size:13px;font-weight:700;color:#000;">Information &amp; Communication Department</div>
    <div style="margin:8px 0;font-size:13px;font-weight:700;line-height:1.5;">FINANCE | TAXATION | ACCOUNTING | C&amp;B | ADVISORY | CORPORATE LEGAL | M&amp;A | FP&amp;A | ESG CONSULTING | BUSINESS PROCESS</div>
    <div style="margin:4px 0;font-size:13px;line-height:1.5;"><strong>Registered as</strong> FACS (VIETNAM) ENTERPRISES CONSULTING &amp; TRAINING SERVICES COMPANY LIMITED</div>
    <div style="margin:4px 0;font-size:13px;"><strong>Enterprise Number</strong> 0317650617</div>
    <div style="margin:4px 0;font-size:13px;"><strong>Headquarter</strong> 31/3A Nguyen Van Lac, Ward 21, Binh Thanh District, HCMC</div>
    <div style="margin:4px 0;font-size:13px;"><strong>Office 1</strong> 309 Bach Dang, Ward 2, Binh Thanh District, HCMC</div>
    <div style="margin:4px 0;font-size:13px;"><strong>Ha Noi Branch</strong> will be updated soon</div>
    <div style="margin:4px 0;font-size:13px;"><strong>PA</strong> +84 (0)9 72 79 84 24</div>
    <div style="margin:4px 0;font-size:13px;"><strong>Visit us at</strong> <a href="https://facs.vn/" style="color:#1456f0;text-decoration:none;">www.facs.vn</a></div>
    <div style="margin:8px 0 6px 28px;font-size:13px;font-weight:700;font-style:italic;color:#002f9e;">“Integrity, Ethics &amp; Commitment in everything we do.”</div>
    <img src="${signatureImage}" alt="FACS" width="420" style="display:block;max-width:420px;width:100%;height:auto;border:0;margin:8px 0;" />
    <hr style="border:0;border-top:1px solid #d8d8d8;margin:12px 0;" />
    <div style="font-size:11px;line-height:1.45;color:#999;text-align:justify;">DISCLAIMER &amp; CONFIDENTIALITY NOTICE: This email (including any attachments) is intended for the person(s) or organisation(s) named above. It is confidential and may be legally protected by our firm/client or other privilege. Unauthorised use, copying, distribution or disclosure of any part of this email is strictly prohibited. If you are not the intended recipient or if you believe that you have received this email in error, please contact the sender immediately and delete it from your system without saving or using it in any manner. FACS (VIETNAM) ENTERPRISES CONSULTING &amp; TRAINING SERVICES COMPANY LIMITED (“FACS”) accepts no responsibility for any opinions, statements and other information contained in this email that do not relate to the business of FACS. Although this email (including any attachments) has been checked for viruses or other malicious software, FACS does not warrant, represent or guarantee in any way that it is free of viruses and malicious software. No responsibility is accepted by FACS for any loss or damage in any way arising out of or resulting from the receipt, opening or use of this email. The content of this email as received may not be the same as sent. If you are relying upon the accuracy of this email, you should consider requesting a copy to be sent to you by facsimile or mail.</div>
  </div>`;
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

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#fff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:720px;margin:0 auto;font-size:14px;line-height:1.65;">
    ${isTest ? '<div style="margin-bottom:18px;padding:10px 14px;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;font-weight:700;">EMAIL THỬ NGHIỆM — KHÔNG GỬI KHÁCH HÀNG</div>' : ''}
    <p style="margin:0 0 16px;">Kính gửi Quý Khách hàng,</p>
    <p style="margin:0 0 16px;">FACS vừa phát hành một bài viết mới:</p>
    <ul style="margin:0 0 18px;padding-left:22px;">
      <li><strong>Tên bài viết:</strong> ${escapeHtml(titleVi)}</li>
      <li><strong>Ngày đăng:</strong> ${escapeHtml(formatDateVi(post.published_at))}</li>
      <li><strong>Mô tả ngắn:</strong> ${escapeHtml(excerptVi || "Thông tin chi tiết được trình bày trong bài viết.")}</li>
    </ul>
    <p style="margin:0 0 24px;">Đọc toàn bộ bài viết tại <a href="${articleUrlVi}" style="color:#1456f0;">${articleUrlVi}</a></p>
    <div style="border-top:1px solid #d1d5db;margin:24px 0;"></div>
    <p style="margin:0 0 16px;">Dear Valued Clients,</p>
    <p style="margin:0 0 16px;">FACS has recently published a new insight:</p>
    <ul style="margin:0 0 18px;padding-left:22px;">
      <li><strong>Article title:</strong> ${escapeHtml(titleEn)}</li>
      <li><strong>Publication date:</strong> ${escapeHtml(formatDateEn(post.published_at))}</li>
      <li><strong>Brief description:</strong> ${escapeHtml(excerptEn || "Further details are available in the full article.")}</li>
    </ul>
    <p style="margin:0 0 24px;">Read the full article at <a href="${articleUrlEn}" style="color:#1456f0;">${articleUrlEn}</a></p>
    ${signatureHtml(siteUrl)}
  </div>
</body></html>`;

  const plainText = `${isTest ? "[TEST EMAIL]\n\n" : ""}Kính gửi Quý Khách hàng,\n\nFACS vừa phát hành một bài viết mới:\n- Tên bài viết: ${titleVi}\n- Ngày đăng: ${formatDateVi(post.published_at)}\n- Mô tả ngắn: ${excerptVi || "Thông tin chi tiết được trình bày trong bài viết."}\n\nĐọc toàn bộ bài viết tại ${articleUrlVi}\n\n-----------\n\nDear Valued Clients,\n\nFACS has recently published a new insight:\n- Article title: ${titleEn}\n- Publication date: ${formatDateEn(post.published_at)}\n- Brief description: ${excerptEn || "Further details are available in the full article."}\n\nRead the full article at ${articleUrlEn}\n\nPhòng Thông tin & Truyền thông\nInformation & Communication Department\nwww.facs.vn`;

  return { subject, html, plainText, articleUrl: articleUrlVi, articleUrlVi, articleUrlEn };
}
