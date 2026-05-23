import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { services } from "../data/services";
import { industries } from "../data/industries";
import { useLanguage } from "./LanguageContext";
import facsLogoFull from "../assets/facs-logo-full.png";

const socialIcons = {
  Facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.77l-.44 2.9h-2.33V22C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  ),
  Instagram: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  LinkedIn: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.38 8.1h4.24V23H.38V8.1ZM8.1 8.1h4.06v2.04h.06c.56-1.08 1.96-2.22 4.04-2.22 4.32 0 5.12 2.84 5.12 6.54V23h-4.24v-7.56c0-1.8-.04-4.12-2.52-4.12-2.52 0-2.9 1.96-2.9 3.98V23H8.1V8.1Z" />
    </svg>
  ),
};

const footerLinkClass = "group block text-sm leading-relaxed transition-all duration-300 hover:translate-x-1 hover:text-cyan-300";

function FooterLogo() {
  return (
    <Link to="/" className="group relative inline-flex items-center rounded-3xl py-2 pr-3">
      <span className="absolute -inset-8 rounded-full bg-cyan-200/14 opacity-90 blur-3xl transition-all duration-500 group-hover:bg-cyan-200/22" />
      <img
        src={facsLogoFull}
        alt="FACS"
        className="relative z-10 h-12 w-auto object-contain drop-shadow-[0_0_24px_rgba(34,211,238,0.24)] transition-transform duration-500 group-hover:scale-[1.03] sm:h-14"
      />
    </Link>
  );
}

export default function Footer() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const headOffice = isVi
    ? "31/3A Nguyễn Văn Lạc, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh"
    : "31/3A Nguyen Van Lac Street, Ward 21, Binh Thanh District, Ho Chi Minh City, Vietnam";
  const branchOffice = isVi
    ? "309 Bạch Đằng, Phường 2, Quận Bình Thạnh, Thành phố Hồ Chí Minh"
    : "309 Bach Dang Street, Ward 2, Binh Thanh District, Ho Chi Minh City, Vietnam";

  return (
    <footer className="relative overflow-hidden border-t border-cyan-200/20 bg-[radial-gradient(circle_at_top_left,rgba(0,183,255,0.13),transparent_30%),linear-gradient(135deg,#0b1422_0%,#0d1726_52%,#101b2f_100%)] py-20 text-white">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-r from-transparent via-cyan-400/12 to-transparent blur-xl" />
      <div className="absolute -top-32 left-10 h-80 w-80 rounded-full bg-cyan-400/14 blur-[110px]" />

      <div className="container relative z-10 mx-auto px-6 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr_1fr_1fr_1.35fr]">
          <div>
            <FooterLogo />
            <p className="mt-5 max-w-sm text-slate-400 leading-relaxed">
              {isVi
                ? "Nền tảng tư vấn chiến lược về tài chính, pháp lý và vận hành dành cho doanh nghiệp hiện đại tại Việt Nam."
                : "Strategic financial, legal and operational consulting infrastructure for modern enterprises in Vietnam."}
            </p>
            <div className="mt-7 flex items-center gap-3">
              {[
                ["Facebook", "https://www.facebook.com/profile.php?id=61550646023438"],
                ["Instagram", "https://www.instagram.com/facs.company/"],
                ["LinkedIn", "https://www.linkedin.com/in/facs-vietnam/"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-white/[0.045] text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:text-cyan-100 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]"
                >
                  <span className="absolute inset-0 rounded-full bg-cyan-300/0 blur-xl transition-all duration-300 group-hover:bg-cyan-300/12" />
                  <span className="relative z-10">{socialIcons[label]}</span>
                </a>
              ))}
              <a
                href="mailto:contact@facs.vn"
                aria-label="Email FACS at contact@facs.vn"
                className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/20 bg-white/[0.045] text-slate-300 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:text-cyan-100 hover:shadow-[0_0_28px_rgba(34,211,238,0.22)]"
              >
                <span className="absolute inset-0 rounded-full bg-cyan-300/0 blur-xl transition-all duration-300 group-hover:bg-cyan-300/12" />
                <Mail size={16} className="relative z-10" />
              </a>
            </div>
          </div>

          <div>
            <div className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white">{isVi ? "Dịch vụ" : "Services"}</div>
            <div className="space-y-3 text-slate-400">
              {services.map((service) => (
                <Link key={service.slug} to={`/services/${service.slug}`} className={footerLinkClass}>
                  <span className="inline-block h-px w-0 bg-cyan-300 align-middle transition-all duration-300 group-hover:mr-2 group-hover:w-5" />
                  {service.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white">{isVi ? "Lĩnh vực" : "Industries"}</div>
            <div className="space-y-3 text-slate-400">
              {industries.slice(0, 6).map((industry) => (
                <Link key={industry.slug} to={`/industries/${industry.slug}`} className={footerLinkClass}>
                  <span className="inline-block h-px w-0 bg-cyan-300 align-middle transition-all duration-300 group-hover:mr-2 group-hover:w-5" />
                  {isVi ? industry.titleVi : industry.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white">{isVi ? "Điều hướng" : "Navigation"}</div>
            <div className="space-y-3 text-slate-400">
              {[["/about", isVi ? "Giới thiệu" : "About"], ["/services", isVi ? "Dịch vụ" : "Services"], ["/industries", isVi ? "Lĩnh vực" : "Industries"], ["/insights", isVi ? "Góc nhìn" : "Insights"], ["/careers", isVi ? "Tuyển dụng" : "Careers"], ["/contact", isVi ? "Liên hệ" : "Contact"]].map(([to, label]) => (
                <Link key={to} to={to} className={footerLinkClass}>
                  <span className="inline-block h-px w-0 bg-cyan-300 align-middle transition-all duration-300 group-hover:mr-2 group-hover:w-5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-white">{isVi ? "Liên hệ" : "Contact"}</div>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <div>{isVi ? "Điện thoại" : "Hotline"}: (+84) 972 798 424</div>
              <div>Email: contact@facs.vn</div>
              <div>{isVi ? "Văn phòng chính" : "Head Office"}: {headOffice}</div>
              <div>{isVi ? "Văn phòng chi nhánh" : "Branch Office"}: {branchOffice}</div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-cyan-200/15 pt-8">
          <div className="mx-auto flex flex-col items-center justify-center gap-4 text-center text-sm text-slate-500 lg:flex-row lg:gap-0">
            <div className="px-6">© 2023 - 2026 FACS. {isVi ? "Bảo lưu mọi quyền." : "All rights reserved."}</div>
            <div className="hidden h-4 w-px bg-cyan-200/25 lg:block" />
            <Link to="/privacy" className="px-6 transition-all hover:text-cyan-300">{isVi ? "Chính sách bảo mật" : "Privacy Policy"}</Link>
            <div className="hidden h-4 w-px bg-cyan-200/25 lg:block" />
            <Link to="/terms" className="px-6 transition-all hover:text-cyan-300">{isVi ? "Điều khoản sử dụng" : "Terms of Service"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
