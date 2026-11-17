// Email nhắc công nợ gửi từ accounting@facs.vn. Hàm thuần (không gọi mạng) để kiểm thử được.
// Giao diện giống email Insights / Contact: logo FACS, khung trắng viền xanh, song ngữ Việt – Anh, chữ ký FACS.

export const AR_SENDER = "accounting@facs.vn";
export const AR_SENDER_NAME = "FACS Accounting";

export type ArSettings = {
  subject: string;
  body_vi: string;
  body_en: string;
  bank_name: string;
  bank_branch: string;
  account_number: string;
  account_holder: string;
  swift_code: string;
  transfer_note: string;
};

export type ArReminder = {
  id?: string;
  recipient_name: string;
  recipient_emails: string[];
  cc_emails?: string[];
  company_name: string;
  tax_code?: string | null;
  amount: number | string;
  period: string;
  note?: string | null;
};

export const DEFAULT_AR_SETTINGS: ArSettings = {
  subject: "[FACS] Thông báo công nợ – {{company_name}} | Payment reminder",
  body_vi:
    "Kính gửi Anh/Chị {{recipient_name}},\n\nFACS trân trọng cảm ơn {{company_name}} đã tin tưởng sử dụng dịch vụ của chúng tôi.\n\nTheo số liệu theo dõi của FACS, Quý Công ty hiện còn khoản phí dịch vụ chưa thanh toán với chi tiết như bên dưới. FACS kính đề nghị Quý Công ty sắp xếp thanh toán vào tài khoản ngân hàng của FACS.\n\nTrường hợp Quý Công ty đã thanh toán, vui lòng bỏ qua email này và gửi giúp FACS chứng từ thanh toán (ủy nhiệm chi) để đối chiếu. Nếu có thắc mắc về số liệu, Anh/Chị vui lòng phản hồi trực tiếp email này.",
  body_en:
    "Dear {{recipient_name}},\n\nThank you for choosing FACS's services.\n\nAccording to our records, {{company_name}} has an outstanding service fee balance as detailed below. We kindly request that the payment be arranged to FACS's bank account.\n\nIf the payment has already been made, please disregard this email and kindly send us the payment confirmation (bank transfer slip) for reconciliation. Should you have any questions regarding the figures, please reply directly to this email.",
  bank_name: "",
  bank_branch: "",
  account_number: "",
  account_holder: "",
  swift_code: "",
  transfer_note: "MST {{tax_code}} thanh toan cong no {{period}}",
};

const LIMITS: Record<keyof ArSettings, number> = {
  subject: 300,
  body_vi: 12000,
  body_en: 12000,
  bank_name: 200,
  bank_branch: 200,
  account_number: 60,
  account_holder: 200,
  swift_code: 20,
  transfer_note: 300,
};

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_RE.test(value);
}

