import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Banknote, Calculator, CalendarRange, ChevronDown, Coins, Landmark, Menu, PiggyBank, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { getServiceContent, services } from "../data/services";
import { industries } from "../data/industries";

const linkBase = "relative rounded-full px-1 py-2 transition-all duration-300 whitespace-nowrap after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-gradient-to-r after:from-cyan-200 after:to-blue-400 after:transition-all after:duration-300 hover:text-white hover:after:w-full";
const dropdownClass = "pointer-events-none absolute left-1/2 top-full z-50 mt-4 max-h-[calc(100vh-7rem)] w-[420px] -translate-x-1/2 translate-y-2 overflow-y-auto rounded-3xl border border-cyan-200/15 bg-[#0d1726]/96 p-3 opacity-0 shadow-[0_26px_90px_rgba(0,0,0,0.48)] backdrop-blur-2xl transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100";

function LogoWordmark({ compact = false }) {
  return (
    <span className={`relative z-10 select-none font-serif font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_0_28px_rgba(34,211,238,0.22)] transition-all duration-500 group-hover:scale-[1.03] ${compact ? "text-[26px]" : "text-[28px] lg:text-[30px]"}`}>
      FACS<span className="text-cyan-300">.</span>
    </span>
  );
}

export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isVi = language === "vi";

  const navItems = [
    ["/about", isVi ? "Giới thiệu" : "About"],
    ["/services", isVi ? "Dịch vụ" : "Services", "services"],
    ["/industries", isVi ? "Lĩnh vực" : "Industries", "industries"],
    ["/insights", isVi ? "Góc nhìn" : "Insights"],
    ["/tools", isVi ? "Tiện ích" : "Resources", "resources"],
    ["/careers", isVi ? "Tuyển dụng" : "Careers"],
    ["/contact", isVi ? "Liên hệ" : "Contact"],
  ];

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
      className="sticky top-0 z-50 border-b border-cyan-200/20 bg-[#0d1726]/86 shadow-[0_18px_70px_rgba(0,0,0,0.30)] backdrop-blur-2xl"
    >
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-r from-transparent via-cyan-400/14 to-transparent blur-xl" />
      <div className="container mx-auto px-5 lg:px-12">
        <div className="flex h-20 items-center justify-between gap-5">
          <Link to="/" className="group relative flex items-center rounded-2xl py-2 pr-3" onClick={() => setMobileOpen(false)}>
            <span className="absolute -inset-4 rounded-full bg-cyan-300/18 opacity-80 blur-2xl transition-all duration-500 group-hover:bg-cyan-300/28" />
            <LogoWordmark />
          </Link>

          <div className="hidden min-w-[178px] border-l border-cyan-200/18 pl-5 2xl:block">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.2, ease: "easeOut" }}
              className="relative overflow-hidden rounded-2xl px-1 py-1"
            >
              <div className="text-[12px] md:text-[20px] font-semibold italic leading-[1.45] tracking-[0.04em] text-cyan-50/95 drop-shadow-[0_0_12px_rgba(103,232,249,0.25)]">
  <span className="bg-gradient-to-r from-blue via-cyan-200 to-slate-300 bg-[length:220%_100%] bg-clip-text text-transparent animate-[facsSloganShine_5.5s_ease-in-out_infinite]">
    Your Growth Starts
    <br />
    With Us
  </span>
