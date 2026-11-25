import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { getServiceContent, services } from "../data/services";
import { industries } from "../data/industries";
import HeaderWave from "./admin/HeaderWave";
import SiteSearch from "./site/SiteSearch";
import { setSiteTheme, useSiteTheme } from "./site/siteTheme";
import { siteNavItems, siteResourceItems } from "./site/siteLinks";

const linkBase = "relative rounded-full px-1 py-2 transition-all duration-300 whitespace-nowrap after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-cyan-200 after:to-blue-400 after:transition-all after:duration-300 hover:text-white hover:after:w-full";
const dropdownClass = "site-scroll pointer-events-none absolute left-1/2 top-full z-50 mt-4 max-h-[calc(100vh-7rem)] w-[420px] -translate-x-1/2 translate-y-2 overflow-y-auto rounded-3xl border border-cyan-200/15 bg-[#0d1726]/96 p-3 opacity-0 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";

function LogoWordmark({ compact = false }) {
  return (
    <span className={`relative z-10 select-none font-serif font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_0_28px_rgba(34,211,238,0.22)] transition-all duration-500 group-hover:scale-[1.03] ${compact ? "text-[26px]" : "text-[28px] lg:text-[30px]"}`}>
      FACS<span className="text-facs-logo">.</span>
    </span>
  );
}

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isVi = language === "vi";

  const navItems = siteNavItems(isVi);
  const [searchOpen, setSearchOpen] = useState(false);
  const theme = useSiteTheme();
  const themeLabel = theme === "light" ? (isVi ? "Chuyển sang chế độ tối" : "Switch to dark mode") : (isVi ? "Chuyển sang chế độ sáng" : "Switch to light mode");
  const toggleTheme = () => setSiteTheme(theme === "light" ? "dark" : "light");
  const [openSection, setOpenSection] = useState(null);

  // Ctrl/⌘ + K mở ô Tìm nhanh.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    const onOpen = () => setSearchOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("facs:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("facs:open-search", onOpen);
    };
  }, []);

  // Khoá cuộn trang khi menu điện thoại đang mở; phím Esc để đóng.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);


  const isActive = (to) => location.pathname === to || (to !== "/" && location.pathname.startsWith(`${to}/`));

  const renderDropdownItem = ({ to, title, desc, Icon }) => (
    <Link
      key={to}
      to={to}
      className="group/item flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-cyan-400/10 hover:text-white"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 transition-all duration-300 group-hover/item:bg-cyan-300/20 group-hover/item:scale-105">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block leading-snug">{title}</span>
        {desc && <span className="mt-1 block line-clamp-2 text-xs font-normal leading-relaxed text-slate-500 group-hover/item:text-slate-400">{desc}</span>}
      </span>
    </Link>
  );

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: "easeOut" }}
      className="sticky top-0 z-50 bg-[#0d1726]/86 shadow-[0_18px_70px_rgba(0,0,0,0.30)] backdrop-blur-2xl"
    >
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent blur-xl" />
      <HeaderWave colors={["#67E8F9", "#3B82F6"]} />
      <div className="container mx-auto px-5 lg:px-12">
        <div className="flex h-20 items-center justify-between gap-5">
          <Link to="/" className="group relative flex items-center rounded-2xl py-2 pr-3" onClick={() => setMobileOpen(false)}>
            <span className="absolute -inset-4 rounded-full bg-cyan-300/18 opacity-80 blur-2xl transition-all duration-500 group-hover:bg-cyan-300/28" />
            <LogoWordmark />
          </Link>
          <nav className="hidden flex-1 items-center justify-center gap-2 text-[14px] font-bold tracking-[0.01em] text-slate-200 lg:flex xl:gap-5 xl:text-[15px]">
            {navItems.map(([to, label, type]) => {
              if (type === "services") {
                return (
                  <div key={to} className="group relative">
                    <NavLink to={to} className={`${linkBase} flex items-center gap-1.5 ${isActive(to) ? "text-white after:w-full" : ""}`}>
                      {label}<ChevronDown size={15} className="opacity-70" />
                    </NavLink>
                    <div className={dropdownClass}>
                      <div className="absolute -top-4 left-0 right-0 h-4" />
                      <div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">{isVi ? `${services.length} nhóm dịch vụ` : `${services.length} Service Pillars`}</div>
                      {services.map((service) => renderDropdownItem({
                        to: `/services/${service.slug}`,
                        title: getServiceContent(service, isVi).title,
                        desc: getServiceContent(service, isVi).desc,
                        Icon: service.icon,
                      }))}
                    </div>
                  </div>
                );
              }

              if (type === "industries") {
                return (
                  <div key={to} className="group relative">
                    <NavLink to={to} className={`${linkBase} flex items-center gap-1.5 ${isActive(to) ? "text-white after:w-full" : ""}`}>
                      {label}<ChevronDown size={15} className="opacity-70" />
                    </NavLink>
                    <div className={dropdownClass}>
                      <div className="absolute -top-4 left-0 right-0 h-4" />
                      <div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">{isVi ? "8 lĩnh vực chuyên sâu" : "8 Industry Focuses"}</div>
                      {industries.map((industry) => renderDropdownItem({
                        to: `/industries/${industry.slug}`,
                        title: isVi ? industry.titleVi : industry.title,
                        desc: isVi ? industry.descVi : industry.desc,
                        Icon: industry.icon,
                      }))}
                    </div>
                  </div>
                );
              }

              if (type === "resources") {
                return (
                  <div key={to} className="group relative">
                    <NavLink to={to} className={`${linkBase} flex items-center gap-1.5 ${isActive(to) ? "text-white after:w-full" : ""}`}>
                      {label}<ChevronDown size={15} className="opacity-70" />
                    </NavLink>
                    <div className={`${dropdownClass} w-[360px]`}>
                      <div className="absolute -top-4 left-0 right-0 h-4" />
                      <div className="px-4 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">
                        {isVi ? "Tiện ích tuân thủ" : "Compliance resources"}
                      </div>
                      {siteResourceItems(isVi).map(([itemTo, title, desc, Icon]) => renderDropdownItem({ to: itemTo, title, desc, Icon }))}
                    </div>
                  </div>
                );
              }

              return (
                <NavLink key={to} to={to} className={`${linkBase} ${isActive(to) ? "text-white after:w-full" : ""}`}>
                  {label}
                </NavLink>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="site-ripple group inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:text-white"
              aria-label={isVi ? "Tìm kiếm" : "Search"}
              title={isVi ? "Tìm kiếm" : "Search"}
            >
              <Search size={19} className="transition-transform duration-300 group-hover:scale-110" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="site-ripple group inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:text-white xl:hidden"
              aria-label={themeLabel}
              title={themeLabel}
            >
              {theme === "light" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link
              to="/contact"
              className="site-cta whitespace-nowrap rounded-2xl border border-cyan-200/30 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-cyan-100 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:text-[#06111f] hover:shadow-[0_18px_42px_rgba(6,182,212,0.30)] xl:px-5 xl:text-base"
            >
              {isVi ? "Kết nối cùng FACS" : "Let's Connect"}
            </Link>

            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.035] p-1 text-xs font-semibold text-slate-300 shadow-[0_12px_36px_rgba(0,0,0,0.20)]">
              <button type="button" onClick={() => setLanguage("en")} className={`rounded-xl px-3 py-2 transition-all duration-300 ${language === "en" ? "bg-cyan-400/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]" : "hover:bg-white/[0.08] hover:text-white"}`}>EN</button>
              <button type="button" onClick={() => setLanguage("vi")} className={`rounded-xl px-3 py-2 transition-all duration-300 ${language === "vi" ? "bg-cyan-400/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]" : "hover:bg-white/[0.08] hover:text-white"}`}>VI</button>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
          <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.045] text-cyan-100" aria-label={isVi ? "Tìm kiếm" : "Search"}>
            <Search size={20} />
          </button>
          <button type="button" onClick={toggleTheme} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.045] text-cyan-100" aria-label={themeLabel}>
            {theme === "light" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="relative z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.045] text-cyan-100 transition-all duration-300 hover:bg-cyan-400/12 md:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          </div>
        </div>

      </div>
      <SiteSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <motion.div className="fixed inset-0 z-[150] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" className="absolute inset-0 bg-[#030913]/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label={isVi ? "Đóng menu" : "Close menu"} />
              <motion.nav
                className="absolute inset-y-0 right-0 flex w-[88vw] max-w-[380px] flex-col border-l border-cyan-200/15 bg-[#0d1726] shadow-[-30px_0_80px_rgba(0,0,0,0.5)]"
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 360, damping: 38 }}
                aria-label={isVi ? "Menu chính" : "Main menu"}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <Link to="/" onClick={() => setMobileOpen(false)}><LogoWordmark compact /></Link>
                  <button type="button" onClick={() => setMobileOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300" aria-label={isVi ? "Đóng menu" : "Close menu"}>
                    <X size={20} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                  {navItems.map(([to, label, type], i) => {
                    const children =
                      type === "services" ? services.map((sv) => [`/services/${sv.slug}`, getServiceContent(sv, isVi).title])
                      : type === "industries" ? industries.map((ind) => [`/industries/${ind.slug}`, isVi ? ind.titleVi : ind.title])
                      : type === "resources" ? siteResourceItems(isVi).map(([itemTo, title]) => [itemTo, title])
                      : null;
                    const expanded = openSection === to;
                    return (
                      <motion.div key={to} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i + 0.08 }}>
                        <div className="flex items-center">
                          <Link to={to} onClick={() => setMobileOpen(false)} className={`flex-1 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition ${isActive(to) ? "bg-cyan-400/10 text-white shadow-[inset_3px_0_0_#22D3EE]" : "text-slate-200 hover:bg-white/[0.05]"}`}>
                            {label}
                          </Link>
                          {children && (
                            <button type="button" onClick={() => setOpenSection(expanded ? null : to)} className="ml-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/[0.05]" aria-expanded={expanded} aria-label={label}>
                              <ChevronDown size={18} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {children && expanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="ml-4 grid gap-0.5 border-l border-cyan-200/15 py-1 pl-3">
                                {children.map(([childTo, childLabel]) => (
                                  <Link key={childTo} to={childTo} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.05] hover:text-white">{childLabel}</Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="space-y-3 border-t border-white/10 p-4">
                  <Link to="/contact" onClick={() => setMobileOpen(false)} className="site-cta flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-semibold">
                    {isVi ? "Kết nối cùng FACS" : "Let's Connect"} <ArrowRight size={17} />
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setLanguage("en")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${language === "en" ? "bg-cyan-400/18 text-cyan-100" : "bg-white/[0.035] text-slate-300"}`}>EN</button>
                    <button type="button" onClick={() => setLanguage("vi")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${language === "vi" ? "bg-cyan-400/18 text-cyan-100" : "bg-white/[0.035] text-slate-300"}`}>VI</button>
                  </div>
                </div>
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.header>
  );
}
