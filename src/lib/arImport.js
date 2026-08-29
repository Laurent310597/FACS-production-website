const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 2000;

export const arCustomerColumns = [
  { key: "customer_code", label: "Mã khách hàng / Customer code" },
  { key: "legal_name", label: "Tên khách hàng / Customer name", required: true },
  { key: "tax_code", label: "Mã số thuế / Tax code" },
  { key: "address", label: "Địa chỉ / Address" },
  { key: "contact_name", label: "Người liên hệ / Contact person" },
  { key: "primary_email", label: "Email kế toán / Accounting email" },
  { key: "cc_emails", label: "Email CC" },
  { key: "payment_terms_days", label: "Số ngày thanh toán / Payment terms" },
  { key: "preferred_language", label: "Ngôn ngữ / Language" },
  { key: "is_active", label: "Đang hoạt động / Active" },
  { key: "notes", label: "Ghi chú / Notes" },
];

export const arInvoiceColumns = [
  { key: "invoice_series", label: "Ký hiệu hóa đơn / Invoice series" },
  { key: "invoice_number", label: "Số hóa đơn / Invoice number", required: true },
  { key: "invoice_date", label: "Ngày hóa đơn / Invoice date", required: true },
  { key: "customer_name", label: "Tên khách hàng / Customer name" },
  { key: "tax_code", label: "Mã số thuế / Tax code" },
  { key: "address", label: "Địa chỉ / Address" },
  { key: "customer_email", label: "Email khách hàng / Customer email" },
  { key: "description", label: "Diễn giải / Description" },
  { key: "subtotal", label: "Tiền trước thuế / Subtotal" },
  { key: "vat_amount", label: "Tiền thuế GTGT / VAT amount" },
  { key: "total_amount", label: "Tổng thanh toán / Total amount", required: true },
  { key: "due_date", label: "Hạn thanh toán / Due date" },
  { key: "source_status", label: "Trạng thái hóa đơn / Invoice status" },
];

const customerAliases = {
  customer_code: ["customer_code", "client_code", "ma_khach_hang", "ma_kh", "ma_doi_tuong"],
  legal_name: ["legal_name", "customer_name", "client_name", "ten_khach_hang", "ten_don_vi", "ten_cong_ty", "nguoi_mua", "don_vi_mua_hang"],
  tax_code: ["tax_code", "mst", "ma_so_thue", "ma_so_thue_khach_hang", "buyer_tax_code"],
  address: ["address", "dia_chi", "dia_chi_khach_hang", "buyer_address"],
  contact_name: ["contact_name", "contact_person", "nguoi_lien_he", "ke_toan_phu_trach"],
  primary_email: ["primary_email", "accounting_email", "email", "email_ke_toan", "email_nhan_hoa_don", "buyer_email"],
  cc_emails: ["cc_emails", "email_cc", "cc", "cc_email"],
  payment_terms_days: ["payment_terms_days", "payment_terms", "so_ngay_thanh_toan", "han_thanh_toan_ngay"],
  preferred_language: ["preferred_language", "language", "ngon_ngu", "ngon_ngu_email"],
  is_active: ["is_active", "active", "dang_hoat_dong", "trang_thai_hoat_dong"],
  notes: ["notes", "note", "ghi_chu"],
};

