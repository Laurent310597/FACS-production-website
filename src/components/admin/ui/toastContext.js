import { createContext, useCallback, useContext, useEffect, useRef } from "react";

// Thông báo dạng toast cho CMS. Provider nằm trong AdminLayout nên mọi trang quản trị đều dùng được.
export const ToastContext = createContext(null);

const noop = () => {};
const fallback = { success: noop, error: noop, info: noop, dismiss: noop };

export function useToast() {
  return useContext(ToastContext) || fallback;
}

/**
 * Thay cho `const [notice, setNotice] = useState("")`: trả về hàm nhận chuỗi; chuỗi rỗng bị bỏ qua (vốn dùng để xoá banner),
 * chuỗi có nội dung hiện thành toast. Có thể truyền `initial` (vd. thông báo từ đường dẫn sau khi kết nối tài khoản).
 */
export function useToastSetter(kind = "success", initial = "") {
  const toast = useToast();
  const shownInitial = useRef(false);
  useEffect(() => {
    if (initial && !shownInitial.current) {
      shownInitial.current = true;
      toast[kind](initial);
    }
  }, [initial, kind, toast]);
  return useCallback((message) => {
    const text = typeof message === "function" ? "" : String(message || "").trim();
    if (text) toast[kind](text);
  }, [kind, toast]);
}
