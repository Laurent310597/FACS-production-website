export const legalCalendarImportColumns = [
  { key: "event_date", label: "Ngày / Date", required: true },
  { key: "category", label: "Lĩnh vực / Category", required: false },
  { key: "title_vi", label: "Tiêu đề tiếng Việt / Vietnamese title", required: false },
  { key: "title_en", label: "Tiêu đề tiếng Anh / English title", required: false },
  { key: "summary_vi", label: "Nội dung lịch - ghi chú tiếng Việt / Vietnamese calendar content", required: false },
  { key: "summary_en", label: "Nội dung lịch - ghi chú tiếng Anh / English calendar content", required: false },
  { key: "target_audience_vi", label: "Đối tượng áp dụng tiếng Việt / Applicability in Vietnamese", required: false },
  { key: "target_audience_en", label: "Đối tượng áp dụng tiếng Anh / Applicability in English", required: false },
  { key: "legal_basis_vi", label: "Cơ sở pháp lý tiếng Việt / Vietnamese legal basis", required: false },
  { key: "legal_basis_en", label: "Cơ sở pháp lý tiếng Anh / English legal basis", required: false },
  { key: "period_label_vi", label: "Kỳ áp dụng tiếng Việt / Vietnamese period", required: false },
  { key: "period_label_en", label: "Kỳ áp dụng tiếng Anh / English period", required: false },
  { key: "official_source_url", label: "Nguồn chính thức / Official source URL", required: false },
  { key: "source_name", label: "Tên nguồn / Source name", required: false },
  { key: "notes", label: "Ghi chú quản trị / Internal notes", required: false },
];

const aliases = {
  event_date: ["event_date", "date", "ngay", "ngay_date", "ngay_den_han", "deadline"],
  category: ["category", "linh_vuc", "linh_vuc_category", "loai", "nhom"],
  title_vi: ["title_vi", "tieu_de_vi", "tieu_de_tieng_viet", "vietnamese_title"],
  title_en: ["title_en", "tieu_de_en", "tieu_de_tieng_anh", "english_title"],
  summary_vi: ["summary_vi", "noi_dung_vi", "ghi_chu_vi", "noi_dung_lich_ghi_chu_tieng_viet", "vietnamese_calendar_content"],
  summary_en: ["summary_en", "noi_dung_en", "ghi_chu_en", "noi_dung_lich_ghi_chu_tieng_anh", "english_calendar_content"],
  target_audience_vi: ["target_audience_vi", "doi_tuong_ap_dung_vi", "doi_tuong_ap_dung_tieng_viet", "applicability_in_vietnamese"],
  target_audience_en: ["target_audience_en", "doi_tuong_ap_dung_en", "doi_tuong_ap_dung_tieng_anh", "applicability_in_english"],
  legal_basis_vi: ["legal_basis_vi", "co_so_phap_ly_vi", "can_cu_phap_ly_vi", "co_so_phap_ly_tieng_viet", "vietnamese_legal_basis"],
  legal_basis_en: ["legal_basis_en", "co_so_phap_ly_en", "can_cu_phap_ly_en", "co_so_phap_ly_tieng_anh", "english_legal_basis"],
  period_label_vi: ["period_label_vi", "ky_ap_dung_vi", "ky_ap_dung_tieng_viet", "vietnamese_period"],
  period_label_en: ["period_label_en", "ky_ap_dung_en", "ky_ap_dung_tieng_anh", "english_period"],
  official_source_url: ["official_source_url", "source_url", "nguon_chinh_thuc", "nguon_chinh_thuc_official_source_url", "official_source"],
  source_name: ["source_name", "ten_nguon", "ten_nguon_source_name"],
  notes: ["notes", "ghi_chu", "ghi_chu_quan_tri", "ghi_chu_quan_tri_internal_notes", "internal_notes"],
};

const aliasLookup = new Map();
for (const column of legalCalendarImportColumns) {
  aliases[column.key].forEach((alias) => aliasLookup.set(alias, column.key));
  aliasLookup.set(normalizeHeader(column.label), column.key);
}

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsv(text) {
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
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => String(cell).trim())) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }

  row.push(value);
  if (row.some((cell) => String(cell).trim())) rows.push(row);
  return rows;
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

  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dayFirst = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirst) return `${dayFirst[3]}-${twoDigits(dayFirst[2])}-${twoDigits(dayFirst[1])}`;
  return "";
}

