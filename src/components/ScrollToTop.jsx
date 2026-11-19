import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Cuộn tới mục (#hash) một cách mượt. Việc đưa trang mới về đầu được làm ngay khi trang cũ đã mờ đi xong
 * (xem AnimatedRoutes → onExitComplete), nên người xem không thấy trang cũ bị cuộn ngược lên.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return undefined;
    const timer = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 420);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}
