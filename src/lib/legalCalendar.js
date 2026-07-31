import { supabase, supabaseKey, supabaseUrl } from "./supabaseClient";

export const legalCalendarCategories = [
  { value: "tax", vi: "Thuế", en: "Tax", color: "#22d3ee" },
  { value: "accounting", vi: "Kế toán", en: "Accounting", color: "#60a5fa" },
  { value: "labor", vi: "Lao động", en: "Labour", color: "#a78bfa" },
  { value: "insurance", vi: "Bảo hiểm", en: "Social insurance", color: "#34d399" },
  { value: "hse", vi: "HSE", en: "HSE", color: "#fbbf24" },
  { value: "corporate", vi: "Doanh nghiệp & đầu tư", en: "Corporate & investment", color: "#fb7185" },
  { value: "other", vi: "Khác", en: "Other", color: "#94a3b8" },
];

export const sourceTiers = [
  { value: "P1", vi: "P1 · Nguồn chính thức", en: "P1 · Official source" },
  { value: "P2", vi: "P2 · Nguồn chuyên môn", en: "P2 · Professional source" },
  { value: "P3", vi: "P3 · Nguồn phát hiện", en: "P3 · Discovery source" },
];

export const verificationStates = [
  { value: "needs_review", vi: "Cần rà soát", en: "Needs review" },
  { value: "verified", vi: "Đã xác minh", en: "Verified" },
  { value: "rejected", vi: "Không sử dụng", en: "Rejected" },
];

export const eventPublicationStates = [
  { value: "draft", vi: "Bản nháp", en: "Draft" },
  { value: "published", vi: "Đã xuất bản", en: "Published" },
  { value: "archived", vi: "Đã ẩn", en: "Archived" },
];

