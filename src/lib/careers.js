import { slugify } from "./insights";

export const employmentTypes = [
  { value: "full-time", en: "Full-time", vi: "Toàn thời gian" },
  { value: "part-time", en: "Part-time", vi: "Bán thời gian" },
  { value: "contract", en: "Contract", vi: "Hợp đồng" },
  { value: "internship", en: "Internship", vi: "Thực tập" },
];

export const workplaceTypes = [
  { value: "onsite", en: "On-site", vi: "Làm việc tại văn phòng" },
  { value: "hybrid", en: "Hybrid", vi: "Làm việc kết hợp" },
  { value: "remote", en: "Remote", vi: "Làm việc từ xa" },
];

function getOptionLabel(options, value, language) {
  const option = options.find((item) => item.value === value);
  return option?.[language] || option?.en || value || "";
}

export function getEmploymentTypeLabel(value, language = "en") {
  return getOptionLabel(employmentTypes, value, language);
}

export function getWorkplaceTypeLabel(value, language = "en") {
  return getOptionLabel(workplaceTypes, value, language);
}

export function getLocalizedJob(job, language = "en") {
  const primary = language === "vi" ? "vi" : "en";
  const fallback = primary === "vi" ? "en" : "vi";

  return {
    ...job,
    title: job[`title_${primary}`] || job[`title_${fallback}`] || (language === "vi" ? "Vị trí chưa có tiêu đề" : "Untitled position"),
    summary: job[`summary_${primary}`] || job[`summary_${fallback}`] || "",
    content: job[`content_${primary}`] || job[`content_${fallback}`] || "",
    department: job[`department_${primary}`] || job[`department_${fallback}`] || "",
    location: job[`location_${primary}`] || job[`location_${fallback}`] || "",
  };
}

export function formatApplicationDeadline(value, language = "en") {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export { slugify };
