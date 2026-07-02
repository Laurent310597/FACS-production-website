import taxImage from "../assets/insight-tax.svg";
import financeImage from "../assets/insight-finance.svg";
import legalImage from "../assets/insight-legal.svg";

export const insightCategories = [
  { value: "tax", en: "Tax", vi: "Thuế" },
  { value: "accounting", en: "Accounting", vi: "Kế toán" },
  { value: "finance", en: "Finance", vi: "Tài chính" },
  { value: "legal", en: "Legal", vi: "Pháp lý" },
  { value: "governance", en: "Governance", vi: "Quản trị" },
  { value: "business", en: "Business Advisory", vi: "Tư vấn doanh nghiệp" },
];

export const fallbackPosts = [
  {
    id: "demo-tax-2026",
    slug: "enterprise-tax-strategy-2026",
    slug_vi: "chien-luoc-thue-doanh-nghiep-2026",
    slug_en: "enterprise-tax-strategy-2026",
    category: "tax",
    title_en: "Enterprise Tax Strategy In 2026",
    title_vi: "Chiến lược thuế doanh nghiệp năm 2026",
    excerpt_en: "A practical perspective on building a proactive, compliant and sustainable enterprise tax strategy.",
    excerpt_vi: "Góc nhìn thực tiễn về việc xây dựng chiến lược thuế chủ động, tuân thủ và bền vững cho doanh nghiệp.",
    content_en: "<p>This sample article preserves the current Insights layout before the content management database is connected.</p><p>After the Supabase setup is completed, articles created in the FACS Admin Portal will automatically replace these demonstration cards.</p>",
    content_vi: "<p>Đây là bài viết mẫu nhằm giữ nguyên giao diện Insights hiện tại trước khi cơ sở dữ liệu quản trị nội dung được kết nối.</p><p>Sau khi hoàn tất thiết lập Supabase, các bài viết được tạo trong Cổng quản trị FACS sẽ tự động thay thế các thẻ minh họa này.</p>",
    cover_image_url: taxImage,
    author_name: "FACS",
    author_name_vi: "FACS",
    author_name_en: "FACS",
    published_at: "2026-01-12T00:00:00.000Z",
    status: "published",
    is_demo: true,
  },
  {
    id: "demo-finance",
    slug: "modern-financial-infrastructure",
    slug_vi: "nen-tang-tai-chinh-hien-dai",
    slug_en: "modern-financial-infrastructure",
    category: "finance",
    title_en: "Modern Financial Infrastructure",
    title_vi: "Nền tảng tài chính hiện đại",
    excerpt_en: "How disciplined financial systems improve visibility, control and management decision-making.",
    excerpt_vi: "Cách hệ thống tài chính kỷ luật nâng cao tính minh bạch, khả năng kiểm soát và chất lượng ra quyết định.",
    content_en: "<p>This sample article demonstrates the public article page and bilingual content experience.</p><p>Real articles can be drafted, reviewed, published, updated and removed from the protected admin area.</p>",
    content_vi: "<p>Bài viết mẫu này minh họa trang chi tiết công khai và trải nghiệm nội dung song ngữ.</p><p>Bài viết thực tế có thể được soạn, rà soát, xuất bản, cập nhật và xóa trong khu vực quản trị được bảo vệ.</p>",
    cover_image_url: financeImage,
    author_name: "FACS",
    author_name_vi: "FACS",
    author_name_en: "FACS",
    published_at: "2026-01-05T00:00:00.000Z",
    status: "published",
    is_demo: true,
  },
  {
    id: "demo-legal",
    slug: "corporate-governance-transformation",
    slug_vi: "chuyen-doi-quan-tri-doanh-nghiep",
    slug_en: "corporate-governance-transformation",
    category: "legal",
    title_en: "Corporate Governance Transformation",
    title_vi: "Chuyển đổi quản trị doanh nghiệp",
    excerpt_en: "Strengthening governance foundations to support compliance, accountability and scalable growth.",
    excerpt_vi: "Củng cố nền tảng quản trị để hỗ trợ tuân thủ, trách nhiệm giải trình và tăng trưởng có khả năng mở rộng.",
    content_en: "<p>The final CMS supports formatted content, cover images, categories, publication status and bilingual fields.</p><p>Only authenticated administrators can create or change articles.</p>",
    content_vi: "<p>Hệ thống CMS hoàn chỉnh hỗ trợ nội dung định dạng, ảnh bìa, chuyên mục, trạng thái xuất bản và các trường song ngữ.</p><p>Chỉ quản trị viên đã đăng nhập mới có thể tạo hoặc thay đổi bài viết.</p>",
    cover_image_url: legalImage,
    author_name: "FACS",
    author_name_vi: "FACS",
    author_name_en: "FACS",
    published_at: "2025-12-18T00:00:00.000Z",
    status: "published",
    is_demo: true,
  },
];

export function getCategoryLabel(category, language = "en") {
  const item = insightCategories.find((entry) => entry.value === category);
  if (!item) return language === "vi" ? "Góc nhìn" : "Insight";
  return item[language] || item.en;
}

export function getPostSlug(post, language = "en") {
  const primary = language === "vi" ? "vi" : "en";
  const fallback = primary === "vi" ? "en" : "vi";
  return post?.[`slug_${primary}`] || post?.[`slug_${fallback}`] || post?.slug || "";
}

export function getPostAuthor(post, language = "en") {
  const primary = language === "vi" ? "vi" : "en";
  const fallback = primary === "vi" ? "en" : "vi";
  return post?.[`author_name_${primary}`] || post?.[`author_name_${fallback}`] || post?.author_name || "FACS";
}

export function matchesPostSlug(post, slug = "") {
  return Boolean(slug) && [post?.slug, post?.slug_vi, post?.slug_en].filter(Boolean).includes(slug);
}

export function getLocalizedPost(post, language = "en") {
  const primary = language === "vi" ? "vi" : "en";
  const fallback = primary === "vi" ? "en" : "vi";

  return {
    ...post,
    title: post[`title_${primary}`] || post[`title_${fallback}`] || "Untitled",
    excerpt: post[`excerpt_${primary}`] || post[`excerpt_${fallback}`] || "",
    content: post[`content_${primary}`] || post[`content_${fallback}`] || "",
    slug: getPostSlug(post, language),
    author: getPostAuthor(post, language),
    coverAlt:
      post[`cover_image_alt_${primary}`] ||
      post[`cover_image_alt_${fallback}`] ||
      post[`title_${primary}`] ||
      post[`title_${fallback}`] ||
      "FACS Insight",
    seoTitle: post[`seo_title_${primary}`] || post[`title_${primary}`] || post[`title_${fallback}`],
    seoDescription:
      post[`seo_description_${primary}`] ||
      post[`excerpt_${primary}`] ||
      post[`excerpt_${fallback}`] ||
      "",
  };
}

export function slugify(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function formatPostDate(dateValue, language = "en") {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language === "vi" ? "vi-VN" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
