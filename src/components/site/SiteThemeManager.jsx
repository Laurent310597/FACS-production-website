import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteTheme } from "./siteTheme";

/** Gắn lớp giao diện lên <html>: tông Sáng/Tối dùng chung cho website và CMS; chỗ trống cho thanh điều khiển bên trái chỉ ở website. */
export default function SiteThemeManager() {
  const { pathname } = useLocation();
  const theme = useSiteTheme();
  useEffect(() => {
    const site = !pathname.startsWith("/admin");
    const root = document.documentElement;
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("has-site-rail", site);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f4f8ff" : site ? "#0d1726" : "#05070D");
  }, [pathname, theme]);
  return null;
}
