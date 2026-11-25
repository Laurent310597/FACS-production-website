import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// BẢN THỬ tông sáng: chỉ bật trên các trang dưới đây (thêm ?theme=dark để xem lại tông tối và so sánh).
const LIGHT_TRIAL_PATHS = ["/", "/admin/posts", "/admin/legal-dashboard"];

export function LightTrial() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const on = LIGHT_TRIAL_PATHS.includes(pathname) && !new URLSearchParams(search).has("theme", "dark");
    document.documentElement.classList.toggle("theme-light", on);
  }, [pathname, search]);
  return null;
}
