export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const VIETNAM_UTC_OFFSET = "+07:00";

export function getPublicationState(post, now = new Date()) {
  if (!post || post.status !== "published") return "draft";
  if (!post.published_at) return "draft";

  const publicationTime = new Date(post.published_at).getTime();
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(publicationTime) || Number.isNaN(currentTime)) return "draft";
  return publicationTime > currentTime ? "scheduled" : "published";
}

export function vietnamDateTimeInputToIso(value) {
  if (!value) return null;
  const normalized = value.length === 16 ? `${value}:00` : value;
  const date = new Date(`${normalized}${VIETNAM_UTC_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isoToVietnamDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function getMinimumVietnamDateTimeInput(minutesFromNow = 1) {
  const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
  return isoToVietnamDateTimeInput(date.toISOString());
}

export function formatVietnamDateTime(value, language = "vi") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}
