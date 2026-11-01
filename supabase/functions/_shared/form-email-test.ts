import { buildEditableReceipt } from "./form-email-templates.ts";
import type { CareerApplication, ContactInquiry, EditableReceiptTemplate } from "./form-email-templates.ts";

const TEST_RECIPIENT = { mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" };

export function buildFormReceiptTestMail(params: {
  senderEmail: string;
  siteUrl: string;
  template?: Partial<EditableReceiptTemplate> | null;
  now?: Date;
}) {
  const isCareer = params.senderEmail === "hr@facs.vn";
  if (!isCareer && params.senderEmail !== "contact@facs.vn") {
    throw new Error("Hộp thư công khai gửi thử không hợp lệ.");
  }
  const type = isCareer ? "career" : "contact";
  const templateKey = isCareer ? "career_receipt" : "contact_receipt";
  if (params.template?.template_key && params.template.template_key !== templateKey) {
    throw new Error("Mẫu email không khớp với hộp thư gửi thử.");
  }
  const common = {
    id: "00000000-0000-4000-8000-000000000001",
    full_name: "Nguyễn Văn A",
    email: TEST_RECIPIENT.mail_address,
    phone: "",
    submitted_at: (params.now || new Date()).toISOString(),
    internal_email_attempts: 0,
    receipt_email_attempts: 0,
  };
  const row: CareerApplication | ContactInquiry = isCareer
    ? { ...common, position: "Tax Consultant", cv_bucket: "", cv_path: "", cv_original_name: "", cv_mime_type: "" }
    : { ...common, company_name: "ABC Company", service_interest: "Tax Advisory", message: "Dữ liệu minh họa cho bản thử nội bộ." };
  const receipt = buildEditableReceipt(type, row, params.siteUrl, params.template);
  const banner = '<div style="padding:12px 16px;background:#fff4d6;color:#694600;font-family:Arial,sans-serif;text-align:center;">BẢN THỬ NỘI BỘ / INTERNAL TEST — Dữ liệu minh họa, không phải hồ sơ thực tế.</div>';

  return {
    senderEmail: params.senderEmail,
    senderName: isCareer ? "FACS Careers" : "FACS Contact",
    subject: `[TEST] ${receipt.subject}`,
    bodyHtml: receipt.html.replace(/(<body\b[^>]*>)/i, `$1${banner}`),
    to: [{ ...TEST_RECIPIENT }],
    cc: [],
    bcc: [],
    replyTo: [{ mail_address: params.senderEmail }],
  };
}
