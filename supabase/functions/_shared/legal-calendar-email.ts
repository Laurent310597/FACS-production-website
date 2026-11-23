import { buildEmailShell, buildEmailSignature } from "./form-email-templates.ts";

// Email gửi khách hàng các mốc pháp lý trong một tháng (cùng khung với email Insights).
// Bố cục: lời dẫn tiếng Việt — vạch ngăn — lời dẫn tiếng Anh — một danh sách mốc song ngữ Việt | Anh đặt song song.
export const LEGAL_EMAIL_TEMPLATE_VERSION = "2026-11-23-monthly-v2-bilingual-list";

export type LegalEmailEvent = {
  id: string;
  event_date: string; // YYYY-MM-DD
  category?: string | null;
  title_vi?: string | null;
  title_en?: string | null;
  summary_vi?: string | null;
  summary_en?: string | null;
  target_audience_vi?: string | null;
  target_audience_en?: string | null;
  period_label_vi?: string | null;
  period_label_en?: string | null;
  legal_basis_vi?: string | null;
  legal_basis_en?: string | null;
  official_source_url?: string | null;
};

const CATEGORIES: Record<string, { vi: string; en: string; color: string }> = {
  tax: { vi: "Thuế", en: "Tax", color: "#0e7490" },
  accounting: { vi: "Kế toán", en: "Accounting", color: "#1d4ed8" },
  labor: { vi: "Lao động", en: "Labour", color: "#6d28d9" },
  insurance: { vi: "Bảo hiểm", en: "Social insurance", color: "#047857" },
  hse: { vi: "HSE", en: "HSE", color: "#b45309" },
  corporate: { vi: "Doanh nghiệp & đầu tư", en: "Corporate & investment", color: "#be123c" },
  other: { vi: "Khác", en: "Other", color: "#475569" },
};

const WEEKDAYS_VI = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const text = (value: string | null | undefined) => (value || "").trim();
const pick = (primary: string | null | undefined, fallback: string | null | undefined) => text(primary) || text(fallback);

/** "2026-12" → { year, month, first: "2026-12-01", last: "2026-12-31" }. Ném lỗi nếu sai định dạng. */
export function parseMonth(value: unknown) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(value || "").trim());
  if (!match) throw new Error("Tháng không hợp lệ (định dạng YYYY-MM).");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { key: `${year}-${mm}`, year, month, first: `${year}-${mm}-01`, last: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export function monthLabels(monthKey: string) {
  const { year, month } = parseMonth(monthKey);
  return { vi: `tháng ${String(month).padStart(2, "0")}/${year}`, en: `${MONTHS_EN[month - 1]} ${year}` };
}

function dayParts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { day: String(d).padStart(2, "0"), month: String(m).padStart(2, "0"), weekdayVi: WEEKDAYS_VI[weekday], weekdayEn: WEEKDAYS_EN[weekday] };
}

/** Sắp xếp ổn định: theo ngày, rồi lĩnh vực, rồi tiêu đề. */
export function sortLegalEvents(events: LegalEmailEvent[]) {
  return [...events].sort((a, b) =>
    a.event_date.localeCompare(b.event_date)
    || String(a.category || "").localeCompare(String(b.category || ""))
    || pick(a.title_vi, a.title_en).localeCompare(pick(b.title_vi, b.title_en))
    || a.id.localeCompare(b.id));
}