</div>
              <span className="absolute bottom-0 left-1 h-px w-16 bg-gradient-to-r from-cyan-300/80 to-transparent" />
            </motion.div>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-3 text-[14px] font-bold tracking-[0.01em] text-slate-200 xl:flex 2xl:gap-5 2xl:text-[15px]">
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
                      {renderDropdownItem({
                        to: "/legal-calendar",
                        title: isVi ? "Lịch pháp lý doanh nghiệp" : "Corporate Legal Calendar",
                        desc: isVi
                          ? "Theo dõi các mốc thuế, kế toán, lao động, bảo hiểm và HSE."
                          : "Track tax, accounting, labour, insurance and HSE deadlines.",
                        Icon: CalendarRange,
                      })}
                      {renderDropdownItem({
                        to: "/legal-ai",
                        title: isVi ? "AI Tư vấn FACS" : "FACS Advisory AI",
                        desc: isVi
                          ? "Tham khảo sơ bộ về pháp lý, thuế, kế toán và tuân thủ từ nguồn do FACS kiểm soát."
                          : "Preliminary legal, tax, accounting and compliance guidance from FACS-controlled sources.",
                        Icon: Sparkles,
                      })}
                      {[
                        ["/tools/gross-net", isVi ? "Tính lương Gross – Net" : "Gross – Net Salary", isVi ? "Ước tính lương thực nhận, bảo hiểm và thuế TNCN." : "Estimate take-home pay, insurance and PIT.", Banknote],
                        ["/tools/personal-income-tax", isVi ? "Tính thuế TNCN" : "Personal Income Tax", isVi ? "Tính thuế tiền lương theo biểu lũy tiến 5 bậc." : "Calculate salary tax using the five-band schedule.", Calculator],
                        ["/tools/unemployment-benefit", isVi ? "Tính BHTN" : "Unemployment Benefit", isVi ? "Ước tính mức hưởng và thời gian hưởng trợ cấp." : "Estimate benefit amount and entitlement duration.", ShieldCheck],
                        ["/tools/one-time-social-insurance", isVi ? "Tính BHXH một lần" : "One-time Social Insurance", isVi ? "Ước tính quyền lợi theo quá trình đóng BHXH." : "Estimate benefits from contribution history.", Landmark],
                        ["/tools/savings-plan", isVi ? "Kế hoạch tiết kiệm" : "Savings Planner", isVi ? "Mô phỏng lãi kép và khoản tiết kiệm định kỳ." : "Model compound growth and recurring savings.", PiggyBank],
                        ["/tools/rates-and-gold", isVi ? "Thị trường tài chính" : "Financial Markets", isVi ? "Theo dõi tỷ giá, vàng và các chỉ số chứng khoán." : "Monitor FX, gold and securities market indices.", Coins],
                      ].map(([itemTo, title, desc, Icon]) => renderDropdownItem({ to: itemTo, title, desc, Icon }))}
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
            <NavLink
              to="/legal-ai"
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-2xl border border-violet-300/25 bg-violet-300/[0.07] px-4 py-3 text-sm font-semibold text-violet-100 transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/40 hover:bg-violet-300/[0.13] hover:shadow-[0_18px_42px_rgba(139,92,246,0.18)] ${isActive("/legal-ai") ? "border-violet-300/45 bg-violet-300/[0.15] text-white" : ""}`}
            >
              <Sparkles size={15} />
              {isVi ? "AI Tư vấn FACS" : "FACS Advisory AI"}
            </NavLink>

            <Link
              to="/contact"
              className="whitespace-nowrap rounded-2xl border border-cyan-200/30 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-cyan-100 transition-all duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:text-[#06111f] hover:shadow-[0_18px_42px_rgba(6,182,212,0.30)] xl:px-5 xl:text-base"
            >
              {isVi ? "Kết nối cùng FACS" : "Let's Connect"}
            </Link>

            <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.035] p-1 text-xs font-semibold text-slate-300 shadow-[0_12px_36px_rgba(0,0,0,0.20)]">
              <button type="button" onClick={() => setLanguage("en")} className={`rounded-xl px-3 py-2 transition-all duration-300 ${language === "en" ? "bg-cyan-400/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]" : "hover:bg-white/[0.08] hover:text-white"}`}>EN</button>
              <button type="button" onClick={() => setLanguage("vi")} className={`rounded-xl px-3 py-2 transition-all duration-300 ${language === "vi" ? "bg-cyan-400/18 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]" : "hover:bg-white/[0.08] hover:text-white"}`}>VI</button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="relative z-20 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/20 bg-white/[0.045] text-cyan-100 transition-all duration-300 hover:bg-cyan-400/12 xl:hidden"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="pb-5 xl:hidden">
            <div className="rounded-3xl border border-cyan-200/15 bg-[#0d1726]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              <Link
                to="/legal-ai"
                onClick={() => setMobileOpen(false)}
                className="mb-2 flex items-center gap-2 rounded-2xl border border-violet-300/20 bg-violet-300/[0.07] px-4 py-3 font-semibold text-violet-100 hover:bg-violet-300/[0.13] hover:text-white"
              >
                <Sparkles size={16} />{isVi ? "AI Tư vấn FACS" : "FACS Advisory AI"}
              </Link>
              <div className="grid gap-1">
                {navItems.map(([to, label]) => (
                  <Link key={to} to={to} onClick={() => setMobileOpen(false)} className="rounded-2xl px-4 py-3 font-semibold text-slate-200 hover:bg-cyan-400/10 hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setLanguage("en")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${language === "en" ? "bg-cyan-400/18 text-cyan-100" : "bg-white/[0.035] text-slate-300"}`}>EN</button>
                <button type="button" onClick={() => setLanguage("vi")} className={`rounded-2xl px-4 py-3 text-sm font-bold ${language === "vi" ? "bg-cyan-400/18 text-cyan-100" : "bg-white/[0.035] text-slate-300"}`}>VI</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.header>
  );
}
