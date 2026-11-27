// Thẻ danh thiếp số: đường dẫn, số điện thoại quốc tế, tệp danh bạ vCard 3.0.
// Thuần JS (không React, không trình duyệt) để dùng chung cho trang /card/:slug và bước build (vite.config.js).
import { COMPANY } from "../data/company.js";

/** Đường dẫn thẻ trên tên miền chính (dùng cho QR in ấn và chia sẻ). */
export function cardUrl(slug, origin = COMPANY.url) {
  return `${origin.replace(/\/$/, "")}/card/${slug}`;
}

/** "0971 268 298" / "(+84) 972 798 424" → "+84971268298". */
export function toE164(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("84")) return `+${digits}`;
  if (digits.startsWith("0")) return `+84${digits.slice(1)}`;
  return digits;
}

/** Số dùng cho Zalo (zalo.me/0971268298). */
export function zaloNumber(phone) {
  const e164 = toE164(phone);
  return e164.startsWith("+84") ? `0${e164.slice(3)}` : e164.replace(/^\+/, "");
}

/** Bản đồ Google cho một địa chỉ. */
export function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Thoát ký tự đặc biệt theo vCard 3.0 (RFC 2426): \ , ; xuống dòng.
const esc = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

// Gập dòng dài 75 ký tự (CRLF + khoảng trắng) – tính theo ký tự để không cắt đôi chữ có dấu.
function fold(line) {
  const chars = Array.from(line);
  if (chars.length <= 75) return line;
  const parts = [chars.slice(0, 75).join("")];
  for (let i = 75; i < chars.length; i += 74) parts.push(` ${chars.slice(i, i + 74).join("")}`);
  return parts.join("\r\n");
}

/**
 * Tạo nội dung tệp .vcf cho một thành viên.
 * @param {object} person  bản ghi trong src/data/team.js (name, title, titleVi, phone, email, slug)
 * @param {"vi"|"en"} lang  ngôn ngữ chức danh và địa chỉ
 * @param {string} [photoBase64]  ảnh JPEG (base64, không có tiền tố data:)
 */
export function buildVCard(person, lang = "vi", photoBase64 = "") {
  const vi = lang === "vi";
  const words = person.name.trim().split(/\s+/);
  const family = words[0];
  const given = words.slice(1).join(" ");
  const office = COMPANY.offices[0];
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N;CHARSET=UTF-8:${esc(family)};${esc(given)};;;`,
    `FN;CHARSET=UTF-8:${esc(person.name)}`,
    `ORG;CHARSET=UTF-8:${esc(COMPANY.name)}`,
    `TITLE;CHARSET=UTF-8:${esc(vi ? person.titleVi : person.title)}`,
    `TEL;TYPE=CELL,VOICE:${toE164(person.phone)}`,
    `TEL;TYPE=WORK,VOICE:${toE164(COMPANY.hotline)}`,
    `EMAIL;TYPE=INTERNET,WORK:${person.email}`,
    `URL;TYPE=WORK:${COMPANY.url}`,
    `URL:${cardUrl(person.slug)}`,
    `X-SOCIALPROFILE;TYPE=facebook:${COMPANY.facebook}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${COMPANY.linkedin}`,
    `ADR;TYPE=WORK;CHARSET=UTF-8:;;${esc(vi ? office.streetVi : office.street)};${esc(vi ? office.localityVi : office.locality)};${esc(vi ? "Thành phố Hồ Chí Minh" : "Ho Chi Minh City")};;${esc(vi ? "Việt Nam" : "Vietnam")}`,
    `NOTE;CHARSET=UTF-8:${esc(
      vi
        ? `${COMPANY.name} – ${COMPANY.sloganVi}\nWebsite: ${COMPANY.url}\nFacebook: ${COMPANY.facebook}\nHotline: ${COMPANY.hotline}`
        : `${COMPANY.name} – ${COMPANY.slogan}\nWebsite: ${COMPANY.url}\nFacebook: ${COMPANY.facebook}\nHotline: ${COMPANY.hotline}`,
    )}`,
  ];
  if (photoBase64) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${photoBase64}`);
  lines.push("END:VCARD");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
