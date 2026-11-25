import { useSyncExternalStore } from "react";

// Chế độ Sáng/Tối của website (mặc định Sáng), lưu trên trình duyệt. CMS không dùng bộ chuyển này.
const KEY = "facs-theme";
const listeners = new Set();

function readTheme() {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

let current = readTheme();

function apply(next) {
  current = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Trình duyệt chặn lưu trữ: vẫn đổi trong phiên hiện tại.
  }
  listeners.forEach((listener) => listener());
}

/** Đổi chế độ, có hiệu ứng chuyển cảnh mềm khi trình duyệt hỗ trợ View Transitions. */
export function setSiteTheme(next) {
  if (next === current) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !reduce) document.startViewTransition(() => apply(next));
  else apply(next);
}

export function useSiteTheme() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => "light",
  );
}

/** Mở ô Tìm nhanh từ bất kỳ đâu (thanh điều khiển bên trái, phím tắt…). */
export function openSiteSearch() {
  window.dispatchEvent(new CustomEvent("facs:open-search"));
}
