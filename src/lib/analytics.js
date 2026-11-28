// Đo lường website FACS.
// 1) Đo lường riêng của FACS (Supabase, bảng site_events): lượt xem trang, nguồn truy cập, lượt bấm Gọi/Zalo/Email, gửi biểu mẫu.
//    Không lưu IP, không cookie, không định danh lâu dài: chỉ một mã phiên ngẫu nhiên trong sessionStorage (mất khi đóng tab).
// 2) Google Analytics 4: chỉ bật khi có biến môi trường VITE_GA_MEASUREMENT_ID (ví dụ G-XXXXXXX).
// Trình duyệt của quản trị viên (đã đăng nhập CMS) tự loại khỏi số liệu.
import { supabase } from "./supabaseClient";

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";
const SKIP_KEY = "facs-no-track";
const SESSION_KEY = "facs-sid";
const ATTR_KEY = "facs-attr";
const OWN_HOSTS = /(^|\.)facs\.vn$|vercel\.app$|^localhost$/;

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

function enabled() {
  if (typeof window === "undefined" || navigator.webdriver) return false;
  return safe(() => localStorage.getItem(SKIP_KEY) !== "1", true);
}

function sessionId() {
  return safe(() => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = window.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }, "nostorage-session");
}

/** Nguồn truy cập của phiên: lấy một lần ở trang đầu tiên (UTM hoặc trang giới thiệu bên ngoài). */
function attribution() {
  return safe(() => {
    const saved = sessionStorage.getItem(ATTR_KEY);
    if (saved) return JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    let referrer = "";
    if (document.referrer) {
      const host = safe(() => new URL(document.referrer).hostname.replace(/^www\./, ""), "");
      if (host && !OWN_HOSTS.test(host)) referrer = host;
    }
    const attr = {
      utm_source: params.get("utm_source") || params.get("src") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      referrer,
    };
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
    return attr;
  }, {});
}

const device = () => {
  const w = window.innerWidth || 1280;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
};
const language = () => (safe(() => localStorage.getItem("facs-language"), "en") === "vi" ? "vi" : "en");

/** Ghi một sự kiện. Không bao giờ làm gián đoạn trang nếu lỗi. */
export function track(event, { path, label } = {}) {
  if (!enabled()) return;
  const p = path || window.location.pathname;
  if (p.startsWith("/admin")) return;
  if (supabase) {
    const payload = { session_id: sessionId(), event, path: p, label: label || "", lang: language(), device: device(), ...attribution() };
    supabase.rpc("track_site_event", { p: payload }).then(
      () => {},
      () => {},
    );
  }
  if (GA_ID && typeof window.gtag === "function") {
    if (event === "page_view") window.gtag("event", "page_view", { page_path: p, page_location: window.location.href, page_title: document.title });
    else window.gtag("event", event, { page_path: p, event_label: label || undefined });
  }
}

let lastPath = "";
export function trackPageView(path) {
  if (path === lastPath) return;
  lastPath = path;
  // Đợi tiêu đề trang cập nhật xong rồi mới gửi.
  window.setTimeout(() => track("page_view", { path }), 50);
}

/** Không tính lượt truy cập của trình duyệt này (gọi khi quản trị viên đăng nhập CMS). */
export function excludeThisBrowser() {
  safe(() => localStorage.setItem(SKIP_KEY, "1"));
}

function loadGoogleAnalytics() {
  if (!GA_ID || document.getElementById("ga4-src")) return;
  const s = document.createElement("script");
  s.id = "ga4-src";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // gtag yêu cầu đẩy đúng đối tượng arguments
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false, anonymize_ip: true });
}

// Bấm liên kết Gọi / Zalo / Email / mạng xã hội / lưu danh bạ ở bất kỳ đâu trên website.
function classify(href) {
  if (/^tel:/i.test(href)) return "click_call";
  if (/^mailto:/i.test(href)) return "click_email";
  if (/zalo\.me\//i.test(href)) return "click_zalo";
  if (/card-vcf|contact(-en)?\.vcf/i.test(href)) return "card_save_contact";
  if (/facebook\.com|linkedin\.com|instagram\.com/i.test(href)) return "click_social";
  return "";
}

function onClick(e) {
  const a = e.target?.closest?.("a[href]");
  if (!a) return;
  const event = classify(a.getAttribute("href") || "");
  if (!event) return;
  const area = a.closest("[data-track-area]")?.getAttribute("data-track-area");
  track(event, { label: a.getAttribute("data-track-label") || area || "page" });
}

let started = false;
export function initAnalytics() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!enabled()) return;
  loadGoogleAnalytics();
  document.addEventListener("click", onClick, { capture: true, passive: true });
}