/** Tách "a@x.com; b@y.com, c@z.com" thành danh sách email (chữ thường, bỏ trùng). */
export function splitEmails(value: unknown): string[] {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[;,\s]+/);
  return [...new Set(list.map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
}

export function cleanSettings(input: Record<string, unknown>): { ok: true; settings: ArSettings } | { ok: false; error: string } {
  const out = {} as ArSettings;
  for (const key of Object.keys(DEFAULT_AR_SETTINGS) as (keyof ArSettings)[]) {
    const value = String(input[key] ?? "").trim();
    if (value.length > LIMITS[key]) return { ok: false, error: `Mục "${key}" quá dài (tối đa ${LIMITS[key]} ký tự).` };
    out[key] = value;
  }
  if (!out.subject || !out.body_vi || !out.body_en) return { ok: false, error: "Tiêu đề và nội dung tiếng Việt / tiếng Anh không được để trống." };
  return { ok: true, settings: out };
}

/** Thiếu thông tin ngân hàng thì không cho gửi (khách không biết chuyển vào đâu). */
export function bankMissing(s: ArSettings): string | null {
  if (!s.bank_name || !s.account_number || !s.account_holder) return "Chưa điền đủ thông tin tài khoản ngân hàng (Ngân hàng, Số tài khoản, Chủ tài khoản). Hãy điền ở mục Mẫu email & tài khoản ngân hàng.";
  return null;
}

export function toAmount(value: unknown): number {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
}

export function cleanReminder(input: Record<string, unknown>): { ok: true; reminder: ArReminder } | { ok: false; error: string } {
  const recipient_name = String(input.recipient_name ?? "").trim();
  const company_name = String(input.company_name ?? "").trim();
  const period = String(input.period ?? "").trim();
  const recipient_emails = splitEmails(input.recipient_emails);
  const cc_emails = splitEmails(input.cc_emails ?? []);
  const amount = toAmount(input.amount);
  if (!recipient_name) return { ok: false, error: "Thiếu người nhận." };
  if (!recipient_emails.length) return { ok: false, error: "Thiếu email người nhận." };
  const bad = [...recipient_emails, ...cc_emails].find((e) => !isEmail(e));
  if (bad) return { ok: false, error: `Email không hợp lệ: ${bad}` };
  if (recipient_emails.length > 10 || cc_emails.length > 10) return { ok: false, error: "Tối đa 10 email người nhận và 10 email CC." };
  if (!company_name) return { ok: false, error: "Thiếu tên công ty." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Số tiền nợ phải lớn hơn 0." };
  if (!period) return { ok: false, error: "Thiếu giai đoạn nợ." };
  return {
    ok: true,
    reminder: {
      recipient_name: recipient_name.slice(0, 200),
      recipient_emails,
      cc_emails,
      company_name: company_name.slice(0, 300),
      tax_code: String(input.tax_code ?? "").trim().slice(0, 30) || null,
      amount,
      period: period.slice(0, 200),
      note: String(input.note ?? "").trim().slice(0, 4000) || null,
    },
  };
}

/** Chữ ký giống email Insights / Contact (bản sao để không phụ thuộc file mẫu của form email). */
function buildEmailSignature(email: string, signoff: string, department: string) {
  return `<p style="font-family:Arial,Helvetica,sans-serif;text-align:left;margin:20px 0 0;">${signoff}</p>
  <p style="font-family:Arial,Helvetica,sans-serif;text-align:left;margin:15px 0 0;font-weight:700;color:#0f315a;">${department}</p>
  <p style="font-family:Arial,Helvetica,sans-serif;text-align:left;margin:14px 0 0;font-weight:700;">FACS (VIETNAM) TEAM</p>
  <p style="font-family:Arial,Helvetica,sans-serif;text-align:left;margin:7px 0 0;">Email: <a href="mailto:${email}" style="font-family:Arial,Helvetica,sans-serif;color:#067a98;">${email}</a><br>Website: <a href="https://facs.vn" style="font-family:Arial,Helvetica,sans-serif;color:#067a98;">www.facs.vn</a><br>Hotline: (+84) 972 798 424</p>`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatAmount(value: number | string, lang: "vi" | "en") {
  const n = Number(value);
  const digits = Number.isInteger(n) ? 0 : 2;
  return lang === "vi"
    ? `${new Intl.NumberFormat("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(n)} VND`
    : `VND ${new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: 2 }).format(n)}`;
}

function variables(r: ArReminder, lang: "vi" | "en"): Record<string, string> {
  return {
    recipient_name: r.recipient_name,
    company_name: r.company_name,
    tax_code: r.tax_code || "",
    amount: formatAmount(r.amount, lang),
    period: r.period,
    note: r.note || "",
  };
}

export function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (key in vars ? vars[key] : match));
}

const P = 'style="font-family:Arial,Helvetica,sans-serif;text-align:justify;text-justify:inter-word;margin:0 0 16px;white-space:pre-line;"';

function paragraphs(text: string) {
  return text.split(/\n\s*\n/).map((p) => `<p align="justify" ${P}>${escapeHtml(p)}</p>`).join("");
}

type Label = [vi: string, en: string];

/** Bảng song ngữ: nhãn tiếng Việt, bên dưới là tiếng Anh in nghiêng (giống các mục khác của email). */
function table(title: Label, rows: [Label, string, boolean?][]) {
  const cells = rows
    .filter(([, value]) => value)
    .map(([[vi, en], value, strong]) =>
      `<tr><td style="font-family:Arial,Helvetica,sans-serif;width:175px;padding:8px 10px;border-bottom:1px solid #edf0f4;color:#687386;vertical-align:top;line-height:1.35;">${escapeHtml(vi)}<br><span style="font-size:12px;font-style:italic;color:#8a95a5;">${escapeHtml(en)}</span></td><td style="font-family:Arial,Helvetica,sans-serif;padding:8px 10px;border-bottom:1px solid #edf0f4;vertical-align:middle;font-weight:${strong ? 700 : 600};${strong ? "color:#0f315a;font-size:15px;" : ""}white-space:pre-line;">${escapeHtml(value)}</td></tr>`)
    .join("");
  return `<p style="font-family:Arial,Helvetica,sans-serif;text-align:left;margin:22px 0 8px;font-weight:700;color:#0f315a;">${escapeHtml(title[0])} <span style="font-weight:400;font-style:italic;color:#687386;">/ ${escapeHtml(title[1])}</span></p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;text-align:left;background:#f7f9fb;border:1px solid #e3e8ef;">${cells}</table>`;
}

function tables(r: ArReminder, s: ArSettings) {
  const transfer = fill(s.transfer_note, variables(r, "vi")).trim();
  const details = table(["Chi tiết công nợ", "Outstanding balance"], [
    [["Công ty", "Company"], r.company_name],
    [["Mã số thuế", "Tax code"], r.tax_code || ""],
    [["Giai đoạn", "Period"], r.period],
    [["Số tiền cần thanh toán", "Amount due"], formatAmount(r.amount, "vi"), true],
    [["Ghi chú", "Note"], r.note || ""],
  ]);
  const bank = table(["Thông tin chuyển khoản", "Bank transfer details"], [
    [["Ngân hàng", "Bank"], s.bank_name],
    [["Chi nhánh", "Branch"], s.bank_branch],
    [["Số tài khoản", "Account number"], s.account_number, true],
    [["Chủ tài khoản", "Account holder"], s.account_holder],
    [["Mã SWIFT", "SWIFT code"], s.swift_code],
    [["Nội dung chuyển khoản", "Transfer reference"], transfer],
  ]);
  return `${details}${bank}`;
}

const SEPARATOR = '<div style="font-family:Arial,Helvetica,sans-serif;margin:26px 0;text-align:center;color:#a3acb9;letter-spacing:1px;">-------------------</div>';

/**
 * Bố cục: lời nhắn tiếng Việt → lời nhắn tiếng Anh → bảng công nợ và bảng chuyển khoản (song ngữ, hiện một lần)
 * → chữ ký Phòng Kế toán song ngữ. Cả hai lời nhắn đều nói "chi tiết bên dưới" nên đặt bảng ở cuối là đúng.
 */
function content(r: ArReminder, s: ArSettings) {
  const bodyVi = paragraphs(fill(s.body_vi, variables(r, "vi")));
  const bodyEn = paragraphs(fill(s.body_en, variables(r, "en")));
  const sign = buildEmailSignature(AR_SENDER, "Trân trọng, <span style=\"font-style:italic;color:#687386;\">/ Sincerely,</span>", "PHÒNG KẾ TOÁN <span style=\"font-weight:400;font-style:italic;color:#687386;\">/ ACCOUNTING DEPARTMENT</span>");
  return `${bodyVi}${SEPARATOR}${bodyEn}${tables(r, s)}<div style="height:6px"></div>${sign}`;
}

function shell(content: string, siteUrl: string) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f4;color:#243044;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,Helvetica,sans-serif;background:#eef1f4;">
    <tr><td align="center" style="font-family:Arial,Helvetica,sans-serif;padding:34px 14px 44px;">
      <img src="${baseUrl}/facs-email-signature-banner.png" alt="FACS" width="190" style="font-family:Arial,Helvetica,sans-serif;display:block;width:190px;max-width:48%;height:auto;margin:0 auto 22px;border:0;">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,Helvetica,sans-serif;width:100%;max-width:640px;background:#ffffff;border:1px solid #d8dee6;border-top:4px solid #22d3ee;">
        <tr><td align="justify" style="padding:34px 38px;color:#243044;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.72;text-align:justify;text-justify:inter-word;">${content}</td></tr>
      </table>
      <div style="font-family:Arial,Helvetica,sans-serif;padding-top:18px;font-size:11px;line-height:1.5;color:#8a95a5;">Email này được gửi từ Phòng Kế toán FACS. Anh/Chị có thể phản hồi trực tiếp email này.<br>This email was sent by the FACS Accounting Department. You may reply directly to this email.</div>
    </td></tr>
  </table>
</body></html>`;
}

export function buildArReminderEmail(r: ArReminder, s: ArSettings, siteUrl = "https://facs.vn") {
  const subject = fill(s.subject, variables(r, "vi")).replace(/\s+/g, " ").trim().slice(0, 300);
  const html = shell(content(r, s), siteUrl);
  return { subject, html };
}

export const SAMPLE_REMINDER: ArReminder = {
  recipient_name: "Nguyễn Văn A",
  recipient_emails: ["ketoan@abc.vn"],
  company_name: "Công ty TNHH ABC",
  tax_code: "0312345678",
  amount: 15_000_000,
  period: "Quý 3/2026",
  note: "Phí dịch vụ kế toán tháng 7–9/2026",
};
