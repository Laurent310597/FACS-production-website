import { supabase } from "./supabaseClient";

// CMS > AR: email nhắc công nợ gửi từ accounting@facs.vn. Lưu và gửi đều qua Edge Function ar-email (kiểm tra phía máy chủ).

export const AR_TEMPLATE_URL = "/templates/facs-ar-nhac-cong-no-mau.xlsx";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 500;

export const statusLabel = { draft: "Chưa gửi", sending: "Đang gửi", sent: "Đã gửi", failed: "Lỗi" };

export async function invokeArEmail(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("ar-email", { body: { action, ...payload } });
  if (error) {
    let message = error.message || "Không thể gọi dịch vụ email công nợ.";
    let details = null;
    try {
      details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // Giữ thông báo gốc.
    }
    if (!details && /not found|404|Failed to send/i.test(message)) message = "Edge Function ar-email chưa được triển khai trên Supabase.";
    const err = new Error(message);
    err.rowErrors = details?.row_errors || null;
    throw err;
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listReminders() {
  const { data, error } = await supabase.from("ar_reminders").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function deleteReminders(ids) {
  const { error } = await supabase.from("ar_reminders").delete().in("id", ids).in("status", ["draft", "failed"]);
  if (error) throw new Error(error.message);
}

export function formatVnd(value) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(Number(value || 0))} ₫`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;

export function splitEmails(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/[;,\s]+/);
  return [...new Set(list.map((v) => String(v).trim().toLowerCase()).filter(Boolean))];
}

export function toAmount(value) {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : NaN;
}

/** Kiểm tra nhanh ở trình duyệt để báo lỗi ngay; máy chủ kiểm tra lại khi lưu. */
export function validateReminder(row) {
  const errors = [];
  const to = splitEmails(row.recipient_emails);
  const cc = splitEmails(row.cc_emails);
  if (!String(row.recipient_name || "").trim()) errors.push("thiếu người nhận");
  if (!to.length) errors.push("thiếu email");
  const bad = [...to, ...cc].filter((e) => !EMAIL_RE.test(e));
  if (bad.length) errors.push(`email sai: ${bad.join(", ")}`);
  if (to.length > 10 || cc.length > 10) errors.push("tối đa 10 email");
  if (!String(row.company_name || "").trim()) errors.push("thiếu tên công ty");
  const amount = toAmount(row.amount);
  if (!Number.isFinite(amount) || amount <= 0) errors.push("số tiền phải > 0");
  if (!String(row.period || "").trim()) errors.push("thiếu giai đoạn nợ");
  return errors;
}

// ───────────── Đọc file Excel / CSV ─────────────

const COLUMN_ALIASES = {
  recipient_name: ["nguoi nhan", "nguoi nhan thong tin", "ten nguoi nhan", "nguoi lien he", "recipient", "recipient name", "contact"],
  recipient_emails: ["email nguoi nhan", "email", "email nhan", "email khach hang", "email ke toan", "to", "recipient email"],
  cc_emails: ["email cc", "cc", "cc email"],
  company_name: ["ten cong ty khach hang", "ten cong ty", "cong ty", "khach hang", "ten khach hang", "company", "company name", "customer"],
  tax_code: ["mst", "ma so thue", "tax code", "tax id"],
  amount: ["so tien no vnd", "so tien no", "so tien", "cong no", "so du no", "amount", "amount due"],
  period: ["giai doan no", "giai doan", "ky no", "ky", "thoi gian", "period"],
  note: ["ghi chu", "note", "notes", "dien giai"],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const aliasLookup = new Map(Object.entries(COLUMN_ALIASES).flatMap(([key, list]) => list.map((alias) => [alias, key])));

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString("vi-VN");
  return String(value).trim();
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const delimiter = [",", ";", "\t"].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else value += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(value);
      value = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += ch;
  }
  row.push(value);
  rows.push(row);
  return rows;
}

/** Trả về { rows, errors } — rows có thêm _line (số dòng trong file) và _errors. */
export function normalizeReminderMatrix(matrix) {
  let headerIndex = -1;
  let keys = [];
  for (let i = 0; i < Math.min(matrix.length, 15); i += 1) {
    const mapped = (matrix[i] || []).map((cell) => aliasLookup.get(normalizeHeader(cell)) || null);
    if (mapped.includes("company_name") && mapped.includes("recipient_emails")) {
      headerIndex = i;
      keys = mapped;
      break;
    }
  }
  if (headerIndex < 0) {
    return { rows: [], errors: ["Không tìm thấy dòng tiêu đề có cột “Tên công ty khách hàng” và “Email người nhận”. Hãy dùng file mẫu."] };
  }
  const missing = ["recipient_name", "amount", "period"].filter((k) => !keys.includes(k));
  if (missing.length) {
    const names = { recipient_name: "Người nhận", amount: "Số tiền nợ", period: "Giai đoạn nợ" };
    return { rows: [], errors: [`Thiếu cột: ${missing.map((k) => names[k]).join(", ")}.`] };
  }
  const rows = [];
  for (let i = headerIndex + 1; i < matrix.length; i += 1) {
    const source = matrix[i] || [];
    if (!source.some((cell) => cellText(cell))) continue;
    const row = { _line: i + 1 };
    keys.forEach((key, index) => {
      if (!key || row[key] !== undefined) return;
      row[key] = key === "amount" && typeof source[index] === "number" ? source[index] : cellText(source[index]);
    });
    row.recipient_emails = splitEmails(row.recipient_emails).join("; ");
    row.cc_emails = splitEmails(row.cc_emails).join("; ");
    row._errors = validateReminder(row);
    rows.push(row);
  }
  if (!rows.length) return { rows: [], errors: ["File không có dòng dữ liệu nào."] };
  if (rows.length > MAX_ROWS) return { rows: [], errors: [`Tối đa ${MAX_ROWS} dòng mỗi lần tải lên (file có ${rows.length} dòng).`] };
  return { rows, errors: [] };
}

export async function readReminderFile(file) {
  if (!file) throw new Error("Vui lòng chọn file.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File vượt quá 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  let matrix;
  if (ext === "csv") matrix = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  else if (ext === "xlsx") {
    const { default: readXlsxFile } = await import("read-excel-file");
    matrix = await readXlsxFile(file);
  } else throw new Error("Chỉ nhận file .xlsx hoặc .csv. Với file .xls cũ, hãy lưu lại dưới dạng .xlsx.");
  return normalizeReminderMatrix(matrix);
}

/** Bỏ các trường phụ (_line, _errors) trước khi gửi lên máy chủ. */
export const toPayload = (row) => ({
  recipient_name: row.recipient_name,
  recipient_emails: row.recipient_emails,
  cc_emails: row.cc_emails || "",
  company_name: row.company_name,
  tax_code: row.tax_code || "",
  amount: row.amount,
  period: row.period,
  note: row.note || "",
});