// Local-development content only. Production reads reviewed records from Supabase.
export const fallbackLegalEvents = [
  {
    id: "demo-2026-07-04-a",
    event_date: "2026-07-04",
    category: "labor",
    title_vi: "Báo cáo sử dụng lao động nước ngoài 6 tháng đầu năm 2026",
    title_en: "First-half 2026 foreign labour utilisation report",
    summary_vi: "Mốc tham khảo được tổng hợp từ lịch pháp lý công khai; doanh nghiệp cần kiểm tra đối tượng áp dụng và hướng dẫn của cơ quan quản lý.",
    summary_en: "Reference deadline compiled from a public legal calendar. Enterprises should confirm applicability and the competent authority's instructions.",
    target_audience_vi: "Doanh nghiệp có sử dụng lao động nước ngoài",
    target_audience_en: "Enterprises employing foreign workers",
    legal_basis_vi: "Khoản 1 Điều 6 Nghị định 152/2020/NĐ-CP",
    legal_basis_en: "Clause 1 Article 6 of Decree 152/2020/ND-CP",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
  {
    id: "demo-2026-07-04-b",
    event_date: "2026-07-04",
    category: "hse",
    title_vi: "Báo cáo tai nạn lao động và y tế lao động 6 tháng đầu năm 2026",
    title_en: "First-half 2026 occupational accident and occupational health reports",
    summary_vi: "Mốc tham khảo; cần rà soát riêng nghĩa vụ, mẫu biểu và cơ quan tiếp nhận của từng doanh nghiệp.",
    summary_en: "Reference deadline; each enterprise should separately confirm the obligation, form and receiving authority.",
    target_audience_vi: "Doanh nghiệp thuộc đối tượng lập báo cáo",
    target_audience_en: "Enterprises subject to the reporting requirement",
    legal_basis_vi: "Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP; Điều 10 Thông tư 19/2016/TT-BYT",
    legal_basis_en: "Clause 1 Article 24 of Decree 39/2016/ND-CP; Article 10 of Circular 19/2016/TT-BYT",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
  {
    id: "demo-2026-07-20",
    event_date: "2026-07-20",
    category: "tax",
    title_vi: "Hồ sơ khai thuế theo tháng của kỳ tháng 6/2026",
    title_en: "Monthly tax filings for the June 2026 period",
    summary_vi: "Có thể bao gồm thuế GTGT và thuế nhà thầu tùy thuộc phương pháp khai và giao dịch thực tế.",
    summary_en: "May include VAT and foreign contractor tax depending on the filing method and actual transactions.",
    target_audience_vi: "Doanh nghiệp thuộc diện khai thuế theo tháng",
    target_audience_en: "Enterprises subject to monthly tax filing",
    legal_basis_vi: "Khoản 1 Điều 44 Luật Quản lý thuế 2019; điểm n khoản 4 Điều 8 Nghị định 126/2020/NĐ-CP",
    legal_basis_en: "Clause 1 Article 44 of the 2019 Law on Tax Administration; Point n Clause 4 Article 8 of Decree 126/2020/ND-CP",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
  {
    id: "demo-2026-07-30",
    event_date: "2026-07-30",
    category: "tax",
    title_vi: "Nộp thuế TNDN tạm tính Quý 2/2026",
    title_en: "Provisional corporate income tax payment for Q2 2026",
    summary_vi: "Doanh nghiệp cần đối chiếu số thuế tạm nộp lũy kế và quy định áp dụng tại thời điểm thực hiện.",
    summary_en: "Enterprises should reconcile cumulative provisional payments and the rules applicable at the filing date.",
    target_audience_vi: "Doanh nghiệp phát sinh nghĩa vụ thuế TNDN",
    target_audience_en: "Enterprises with corporate income tax obligations",
    legal_basis_vi: "Khoản 1 Điều 55 Luật Quản lý thuế 2019",
    legal_basis_en: "Clause 1 Article 55 of the 2019 Law on Tax Administration",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
  {
    id: "demo-2026-07-31-a",
    event_date: "2026-07-31",
    category: "insurance",
    title_vi: "Trích nộp BHXH, BHYT, BHTN và kinh phí công đoàn",
    title_en: "Payment of social, health and unemployment insurance and trade union funding",
    summary_vi: "Kiểm tra kỳ đóng, phương thức đóng và nghĩa vụ áp dụng theo tình trạng lao động thực tế.",
    summary_en: "Confirm the contribution period, payment method and applicability based on the actual workforce.",
    target_audience_vi: "Doanh nghiệp có người lao động thuộc diện tham gia",
    target_audience_en: "Enterprises with employees subject to compulsory participation",
    legal_basis_vi: "Khoản 4 Điều 34 Luật Bảo hiểm xã hội 2024 và các văn bản hướng dẫn liên quan",
    legal_basis_en: "Clause 4 Article 34 of the 2024 Law on Social Insurance and relevant guidance",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
  {
    id: "demo-2026-07-31-b",
    event_date: "2026-07-31",
    category: "tax",
    title_vi: "Hồ sơ khai thuế theo quý của Quý 2/2026",
    title_en: "Quarterly tax filings for Q2 2026",
    summary_vi: "Có thể bao gồm thuế GTGT và thuế TNCN tùy thuộc đối tượng, kỳ khai và tình hình phát sinh.",
    summary_en: "May include VAT and personal income tax depending on the taxpayer, filing cycle and actual liabilities.",
    target_audience_vi: "Doanh nghiệp thuộc diện khai thuế theo quý",
    target_audience_en: "Enterprises subject to quarterly tax filing",
    legal_basis_vi: "Khoản 1 Điều 44 Luật Quản lý thuế 2019",
    legal_basis_en: "Clause 1 Article 44 of the 2019 Law on Tax Administration",
    source_name: "MISA AMIS",
    source_url: "https://amis.misa.vn/lich-phap-ly/",
    source_tier: "P2",
    verification_status: "verified",
    status: "published",
  },
];

export function getCategory(value) {
  return legalCalendarCategories.find((item) => item.value === value) || legalCalendarCategories.at(-1);
}

export function getLocalizedLegalEvent(event, language) {
  const suffix = language === "vi" ? "vi" : "en";
  const fallback = suffix === "vi" ? "en" : "vi";
  const read = (field) => event[`${field}_${suffix}`] || event[`${field}_${fallback}`] || "";

  return {
    title: read("title"),
    summary: read("summary"),
    targetAudience: read("target_audience"),
    legalBasis: read("legal_basis"),
    periodLabel: read("period_label"),
  };
}

export function formatLegalDate(date, language, options = {}) {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00+07:00`);
  const { longMonth = false, ...intlOptions } = options;
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: longMonth ? "long" : "2-digit",
    year: "numeric",
    ...intlOptions,
  }).format(parsed);
}

export function formatLegalDateTime(value, language) {
  if (!value) return "";
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function icsEscape(value = "") {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function toCompactDate(value) {
  return value.replaceAll("-", "");
}

function addOneDay(value) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function downloadLegalEventIcs(event, language) {
  const localized = getLocalizedLegalEvent(event, language);
  const description = [
    localized.summary,
    localized.targetAudience ? `${language === "vi" ? "Đối tượng" : "Applicability"}: ${localized.targetAudience}` : "",
    localized.legalBasis ? `${language === "vi" ? "Căn cứ pháp lý" : "Legal basis"}: ${localized.legalBasis}` : "",
    event.source_url ? `${language === "vi" ? "Nguồn tham khảo" : "Reference source"}: ${event.source_url}` : "",
    language === "vi"
      ? "Lưu ý: Vui lòng kiểm tra đối tượng áp dụng và quy định hiện hành trước khi thực hiện."
      : "Note: Confirm applicability and current regulations before acting.",
  ].filter(Boolean).join("\n\n");

  const payload = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FACS//Legal Calendar//VI",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id || crypto.randomUUID()}@facs.vn`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${toCompactDate(event.event_date)}`,
    `DTEND;VALUE=DATE:${toCompactDate(addOneDay(event.event_date))}`,
    `SUMMARY:${icsEscape(localized.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    event.source_url ? `URL:${event.source_url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const blob = new Blob([payload], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `facs-legal-calendar-${event.event_date}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function invokeLegalCalendarSync() {
  if (!supabase) throw new Error("Website chưa kết nối Supabase.");

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  let session = sessionData.session;
  if (sessionError || !session?.access_token) {
    throw new Error("Phiên đăng nhập quản trị đã hết hạn. Vui lòng đăng nhập lại rồi thử quét nguồn.");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
  if (userError || !userData.user) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    session = refreshData.session;
    if (refreshError || !session?.access_token) {
      throw new Error("Phiên đăng nhập quản trị không còn hợp lệ. Vui lòng đăng xuất, đăng nhập lại rồi thử quét nguồn.");
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  let response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/legal-calendar-sync`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "sync" }),
      signal: controller.signal,
    });
  } catch (requestError) {
    if (requestError?.name === "AbortError") {
      throw new Error("Tác vụ quét nguồn mất quá nhiều thời gian phản hồi. Vui lòng thử lại sau ít phút.", { cause: requestError });
    }
    throw new Error("Không thể kết nối tới tác vụ quét nguồn trên Supabase. Vui lòng kiểm tra kết nối và thử lại.", { cause: requestError });
  } finally {
    window.clearTimeout(timeout);
  }

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { error: responseText };
  }

  if (!response.ok) {
    const detail = data?.error || data?.message || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new Error("Supabase từ chối phiên quản trị hiện tại. Vui lòng đăng xuất, đăng nhập lại rồi thử quét nguồn.");
    }
    if (response.status === 404) {
      throw new Error("Không tìm thấy tác vụ legal-calendar-sync trên đúng dự án Supabase đang kết nối.");
    }
    throw new Error(`Tác vụ quét nguồn trả lỗi máy chủ (${response.status}): ${detail}`);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
