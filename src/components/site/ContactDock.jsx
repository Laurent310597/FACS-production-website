// Nút liên hệ nhanh cố định ở góc phải: Chat Zalo, Gọi hotline, Gửi email. Ẩn trong CMS và trang thẻ danh thiếp.
import { useLocation } from "react-router-dom";
import { Mail, Phone } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { COMPANY } from "../../data/company";
import { toE164 } from "../../lib/digitalCard";

export default function ContactDock() {
  const { pathname } = useLocation();
  const { language } = useLanguage();
  if (pathname.startsWith("/admin") || pathname.startsWith("/card/")) return null;
  const isVi = language === "vi";

  const items = [
    {
      key: "zalo",
      href: COMPANY.zalo,
      label: isVi ? "Chat Zalo với FACS" : "Chat with FACS on Zalo",
      icon: <span className="contact-dock__zalo" aria-hidden="true">Zalo</span>,
      external: true,
    },
    {
      key: "call",
      href: `tel:${toE164(COMPANY.hotline)}`,
      label: isVi ? `Gọi ${COMPANY.hotline}` : `Call ${COMPANY.hotline}`,
      icon: <Phone size={21} aria-hidden="true" />,
    },
    {
      key: "email",
      href: `mailto:${COMPANY.email}`,
      label: isVi ? `Email ${COMPANY.email}` : `Email ${COMPANY.email}`,
      icon: <Mail size={21} aria-hidden="true" />,
    },
  ];

  return (
    <nav className="contact-dock" aria-label={isVi ? "Liên hệ nhanh" : "Quick contact"} data-track-area="dock" data-no-translate>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className={`contact-dock__btn contact-dock__btn--${item.key}`}
          aria-label={item.label}
          data-track-label={`dock-${item.key}`}
          {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {item.icon}
          <span className="contact-dock__tip" aria-hidden="true">{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
