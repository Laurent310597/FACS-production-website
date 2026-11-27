import { motion } from "framer-motion";
import { Briefcase, CalendarRange, Factory, Home, Info, Mail, Moon, Newspaper, Search, Sun, Users, Wrench } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../LanguageContext";
import { openSiteSearch, setSiteTheme, useSiteTheme } from "./siteTheme";

const ICONS = { "/": Home, "/about": Info, "/services": Briefcase, "/industries": Factory, "/insights": Newspaper, "/legal-calendar": CalendarRange, "/tools": Wrench, "/careers": Users, "/contact": Mail };

function railItems(isVi) {
  return [
    ["/", isVi ? "Trang chủ" : "Home"],
    ["/about", isVi ? "Giới thiệu" : "About"],
    ["/services", isVi ? "Dịch vụ" : "Services"],
    ["/industries", isVi ? "Lĩnh vực" : "Industries"],
    ["/insights", isVi ? "Góc nhìn" : "Insights"],
    ["/legal-calendar", isVi ? "Lịch pháp lý" : "Legal Calendar"],
    ["/tools", isVi ? "Tiện ích" : "Tools"],
    ["/careers", isVi ? "Tuyển dụng" : "Careers"],
    ["/contact", isVi ? "Liên hệ" : "Contact"],
  ];
}

const isActive = (pathname, to) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));

/**
 * Thanh điều khiển bên trái (màn hình ≥ 1280px): điều hướng nhanh tới các trang, Tìm nhanh và chuyển Sáng/Tối.
 * Thu gọn còn biểu tượng; rê chuột hoặc dùng bàn phím (Tab) thì mở rộng hiện tên trang.
 */
export default function SiteRail() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  const theme = useSiteTheme();
  const isVi = language === "vi";
  // CMS và trang thẻ danh thiếp số (/card) không có thanh điều khiển.
  if (pathname.startsWith("/admin") || pathname.startsWith("/card/")) return null;
  const light = theme === "light";

  return (
    <aside className="site-rail" aria-label={isVi ? "Bảng điều khiển" : "Control panel"}>
      <div className="site-rail__panel">
        <nav className="site-rail__nav">
          {railItems(isVi).map(([to, label]) => {
            const Icon = ICONS[to];
            const active = isActive(pathname, to);
            return (
              <Link key={to} to={to} className={`site-rail__item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} aria-label={label}>
                {active && <motion.span layoutId="site-rail-active" className="site-rail__pill" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <span className="site-rail__icon"><Icon size={19} strokeWidth={1.9} /></span>
                <span className="site-rail__label">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="site-rail__sep" />

        <button type="button" className="site-rail__item" onClick={openSiteSearch} aria-label={isVi ? "Tìm kiếm" : "Search"}>
          <span className="site-rail__icon"><Search size={19} strokeWidth={1.9} /></span>
          <span className="site-rail__label">{isVi ? "Tìm kiếm" : "Search"}</span>
        </button>

        <button
          type="button"
          className="site-rail__item site-rail__theme"
          onClick={() => setSiteTheme(light ? "dark" : "light")}
          aria-label={light ? (isVi ? "Chuyển sang chế độ tối" : "Switch to dark mode") : (isVi ? "Chuyển sang chế độ sáng" : "Switch to light mode")}
          aria-pressed={!light}
        >
          <span className="site-rail__icon">{light ? <Sun size={19} strokeWidth={1.9} /> : <Moon size={19} strokeWidth={1.9} />}</span>
          <span className="site-rail__label site-rail__switch">
            <span>{isVi ? "Sáng" : "Light"}</span>
            <span className={`site-rail__track${light ? "" : " is-dark"}`}><span className="site-rail__knob" /></span>
            <span>{isVi ? "Tối" : "Dark"}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