function normalizeCategory(value) {
  const normalized = normalizeHeader(value);
  if (!normalized) return "other";
  if (["tax", "thue"].includes(normalized)) return "tax";
  if (["accounting", "ke_toan"].includes(normalized)) return "accounting";
  if (["labor", "labour", "lao_dong"].includes(normalized)) return "labor";
  if (["insurance", "social_insurance", "bao_hiem", "bhxh"].includes(normalized)) return "insurance";
  if (["hse", "an_toan", "an_toan_lao_dong", "moi_truong"].includes(normalized)) return "hse";
  if (["corporate", "investment", "doanh_nghiep", "dau_tu", "doanh_nghiep_dau_tu"].includes(normalized)) return "corporate";
  return "other";
}

function toText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeRows(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    return { rows: [], errors: ["File phải có một dòng tiêu đề và ít nhất một dòng dữ liệu."] };
  }

  const headers = matrix[0].map((header) => aliasLookup.get(normalizeHeader(header)) || null);
  const missingDate = !headers.includes("event_date");
  if (missingDate) {
    return { rows: [], errors: ["Không tìm thấy cột “Ngày / Date”. Vui lòng sử dụng file mẫu của FACS."] };
  }

  const rows = [];
  const errors = [];
  for (let index = 1; index < matrix.length; index += 1) {
    const sourceRow = matrix[index] || [];
    if (!sourceRow.some((cell) => toText(cell))) continue;
    const mapped = {};
    headers.forEach((key, columnIndex) => {
      if (key) mapped[key] = sourceRow[columnIndex];
    });

    const rowNumber = index + 1;
    const eventDate = normalizeDate(mapped.event_date);
    const titleVi = toText(mapped.title_vi);
    const titleEn = toText(mapped.title_en);
    if (!eventDate) errors.push(`Dòng ${rowNumber}: ngày không hợp lệ; dùng định dạng YYYY-MM-DD hoặc DD/MM/YYYY.`);
    if (!titleVi && !titleEn) errors.push(`Dòng ${rowNumber}: cần có tiêu đề bằng ít nhất một ngôn ngữ.`);
    const officialSourceUrl = toText(mapped.official_source_url);
    if (officialSourceUrl && !/^https:\/\//i.test(officialSourceUrl)) errors.push(`Dòng ${rowNumber}: nguồn chính thức phải bắt đầu bằng https://.`);

    rows.push({
      row_number: rowNumber,
      event_date: eventDate,
      category: normalizeCategory(mapped.category),
      title_vi: titleVi,
      title_en: titleEn,
      summary_vi: toText(mapped.summary_vi),
      summary_en: toText(mapped.summary_en),
      target_audience_vi: toText(mapped.target_audience_vi),
      target_audience_en: toText(mapped.target_audience_en),
      legal_basis_vi: toText(mapped.legal_basis_vi),
      legal_basis_en: toText(mapped.legal_basis_en),
      period_label_vi: toText(mapped.period_label_vi),
      period_label_en: toText(mapped.period_label_en),
      official_source_url: officialSourceUrl,
      source_name: toText(mapped.source_name),
      notes: toText(mapped.notes),
    });
  }

  if (rows.length > 500) errors.push("Mỗi lần chỉ được nhập tối đa 500 dòng.");
  return { rows, errors };
}

export async function readLegalCalendarImportFile(file) {
  if (!file) return { rows: [], errors: ["Vui lòng chọn file Excel hoặc CSV."] };
  if (file.size > 5 * 1024 * 1024) return { rows: [], errors: ["File vượt quá giới hạn 5 MB."] };

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    return normalizeRows(parseCsv(text));
  }
  if (extension === "xlsx") {
    const { default: readXlsxFile } = await import("read-excel-file");
    const matrix = await readXlsxFile(file, { dateFormat: "yyyy-mm-dd" });
    return normalizeRows(matrix);
  }
  return { rows: [], errors: ["Định dạng chưa được hỗ trợ. Vui lòng chọn file .xlsx hoặc .csv."] };
}