/** Băm nội dung email: đổi bất kỳ chữ nào của các mốc hoặc mẫu email thì phải xem trước + gửi thử lại. */
export async function legalEmailContentHash(monthKey: string, events: LegalEmailEvent[], siteUrl: string) {
  const snapshot = JSON.stringify({
    template: LEGAL_EMAIL_TEMPLATE_VERSION,
    month: monthKey,
    site_url: siteUrl,
    events: sortLegalEvents(events).map((event) => [
      event.id, event.event_date, event.category || "",
      text(event.title_vi), text(event.title_en), text(event.summary_vi), text(event.summary_en),
      text(event.target_audience_vi), text(event.target_audience_en), text(event.period_label_vi), text(event.period_label_en),
      text(event.legal_basis_vi), text(event.legal_basis_en), text(event.official_source_url),
    ]),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const P = "font-family:Arial,Helvetica,sans-serif;";

/** Một cột ngôn ngữ của một mốc: tiêu đề, nội dung, đối tượng, căn cứ. */
function languageColumn(event: LegalEmailEvent, lang: "vi" | "en") {
  const vi = lang === "vi";
  const title = vi ? pick(event.title_vi, event.title_en) : pick(event.title_en, event.title_vi);
  const summary = vi ? pick(event.summary_vi, event.summary_en) : pick(event.summary_en, event.summary_vi);
  const audience = vi ? pick(event.target_audience_vi, event.target_audience_en) : pick(event.target_audience_en, event.target_audience_vi);
  const basis = vi ? pick(event.legal_basis_vi, event.legal_basis_en) : pick(event.legal_basis_en, event.legal_basis_vi);
  const meta = (label: string, value: string) => value
    ? `<p style="${P}margin:5px 0 0;font-size:12px;line-height:1.55;color:#4b5565;text-align:left;"><strong style="${P}color:#243044;">${label}:</strong> ${escapeHtml(value)}</p>`
    : "";
  return `<p style="${P}margin:0;font-size:14px;line-height:1.45;font-weight:700;color:#0f315a;text-align:left;">${escapeHtml(title)}</p>
      ${summary ? `<p style="${P}margin:5px 0 0;font-size:12.5px;line-height:1.6;color:#243044;text-align:left;">${escapeHtml(summary)}</p>` : ""}
      ${meta(vi ? "Đối tượng" : "Applies to", audience)}
      ${meta(vi ? "Căn cứ" : "Legal basis", basis)}`;
}

// Hai cột Việt | Anh: đặt cạnh nhau khi đủ rộng, tự xuống dòng trên điện thoại; Outlook dùng bảng ẩn để giữ hai cột.
const COL = `${P}display:inline-block;vertical-align:top;width:100%;max-width:226px;text-align:left;`;

function eventRow(event: LegalEmailEvent) {
  const parts = dayParts(event.event_date);
  const category = CATEGORIES[event.category || "other"] || CATEGORIES.other;
  const periodVi = pick(event.period_label_vi, event.period_label_en);
  const periodEn = pick(event.period_label_en, event.period_label_vi);
  const period = periodVi && periodEn && periodVi !== periodEn ? `${periodVi} / ${periodEn}` : periodVi || periodEn;
  const url = /^https:\/\//i.test(text(event.official_source_url)) ? text(event.official_source_url) : "";
  return `<tr>
    <td valign="top" width="70" style="${P}width:70px;padding:16px 0;border-top:1px solid #e3e8ef;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="60" style="${P}width:60px;background:#0f315a;border-radius:6px;">
        <tr><td align="center" style="${P}padding:8px 3px 2px;color:#ffffff;font-size:22px;font-weight:700;line-height:1;">${parts.day}</td></tr>
        <tr><td align="center" style="${P}padding:2px 3px 9px;color:#bfe9f5;font-size:10.5px;line-height:1.35;">${parts.weekdayVi}<br>${parts.weekdayEn}</td></tr>
      </table>
    </td>
    <td valign="top" style="${P}padding:16px 0 16px 12px;border-top:1px solid #e3e8ef;text-align:left;">
      <p style="${P}margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${category.color};text-align:left;">${escapeHtml(category.vi)} · ${escapeHtml(category.en)}${period ? ` <span style="${P}color:#8a95a5;font-weight:400;text-transform:none;letter-spacing:0;">· ${escapeHtml(period)}</span>` : ""}</p>
      <!--[if mso]><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td width="50%" valign="top" style="padding-right:10px;"><![endif]-->
      <div style="${COL}padding:0 14px 8px 0;">${languageColumn(event, "vi")}</div><!--[if mso]></td><td width="50%" valign="top" style="padding-left:10px;border-left:1px solid #e3e8ef;"><![endif]--><div style="${COL}padding:0 0 8px 0;">${languageColumn(event, "en")}</div>
      <!--[if mso]></td></tr></table><![endif]-->
      ${url ? `<p style="${P}margin:4px 0 0;font-size:12px;text-align:left;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="${P}color:#067a98;">Nguồn chính thức / Official source &rsaquo;</a></p>` : ""}
    </td>
  </tr>`;
}

function eventTable(events: LegalEmailEvent[]) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="${P}width:100%;margin:6px 0 4px;border-bottom:1px solid #e3e8ef;">${events.map(eventRow).join("")}</table>`;
}

function button(url: string, label: string) {
  return `<p style="${P}text-align:left;margin:22px 0 0;"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="${P}display:inline-block;background:#0f315a;color:#ffffff;text-decoration:none;padding:11px 17px;font-weight:700;">${label}</a></p>`;
}

const para = (content: string, extra = "") => `<p align="justify" style="${P}text-align:justify;text-justify:inter-word;margin:0 0 16px;${extra}">${content}</p>`;

export function buildLegalCalendarEmail(monthKey: string, rawEvents: LegalEmailEvent[], siteUrl: string, isTest = false) {
  const events = sortLegalEvents(rawEvents);
  if (!events.length) throw new Error("Tháng này chưa có mốc pháp lý đã xuất bản và xác minh.");
  const labels = monthLabels(monthKey);
  const calendarUrl = `${siteUrl.replace(/\/$/, "")}/legal-calendar`;
  const count = events.length;
  const baseSubject = `[FACS Legal Calendar] - Các mốc thời hạn pháp lý ${labels.vi} | Compliance deadlines for ${labels.en}`;
  const subject = isTest ? `[TEST] ${baseSubject}` : baseSubject;

  const html = buildEmailShell(`
    ${isTest ? `<p style="${P}margin:0 0 20px;padding:10px 14px;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;font-weight:700;">EMAIL THỬ NỘI BỘ / INTERNAL TEST — KHÔNG GỬI KHÁCH HÀNG</p>` : ""}
    ${para("Kính gửi Quý Khách hàng,")}
    ${para(`FACS trân trọng gửi đến Quý Khách hàng <strong>${count} mốc thời hạn pháp lý</strong> cần lưu ý trong <strong>${escapeHtml(labels.vi)}</strong> (chi tiết song ngữ bên dưới). Quý Khách hàng vui lòng rà soát các nghĩa vụ áp dụng cho doanh nghiệp mình để chủ động chuẩn bị và thực hiện đúng hạn.`, "margin-bottom:0;")}
    <div style="${P}margin:22px 0;text-align:center;color:#a3acb9;letter-spacing:1px;">-------------------</div>
    ${para("Dear Valued Clients,")}
    ${para(`FACS is pleased to share <strong>${count} compliance deadline${count > 1 ? "s" : ""}</strong> to note in <strong>${escapeHtml(labels.en)}</strong> (bilingual details below). Please review the obligations that apply to your company so that they can be prepared and completed on time.`)}
    <h2 style="${P}text-align:left;margin:26px 0 4px;font-size:18px;line-height:1.4;color:#0f315a;">Lịch pháp lý ${escapeHtml(labels.vi)} <span style="${P}color:#8a95a5;font-weight:400;">|</span> Legal calendar — ${escapeHtml(labels.en)}</h2>
    ${eventTable(events)}
    <p style="${P}margin:16px 0 0;font-size:12px;line-height:1.6;color:#4b5565;text-align:left;">Thông tin mang tính tham khảo; nghĩa vụ cụ thể phụ thuộc vào tình hình thực tế của từng doanh nghiệp. Quý Khách hàng có thể phản hồi email này hoặc liên hệ FACS để được hỗ trợ.<br><em>This information is for reference only; specific obligations depend on each company's circumstances. You may reply to this email or contact FACS for assistance.</em></p>
    ${button(calendarUrl, "Xem lịch pháp lý đầy đủ | View the full legal calendar")}
    ${buildEmailSignature("infor@facs.vn", "Trân trọng, | Sincerely,", "PHÒNG THÔNG TIN &amp; TRUYỀN THÔNG<br>INFORMATION &amp; COMMUNICATION DEPARTMENT")}
  `, siteUrl);

  return { subject, html, calendarUrl, eventCount: count };
}
