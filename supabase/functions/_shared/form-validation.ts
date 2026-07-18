export const MAX_CV_BYTES = 5 * 1024 * 1024;

const allowedCvTypes: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").replaceAll("\u0000", "").trim().slice(0, maxLength);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizeCv(file: File) {
  const originalName = file.name.trim().slice(0, 180);
  const extension = originalName.split(".").pop()?.toLowerCase() || "";
  const mimeType = allowedCvTypes[extension];
  if (!mimeType) throw new Error("CV chỉ chấp nhận định dạng PDF, DOC hoặc DOCX.");
  if (!file.size) throw new Error("File CV đang trống.");
  if (file.size > MAX_CV_BYTES) throw new Error("CV vượt quá giới hạn 5 MB.");

  const safeStem = originalName
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "facs-cv";

  return {
    originalName,
    extension,
    mimeType,
    safeName: `${safeStem}.${extension}`,
  };
}

export function hasValidCvSignature(bytes: Uint8Array, extension: string) {
  if (extension === "pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
  }
  if (extension === "doc") {
    const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    return bytes.length >= ole.length && ole.every((value, index) => bytes[index] === value);
  }
  if (extension === "docx") {
    const zipSignatures = [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]];
    return bytes.length >= 4 && zipSignatures.some((signature) => signature.every((value, index) => bytes[index] === value));
  }
  return false;
}

export function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
