import { createContext, useContext } from "react";

// Hộp xác nhận thống nhất cho CMS, thay hộp thoại mặc định của trình duyệt.
export const ConfirmContext = createContext(null);

/** Trả về hàm `askConfirm(message | {title, message, confirmText, danger})` → Promise<boolean>. */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  return ctx || ((opts) => Promise.resolve(window.confirm(typeof opts === "string" ? opts : opts?.message || opts?.title || "")));
}