const invoiceAliases = {
  invoice_series: ["invoice_series", "invoice_symbol", "serial", "ky_hieu", "ky_hieu_hoa_don", "mau_so_ky_hieu", "series"],
  invoice_number: ["invoice_number", "invoice_no", "so_hoa_don", "so_hd", "invoice"],
  invoice_date: ["invoice_date", "issue_date", "ngay_hoa_don", "ngay_hd", "ngay_lap", "ngay_phat_hanh"],
  customer_name: ["customer_name", "buyer_name", "client_name", "ten_khach_hang", "ten_don_vi", "ten_nguoi_mua", "nguoi_mua", "don_vi_mua_hang"],
  tax_code: ["tax_code", "buyer_tax_code", "mst", "ma_so_thue", "ma_so_thue_nguoi_mua"],
  address: ["address", "buyer_address", "dia_chi", "dia_chi_nguoi_mua"],
  customer_email: ["customer_email", "buyer_email", "email", "email_nguoi_mua", "email_nhan_hoa_don"],
  description: ["description", "item_name", "dien_giai", "noi_dung", "ten_hang_hoa_dich_vu", "ten_hhdv"],
  subtotal: ["subtotal", "amount_before_tax", "tien_truoc_thue", "cong_tien_hang", "doanh_so_chua_thue", "thanh_tien_chua_thue"],
  vat_amount: ["vat_amount", "tax_amount", "tien_thue_gtgt", "tien_thue", "thue_gtgt"],
  total_amount: ["total_amount", "grand_total", "payment_total", "tong_thanh_toan", "tong_tien_thanh_toan", "tong_cong_tien_thanh_toan", "tong_tien", "tong_cong"],
  due_date: ["due_date", "payment_due_date", "han_thanh_toan", "ngay_den_han"],
  source_status: ["source_status", "invoice_status", "status", "trang_thai", "trang_thai_hoa_don", "tinh_trang"],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildAliasLookup(columns, aliases) {
  const lookup = new Map();
  columns.forEach((column) => {
    lookup.set(normalizeHeader(column.label), column.key);
    (aliases[column.key] || []).forEach((alias) => lookup.set(normalizeHeader(alias), column.key));
  });
  return lookup;
}

const customerAliasLookup = buildAliasLookup(arCustomerColumns, customerAliases);
const invoiceAliasLookup = buildAliasLookup(arInvoiceColumns, invoiceAliases);

function toText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function twoDigits(value) {
  return String(value).padStart(2, "0");
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${twoDigits(value.getMonth() + 1)}-${twoDigits(value.getDate())}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86_400_000);
    return parsed.toISOString().slice(0, 10);
  }

  const text = toText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${twoDigits(dayFirst[2])}-${twoDigits(dayFirst[1])}`;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  return "";
}

function validDate(value) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100) / 100;
  let text = toText(value);
  if (!text) return null;
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  text = text.replace(/[()\s₫đVND]/gi, "").replace(/-/g, "");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  const separator = Math.max(comma, dot);
  if (separator >= 0) {
    const digitsAfter = text.length - separator - 1;
    if (digitsAfter === 1 || digitsAfter === 2) {
      const integerPart = text.slice(0, separator).replace(/[.,]/g, "");
      const decimalPart = text.slice(separator + 1).replace(/[.,]/g, "");
      text = `${integerPart}.${decimalPart}`;
    } else text = text.replace(/[.,]/g, "");
  }
  text = text.replace(/[^0-9.]/g, "");
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return null;
  return Math.round((negative ? -parsed : parsed) * 100) / 100;
}

function normalizeEmail(value) {
  return toText(value).toLowerCase();
}

function isEmail(value) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseEmailList(value) {
  return [...new Set(toText(value).split(/[;,\n]+/).map(normalizeEmail).filter(Boolean))];
}

function parseBoolean(value, fallback = true) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeHeader(value);
  if (["false", "0", "no", "inactive", "khong", "ngung", "tam_ngung"].includes(normalized)) return false;
  if (["true", "1", "yes", "active", "co", "dang_hoat_dong"].includes(normalized)) return true;
  return fallback;
}

function normalizeLanguage(value) {
  const normalized = normalizeHeader(value);
  if (["vi", "vn", "vietnamese", "tieng_viet"].includes(normalized)) return "vi";
  if (["en", "english", "tieng_anh"].includes(normalized)) return "en";
  return "bilingual";
}

function normalizeInvoiceStatus(value) {
  const normalized = normalizeHeader(value);
  if (!normalized) return "issued";
  if (normalized.includes("huy") || normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("thay_the") || normalized.includes("replace")) return "replaced";
  if (normalized.includes("dieu_chinh") || normalized.includes("adjust")) return "adjusted";
  return "issued";
}

function findHeader(matrix, lookup, expectedKeys) {
  let best = { index: -1, keys: [], score: 0 };
  matrix.slice(0, 25).forEach((row, index) => {
    const keys = (row || []).map((cell) => lookup.get(normalizeHeader(cell)) || null);
    const unique = new Set(keys.filter(Boolean));
    const score = [...unique].reduce((total, key) => total + (expectedKeys.includes(key) ? 3 : 1), 0);
    if (score > best.score) best = { index, keys, score };
  });
  return best;
}

function mapSourceRow(sourceRow, keys) {
  const mapped = {};
  keys.forEach((key, index) => {
    if (key && mapped[key] === undefined) mapped[key] = sourceRow[index];
  });
  return mapped;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const options = [",", ";", "\t"];
  return options.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
}

function parseDelimited(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === delimiter) {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => toText(cell))) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => toText(cell))) rows.push(row);
  return rows;
}

async function readMatrix(file) {
  if (!file) throw new Error("Vui lòng chọn file Excel hoặc CSV.");
  if (file.size > MAX_FILE_SIZE) throw new Error("File vượt quá giới hạn 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseDelimited((await file.text()).replace(/^\uFEFF/, ""));
  if (extension === "xlsx" || extension === "xls") {
    const { default: readXlsxFile } = await import("read-excel-file");
    return readXlsxFile(file, { dateFormat: "yyyy-mm-dd" });
  }
  throw new Error("Định dạng chưa được hỗ trợ. Vui lòng chọn file .xlsx, .xls hoặc .csv.");
}

export function normalizeCustomerRows(matrix) {
  const errors = [];
  const warnings = [];
  const header = findHeader(matrix, customerAliasLookup, ["legal_name", "tax_code", "primary_email"]);
  if (header.index < 0 || !header.keys.includes("legal_name")) {
    return { rows: [], errors: ["Không tìm thấy cột Tên khách hàng. Vui lòng dùng file Master Data có dòng tiêu đề rõ ràng."], warnings, headerRow: null };
  }

  const rows = [];
  const seen = new Set();
  for (let index = header.index + 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index] || [];
    if (!sourceRow.some((cell) => toText(cell))) continue;
    const mapped = mapSourceRow(sourceRow, header.keys);
    const isRepeatedHeader = invoiceAliasLookup.get(normalizeHeader(mapped.invoice_number)) === "invoice_number"
      && invoiceAliasLookup.get(normalizeHeader(mapped.invoice_date)) === "invoice_date";
    if (isRepeatedHeader) continue;
    const rowNumber = index + 1;
    const legalName = toText(mapped.legal_name);
    const taxCode = toText(mapped.tax_code);
    const primaryEmail = normalizeEmail(mapped.primary_email);
    const ccEmails = parseEmailList(mapped.cc_emails);
    const paymentTerms = mapped.payment_terms_days === undefined || toText(mapped.payment_terms_days) === ""
      ? 30
      : Number(mapped.payment_terms_days);

    if (legalName.length < 2) errors.push(`Dòng ${rowNumber}: thiếu tên khách hàng.`);
    if (!isEmail(primaryEmail)) errors.push(`Dòng ${rowNumber}: email kế toán không hợp lệ.`);
    ccEmails.filter((email) => !isEmail(email)).forEach((email) => errors.push(`Dòng ${rowNumber}: email CC “${email}” không hợp lệ.`));
    if (!Number.isInteger(paymentTerms) || paymentTerms < 0 || paymentTerms > 365) errors.push(`Dòng ${rowNumber}: số ngày thanh toán phải từ 0 đến 365.`);
    if (!taxCode) warnings.push(`Dòng ${rowNumber}: chưa có MST; hệ thống sẽ đối chiếu bằng tên khách hàng.`);
    if (!primaryEmail) warnings.push(`Dòng ${rowNumber}: chưa có email kế toán.`);

    const key = taxCode ? `tax:${normalizeHeader(taxCode)}` : `name:${normalizeHeader(legalName)}`;
    if (seen.has(key)) errors.push(`Dòng ${rowNumber}: khách hàng bị trùng trong file.`);
    seen.add(key);

    rows.push({
      row_number: rowNumber,
      customer_code: toText(mapped.customer_code),
      legal_name: legalName,
      tax_code: taxCode,
      address: toText(mapped.address),
      contact_name: toText(mapped.contact_name),
      primary_email: primaryEmail,
      cc_emails: ccEmails,
      payment_terms_days: Number.isInteger(paymentTerms) ? paymentTerms : 30,
      preferred_language: normalizeLanguage(mapped.preferred_language),
      is_active: parseBoolean(mapped.is_active, true),
      notes: toText(mapped.notes),
    });
  }

  if (!rows.length) errors.push("Không tìm thấy dòng khách hàng nào sau dòng tiêu đề.");
  if (rows.length > MAX_ROWS) errors.push(`Mỗi lần chỉ được nhập tối đa ${MAX_ROWS} khách hàng.`);
  return { rows, errors, warnings, headerRow: header.index + 1 };
}

export function normalizeInvoiceRows(matrix) {
  const errors = [];
  const warnings = [];
  const header = findHeader(matrix, invoiceAliasLookup, ["invoice_number", "invoice_date", "customer_name", "tax_code", "total_amount"]);
  const required = ["invoice_number", "invoice_date", "total_amount"];
  const missing = required.filter((key) => !header.keys.includes(key));
  if (header.index < 0 || missing.length || (!header.keys.includes("customer_name") && !header.keys.includes("tax_code"))) {
    return {
      rows: [],
      errors: ["Không nhận diện được bảng hóa đơn. Cần có Số hóa đơn, Ngày hóa đơn, Tổng thanh toán và Tên khách hàng hoặc MST."],
      warnings,
      headerRow: null,
    };
  }

  const rows = [];
  const seen = new Set();
  for (let index = header.index + 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index] || [];
    if (!sourceRow.some((cell) => toText(cell))) continue;
    const mapped = mapSourceRow(sourceRow, header.keys);
    const rowNumber = index + 1;
    const invoiceSeries = toText(mapped.invoice_series).toUpperCase();
    const invoiceNumber = toText(mapped.invoice_number).toUpperCase();
    const invoiceDate = normalizeDate(mapped.invoice_date);
    const dueDate = normalizeDate(mapped.due_date);
    const customerName = toText(mapped.customer_name);
    const taxCode = toText(mapped.tax_code);
    const customerEmail = normalizeEmail(mapped.customer_email);
    const totalAmount = parseMoney(mapped.total_amount);
    const vatAmount = parseMoney(mapped.vat_amount) ?? 0;
    const subtotal = parseMoney(mapped.subtotal) ?? (totalAmount === null ? null : totalAmount - vatAmount);
    const normalizedRowText = normalizeHeader(sourceRow.map(toText).join(" "));
    if (!invoiceNumber && (normalizedRowText.includes("tong_cong") || normalizedRowText.includes("grand_total"))) continue;

    if (!invoiceNumber) errors.push(`Dòng ${rowNumber}: thiếu số hóa đơn.`);
    if (!validDate(invoiceDate)) errors.push(`Dòng ${rowNumber}: ngày hóa đơn không hợp lệ.`);
    if (!customerName && !taxCode) errors.push(`Dòng ${rowNumber}: cần có tên khách hàng hoặc MST.`);
    if (totalAmount === null) errors.push(`Dòng ${rowNumber}: tổng thanh toán không hợp lệ.`);
    if (dueDate && (!validDate(dueDate) || dueDate < invoiceDate)) errors.push(`Dòng ${rowNumber}: hạn thanh toán không hợp lệ.`);
    if (!isEmail(customerEmail)) errors.push(`Dòng ${rowNumber}: email khách hàng không hợp lệ.`);
    if (!invoiceSeries) warnings.push(`Dòng ${rowNumber}: chưa có ký hiệu hóa đơn; cần kiểm tra trước khi nhập.`);
    if (!taxCode) warnings.push(`Dòng ${rowNumber}: chưa có MST; hệ thống sẽ đối chiếu bằng tên khách hàng.`);
    if (totalAmount !== null && totalAmount <= 0) warnings.push(`Dòng ${rowNumber}: tổng thanh toán bằng hoặc nhỏ hơn 0; vui lòng kiểm tra hóa đơn điều chỉnh.`);
    if (!dueDate) warnings.push(`Dòng ${rowNumber}: hạn thanh toán sẽ lấy theo Customer Master, mặc định 30 ngày.`);

    const key = `${invoiceSeries}|${invoiceNumber}|${invoiceDate}`;
    if (seen.has(key)) errors.push(`Dòng ${rowNumber}: trùng số hóa đơn trong cùng file. Hãy dùng báo cáo một dòng cho mỗi hóa đơn.`);
    seen.add(key);

    rows.push({
      row_number: rowNumber,
      invoice_series: invoiceSeries,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: dueDate,
      customer_name: customerName,
      tax_code: taxCode,
      address: toText(mapped.address),
      customer_email: customerEmail,
      description: toText(mapped.description),
      subtotal,
      vat_amount: vatAmount,
      total_amount: totalAmount,
      source_status: normalizeInvoiceStatus(mapped.source_status),
    });
  }

  if (!rows.length) errors.push("Không tìm thấy dòng hóa đơn nào sau dòng tiêu đề.");
  if (rows.length > MAX_ROWS) errors.push(`Mỗi lần chỉ được nhập tối đa ${MAX_ROWS} hóa đơn.`);
  return { rows, errors, warnings, headerRow: header.index + 1 };
}

export async function readArCustomerFile(file) {
  return normalizeCustomerRows(await readMatrix(file));
}

export async function readArInvoiceFile(file) {
  return normalizeInvoiceRows(await readMatrix(file));
}

export async function sha256File(file) {
  if (!file || !globalThis.crypto?.subtle) return "";
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
