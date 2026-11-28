// SEO kỹ thuật của website FACS: tiêu đề, mô tả, đường dẫn chuẩn (canonical), ảnh chia sẻ và dữ liệu có cấu trúc (JSON-LD).
// Thuần JS, không phụ thuộc React/trình duyệt: dùng chung cho trang chạy trên trình duyệt (SeoManager)
// và bước build (vite.config.js) để tạo sẵn HTML từng trang cho Google, Zalo, Facebook đọc.
// Mọi câu chữ lấy từ nội dung đang hiển thị trên website (tiêu đề, đoạn giới thiệu, dữ liệu dịch vụ/lĩnh vực/công cụ).
import { COMPANY } from "../data/company.js";

export const SITE_URL = COMPANY.url;
export const DEFAULT_IMAGE = `${SITE_URL}/og/facs-og.jpg`;
export const ORG_ID = `${SITE_URL}/#organization`;

const T = (vi, en) => ({ vi, en });
const pickLang = (pair, lang) => (lang === "en" ? pair.en : pair.vi);
const clip = (text = "", max = 200) => {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")) || cut}…`;
};
const plain = (text = "") =>
  String(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_>`~|[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Trang tĩnh: tiêu đề + mô tả (VI/EN). */
export const STATIC_PAGES = {
  "/": {
    title: T("FACS | Tư vấn kế toán, thuế, pháp lý & vận hành doanh nghiệp", "FACS | Strategic Financial Infrastructure"),
    description: T(
      "FACS là đối tác tư vấn chiến lược toàn diện, cung cấp giải pháp kế toán, thuế, pháp lý và vận hành cho startup, doanh nghiệp vừa và nhỏ, cũng như doanh nghiệp đang tăng trưởng tại Việt Nam.",
      "FACS is a comprehensive strategic consulting partner providing accounting, taxation, legal and enterprise operational solutions for startups, SMEs and growing businesses in Vietnam.",
    ),
    priority: 1,
  },
  "/about": {
    title: T("Giới thiệu FACS | Nền tảng tài chính chiến lược cho doanh nghiệp hiện đại", "About FACS | Strategic Financial Infrastructure For Modern Enterprises"),
    description: T(
      "FACS là đối tác tư vấn chiến lược, cung cấp các giải pháp kế toán, thuế, pháp lý và vận hành được thiết kế nhằm hỗ trợ doanh nghiệp tăng trưởng bền vững.",
      "FACS is a strategic consulting partner delivering accounting, taxation, legal and operational solutions designed for sustainable enterprise growth.",
    ),
    priority: 0.8,
  },
  "/services": {
    title: T("Dịch vụ tư vấn kế toán, thuế, pháp lý, kiểm toán & ERP | FACS", "Integrated Consulting Infrastructure | FACS Services"),
    description: T(
      "Giải pháp tư vấn kế toán, thuế, pháp lý, kiểm toán, ERP và vận hành toàn diện cho doanh nghiệp hiện đại.",
      "Comprehensive accounting, taxation, legal, audit, ERP and operational consulting solutions designed for modern enterprises.",
    ),
    priority: 0.9,
  },
  "/industries": {
    title: T("Chuyên môn sâu theo từng lĩnh vực | FACS", "Specialized Expertise Across Industries | FACS"),
    description: T(
      "FACS cung cấp nền tảng tư vấn tài chính, thuế và pháp lý được thiết kế phù hợp với từng lĩnh vực doanh nghiệp tại Việt Nam.",
      "FACS delivers tailored financial, taxation and legal consulting infrastructure across diverse industries and enterprise sectors.",
    ),
    priority: 0.7,
  },
  "/insights": {
    title: T("Tri thức kinh doanh chiến lược | FACS Insights", "Strategic Business Intelligence | FACS Insights"),
    description: T(
      "Phân tích thực tiễn về kế toán, thuế, tài chính, pháp lý và quản trị dành cho doanh nghiệp tại Việt Nam.",
      "Practical perspectives on accounting, tax, finance, legal compliance and governance for enterprises in Vietnam.",
    ),
    priority: 0.8,
  },
  "/legal-calendar": {
    title: T("Lịch pháp lý doanh nghiệp – hạn kê khai thuế, kế toán, lao động, bảo hiểm | FACS", "Corporate Legal Calendar – tax, accounting, labour & insurance deadlines | FACS"),
    description: T(
      "Theo dõi các mốc kê khai, báo cáo và nghĩa vụ định kỳ về thuế, kế toán, lao động, bảo hiểm và HSE — được FACS rà soát trước khi công bố.",
      "Track recurring filing, reporting and compliance deadlines across tax, accounting, labour, social insurance and HSE — reviewed by FACS before publication.",
    ),
    priority: 0.8,
  },
  "/tools": {
    title: T("Công cụ dành cho doanh nghiệp & cá nhân – tính lương Gross Net, thuế TNCN, BHXH | FACS", "Business & Personal Tools – Gross–Net salary, PIT, social insurance | FACS"),
    description: T(
      "Tính lương Gross – Net, thuế TNCN, BHTN, BHXH một lần, lập kế hoạch tiết kiệm và theo dõi dữ liệu thị trường tài chính.",
      "Gross – Net salary, personal income tax, unemployment benefit, one-time social insurance, savings planner and financial market data.",
    ),
    priority: 0.8,
  },
  "/careers": {
    title: T("Tuyển dụng | Kiến tạo tương lai cùng FACS", "Careers | Build The Future With FACS"),
    description: T(
      "Gia nhập môi trường tư vấn hiện đại, nơi đề cao đổi mới, tư duy chiến lược và sự phát triển nghề nghiệp bền vững.",
      "Join a modern consulting environment focused on innovation, strategic thinking and sustainable professional growth.",
    ),
    priority: 0.6,
  },
  "/contact": {
    title: T("Liên hệ FACS | Cùng kiến tạo giá trị bền vững", "Contact FACS | Let’s Build Together"),
    description: T(
      `Liên hệ FACS để được tư vấn các giải pháp chiến lược về tài chính, thuế, pháp lý và vận hành doanh nghiệp. Hotline ${COMPANY.hotline}.`,
      `Contact FACS for strategic financial, taxation, legal and enterprise consulting solutions. Hotline ${COMPANY.hotline}.`,
    ),
    priority: 0.8,
  },
  "/privacy": {
    title: T("Chính sách bảo mật | FACS", "Privacy Policy | FACS"),
    description: T("Chính sách bảo mật của FACS.", "FACS Privacy Policy."),
    priority: 0.2,
  },
  "/terms": {
    title: T("Điều khoản sử dụng | FACS", "Terms of Use | FACS"),
    description: T("Điều khoản sử dụng website FACS.", "FACS website terms of use."),
    priority: 0.2,
  },
};

const NOINDEX_PREFIXES = ["/admin", "/careers/apply", "/card"];

const OFFICE_ADDRESS = (office) => ({
  "@type": "PostalAddress",
  streetAddress: office.streetVi,
  addressLocality: office.localityVi,
  addressRegion: "Thành phố Hồ Chí Minh",
  addressCountry: "VN",
});

export function organizationLd() {
  const [head, branch] = COMPANY.offices;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: COMPANY.name,
    url: SITE_URL,
    logo: `${SITE_URL}/facs-mark.png`,
    image: DEFAULT_IMAGE,
    description: STATIC_PAGES["/"].description.vi,
    slogan: COMPANY.sloganVi,
    email: COMPANY.email,
    telephone: "+84972798424",
    priceRange: "$$",
    areaServed: { "@type": "Country", name: "Vietnam" },
    knowsLanguage: ["vi", "en"],
    address: OFFICE_ADDRESS(head),
    department: [
      {
        "@type": "ProfessionalService",
        name: `${COMPANY.name} – ${branch.labelVi}`,
        address: OFFICE_ADDRESS(branch),
        telephone: "+84972798424",
      },
    ],
    contactPoint: [
      { "@type": "ContactPoint", contactType: "customer service", telephone: "+84972798424", email: COMPANY.email, availableLanguage: ["Vietnamese", "English"], areaServed: "VN" },
    ],
    sameAs: [COMPANY.facebook, COMPANY.linkedin, COMPANY.instagram],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: COMPANY.name,
    inLanguage: ["vi", "en"],
    publisher: { "@id": ORG_ID },
  };
}

function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: `${SITE_URL}${item.path}` })),
  };
}

const crumbHome = (lang) => ({ name: lang === "en" ? "Home" : "Trang chủ", path: "/" });

/**
 * Thông tin SEO cho một đường dẫn.
 * @param {string} pathname
 * @param {"vi"|"en"} lang
 * @param {{services?:any[], industries?:any[], team?:any[], tools?:any[], posts?:any[], jobs?:any[]}} data
 * @returns {{title:string, description:string, canonical:string, image:string, type:string, noindex:boolean, jsonLd:object[]} | null}
 */
export function resolveSeo(pathname, lang = "vi", data = {}) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  const en = lang === "en";
  const base = { canonical: `${SITE_URL}${path === "/" ? "" : path}`, image: DEFAULT_IMAGE, type: "website", noindex: false, jsonLd: [] };

  if (NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return { ...base, title: "FACS", description: pickLang(STATIC_PAGES["/"].description, lang), noindex: true };
  }

  const page = STATIC_PAGES[path];
  if (page) {
    const jsonLd = path === "/" ? [organizationLd(), websiteLd()] : [breadcrumbLd([crumbHome(lang), { name: pickLang(page.title, lang).split(" | ")[0], path }])];
    return { ...base, title: pickLang(page.title, lang), description: pickLang(page.description, lang), jsonLd };
  }

  const [, section, slug] = path.split("/");

  if (section === "services" && slug) {
    const s = (data.services || []).find((x) => x.slug === slug);
    if (!s) return null;
    const name = en ? s.title : s.titleVi;
    const description = clip(en ? s.overview || s.desc : s.overviewVi || s.descVi, 200);
    return {
      ...base,
      title: en ? `${name} | FACS Services` : `${name} | Dịch vụ FACS`,
      description,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "Service", name, serviceType: name, description, provider: { "@id": ORG_ID }, areaServed: { "@type": "Country", name: "Vietnam" }, url: base.canonical },
        breadcrumbLd([crumbHome(lang), { name: en ? "Services" : "Dịch vụ", path: "/services" }, { name, path }]),
      ],
    };
  }

  if (section === "industries" && slug) {
    const s = (data.industries || []).find((x) => x.slug === slug);
    if (!s) return null;
    const name = en ? s.title : s.titleVi;
    return {
      ...base,
      title: en ? `${name} | FACS Industries` : `${name} | Lĩnh vực FACS`,
      description: clip(en ? s.desc : s.descVi, 200),
      jsonLd: [breadcrumbLd([crumbHome(lang), { name: en ? "Industries" : "Lĩnh vực", path: "/industries" }, { name, path }])],
    };
  }

  if (section === "tools" && slug) {
    const t = (data.tools || []).find((x) => x.slug === slug);
    if (!t) return null;
    const name = en ? t.en : t.vi;
    return {
      ...base,
      title: en ? `${name} | FACS Tools` : `${name} | Công cụ FACS`,
      description: clip(en ? t.descEn : t.descVi, 200),
      jsonLd: [
        { "@context": "https://schema.org", "@type": "WebApplication", name, applicationCategory: "FinanceApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "VND" }, provider: { "@id": ORG_ID }, url: base.canonical },
        breadcrumbLd([crumbHome(lang), { name: en ? "Tools" : "Công cụ", path: "/tools" }, { name, path }]),
      ],
    };
  }

  if (section === "about" && slug === "team") {
    const memberSlug = path.split("/")[3];
    const m = (data.team || []).find((x) => x.slug === memberSlug);
    if (!m) return null;
    const jobTitle = en ? m.title : m.titleVi;
    return {
      ...base,
      title: `${m.name} – ${jobTitle} | FACS`,
      description: en ? `${m.name}, ${jobTitle} at FACS.` : `${m.name}, ${jobTitle} tại FACS.`,
      image: `${SITE_URL}/card/${m.slug}.jpg`,
      type: "profile",
      jsonLd: [
        { "@context": "https://schema.org", "@type": "Person", name: m.name, jobTitle, worksFor: { "@id": ORG_ID }, image: `${SITE_URL}/card/${m.slug}.jpg`, url: base.canonical },
        breadcrumbLd([crumbHome(lang), { name: en ? "About" : "Giới thiệu", path: "/about" }, { name: m.name, path }]),
      ],
    };
  }

  if (section === "insights" && slug) {
    const post = (data.posts || []).find((p) => [p.slug, p.slug_vi, p.slug_en].includes(slug));
    if (!post) return null;
    const postLang = slug === post.slug_en && slug !== post.slug_vi ? "en" : slug === post.slug_vi ? "vi" : lang;
    const pe = postLang === "en";
    const title = (pe ? post.seo_title_en || post.title_en : post.seo_title_vi || post.title_vi) || post.title_vi || post.title_en || "FACS Insights";
    const description = clip(plain((pe ? post.seo_description_en || post.excerpt_en : post.seo_description_vi || post.excerpt_vi) || post.excerpt_vi || post.excerpt_en || ""), 200);
    const image = post.cover_image_url || DEFAULT_IMAGE;
    return {
      ...base,
      title: `${title} | FACS Insights`,
      description,
      image,
      type: "article",
      lang: postLang,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: clip(title, 110),
          description,
          image: [image],
          datePublished: post.published_at,
          dateModified: post.updated_at || post.published_at,
          inLanguage: postLang,
          author: post.author_name && post.author_name !== COMPANY.name ? { "@type": "Person", name: post.author_name } : { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          mainEntityOfPage: base.canonical,
        },
        breadcrumbLd([crumbHome(lang), { name: "Insights", path: "/insights" }, { name: clip(title, 80), path }]),
      ],
    };
  }

  if (section === "careers" && slug) {
    const job = (data.jobs || []).find((j) => j.slug === slug);
    if (!job) return null;
    const title = (en ? job.title_en : job.title_vi) || job.title_vi || job.title_en;
    const description = clip(plain((en ? job.summary_en : job.summary_vi) || job.summary_vi || ""), 200);
    const body = plain((en ? job.content_en : job.content_vi) || job.content_vi || job.summary_vi || "");
    const posting = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title,
      description: body || description,
      datePosted: job.published_at,
      employmentType: { "full-time": "FULL_TIME", "part-time": "PART_TIME", contract: "CONTRACTOR", internship: "INTERN" }[job.employment_type] || "FULL_TIME",
      hiringOrganization: { "@type": "Organization", name: COMPANY.name, sameAs: SITE_URL, logo: `${SITE_URL}/facs-mark.png` },
      jobLocation: { "@type": "Place", address: OFFICE_ADDRESS(COMPANY.offices[0]) },
      directApply: true,
      url: base.canonical,
    };
    if (job.application_deadline) posting.validThrough = `${job.application_deadline}T23:59:59+07:00`;
    return {
      ...base,
      title: en ? `${title} | FACS Careers` : `${title} | Tuyển dụng FACS`,
      description,
      jsonLd: [posting, breadcrumbLd([crumbHome(lang), { name: en ? "Careers" : "Tuyển dụng", path: "/careers" }, { name: title, path }])],
    };
  }

  return null;
}

/** Danh sách đường dẫn cho sitemap.xml (kèm ngày cập nhật nếu có). */
export function sitemapEntries(data = {}) {
  const entries = Object.entries(STATIC_PAGES).map(([path, page]) => ({ path, priority: page.priority }));
  for (const s of data.services || []) entries.push({ path: `/services/${s.slug}`, priority: 0.8 });
  for (const s of data.industries || []) entries.push({ path: `/industries/${s.slug}`, priority: 0.6 });
  for (const t of data.tools || []) entries.push({ path: `/tools/${t.slug}`, priority: 0.7 });
  for (const m of data.team || []) entries.push({ path: `/about/team/${m.slug}`, priority: 0.5 });
  for (const j of data.jobs || []) entries.push({ path: `/careers/${j.slug}`, priority: 0.5, lastmod: j.updated_at || j.published_at });
  for (const p of data.posts || []) {
    for (const slug of new Set([p.slug_vi, p.slug_en, p.slug].filter(Boolean))) {
      entries.push({ path: `/insights/${slug}`, priority: 0.7, lastmod: p.updated_at || p.published_at });
    }
  }
  return entries;
}
