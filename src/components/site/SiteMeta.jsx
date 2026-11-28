// Cập nhật tiêu đề, mô tả, canonical, ảnh chia sẻ và dữ liệu có cấu trúc khi chuyển trang; ghi nhận lượt xem trang.
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../LanguageContext";
import { initAnalytics, trackPageView } from "../../lib/analytics";
import { resolveSeo, SITE_URL, DEFAULT_IMAGE } from "../../seo/siteSeo";
import { services } from "../../data/services";
import { industries } from "../../data/industries";
import { leadership } from "../../data/team";
import { toolMeta } from "../../data/tools";

const DATA = { services, industries, team: leadership, tools: toolMeta };
// Trang có dữ liệu tải sau (bài viết, tin tuyển dụng): trang đó tự đặt tiêu đề, ở đây chỉ cập nhật canonical.
const DYNAMIC = /^\/(insights|careers)\/[^/]+$/;

function upsert(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}
const setMeta = (attr, key, value) => {
  const el = upsert(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement("meta");
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute("content", value);
};
const setCanonical = (href) => {
  upsert('link[rel="canonical"]', () => {
    const l = document.createElement("link");
    l.setAttribute("rel", "canonical");
    return l;
  }).setAttribute("href", href);
  setMeta("property", "og:url", href);
};

export default function SiteMeta() {
  const { pathname } = useLocation();
  const { language } = useLanguage();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/card/")) return; // trang thẻ danh thiếp tự quản lý thẻ <head>
    if (pathname.startsWith("/admin")) {
      setMeta("name", "robots", "noindex, nofollow");
      return;
    }
    const lang = language === "vi" ? "vi" : "en";
    const path = pathname.replace(/\/+$/, "") || "/";
    const seo = resolveSeo(path, lang, DATA);

    if (!seo) {
      setCanonical(`${SITE_URL}${path === "/" ? "" : path}`);
      setMeta("name", "robots", DYNAMIC.test(path) ? "index, follow" : "noindex, follow");
      return;
    }

    document.title = seo.title;
    setMeta("name", "description", seo.description);
    setMeta("name", "robots", seo.noindex ? "noindex, nofollow" : "index, follow");
    setCanonical(seo.canonical);
    setMeta("property", "og:title", seo.title);
    setMeta("property", "og:description", seo.description);
    setMeta("property", "og:type", seo.type);
    setMeta("property", "og:image", seo.image || DEFAULT_IMAGE);
    setMeta("property", "og:locale", lang === "vi" ? "vi_VN" : "en_US");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.title);
    setMeta("name", "twitter:description", seo.description);
    setMeta("name", "twitter:image", seo.image || DEFAULT_IMAGE);
    const ld = upsert("script#seo-jsonld", () => {
      const s = document.createElement("script");
      s.id = "seo-jsonld";
      s.type = "application/ld+json";
      return s;
    });
    ld.textContent = seo.jsonLd.length ? JSON.stringify(seo.jsonLd.length === 1 ? seo.jsonLd[0] : seo.jsonLd) : "";
  }, [pathname, language]);

  return null;
}
