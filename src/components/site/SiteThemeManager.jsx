import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteTheme } from "./siteTheme";

/** Gắn lớp giao diện lên <html>: tông sáng cho website (trừ CMS) và chỗ trống cho thanh điều khiển bên trái. */
export default function SiteThemeManager() {
  const { pathname } = useLocation();
  const theme = useSiteTheme();
  useEffect(() => {
    const site = !pathname.startsWith("/admin");
    const root = document.documentElement;
    root.classList.toggle("theme-light", site && theme === "light");
    root.classList.toggle("has-site-rail", site);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", site && theme === "light" ? "#f4f8ff" : "#0d1726");
  }, [pathname, theme]);
  return null;
}
