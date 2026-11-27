import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Moon,
  Phone,
  QrCode,
  Share2,
  Sun,
  UserPlus,
  X,
} from "lucide-react";
import { leadership } from "../data/team";
import { COMPANY } from "../data/company";
import { cardUrl, mapsUrl, toE164, zaloNumber } from "../lib/digitalCard";
import { useLanguage } from "../components/LanguageContext";
import { setSiteTheme, useSiteTheme } from "../components/site/siteTheme";

const QR_DARK = "#0b2a5b";
const MARK_SRC = "/facs-mark.png";

// Mạng xã hội (icon dạng chữ để không phụ thuộc thư viện icon thương hiệu).
function SocialGlyph({ name }) {
  const paths = {
    facebook: "M14 8h2.5V4.5H14c-2.5 0-4 1.6-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V8.8c0-.5.3-.8.5-.8Z",
    linkedin: "M6.5 9.5H3.5V20h3V9.5ZM5 4a1.75 1.75 0 1 0 0 3.5A1.75 1.75 0 0 0 5 4Zm15 9.6c0-2.9-1.6-4.3-3.8-4.3-1.7 0-2.5.9-2.9 1.6V9.5h-3V20h3v-5.6c0-1.5.3-2.8 2-2.8s1.7 1.6 1.7 2.9V20h3v-6.4Z",
    instagram:
      "M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.9-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 3.5c-2.3 0-2.6 0-3.5.1-2.6.1-4 1.5-4.2 4.2-.1.9-.1 1.2-.1 4.2s0 3.3.1 4.2c.1 2.6 1.5 4 4.2 4.2.9.1 1.2.1 3.5.1s2.6 0 3.5-.1c2.6-.1 4-1.5 4.2-4.2.1-.9.1-1.2.1-4.2s0-3.3-.1-4.2c-.1-2.6-1.5-4-4.2-4.2-.9-.1-1.2-.1-3.5-.1Z",
  };
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d={paths[name]} />
    </svg>
  );
}

/** Đường dẫn gốc: trên facs.vn dùng tên miền chính; trên bản xem thử dùng chính địa chỉ đang mở để quét thử được. */
function canonicalOrigin() {
  if (typeof window === "undefined") return COMPANY.url;
  return /(^|\.)facs\.vn$/.test(window.location.hostname) ? COMPANY.url : window.location.origin;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function triggerDownload(href, filename) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Tên tệp không dấu: "Nguyễn Hoàng Tú" → "Nguyen-Hoang-Tu".
const fileSlug = (name) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export default function CardPage() {
  const { slug } = useParams();
  const { language, setLanguage } = useLanguage();
  const theme = useSiteTheme();
  const isVi = language === "vi";
  const person = leadership.find((p) => p.slug === slug);

  const shareUrl = useMemo(() => cardUrl(slug, canonicalOrigin()), [slug]);
  const qrUrl = `${shareUrl}?src=qr`;
  const [qrSvg, setQrSvg] = useState("");
  const [sheet, setSheet] = useState(null); // "qr" | "share" | null
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toString(qrUrl, { type: "svg", errorCorrectionLevel: "H", margin: 1, color: { dark: QR_DARK, light: "#ffffff" } })
      .then((svg) => alive && setQrSvg(svg))
      .catch(() => alive && setQrSvg(""));
    return () => {
      alive = false;
    };
  }, [qrUrl]);

  useEffect(() => {
    if (!person) return undefined;
    const prev = document.title;
    document.title = `${person.name} · FACS`;
    return () => {
      document.title = prev;
    };
  }, [person]);

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => e.key === "Escape" && setSheet(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  if (!person) {
    return (
      <main className="dcard-page" data-no-translate>
        <div className="dcard dcard--empty">
          <h1 className="dcard__name">{isVi ? "Không tìm thấy thẻ" : "Card not found"}</h1>
          <p className="dcard__muted">{isVi ? "Đường dẫn thẻ danh thiếp không đúng hoặc đã thay đổi." : "This business card link is incorrect or has changed."}</p>
          <Link to="/about" className="site-cta dcard__btn">{isVi ? "Xem ban lãnh đạo FACS" : "Meet FACS leadership"}</Link>
        </div>
      </main>
    );
  }

  const title = isVi ? person.titleVi : person.title;
  const role = isVi ? person.roleVi : person.role;
  const credentials = isVi ? person.credentialsVi : person.credentials;
  const tel = toE164(person.phone);
  const vcfHref = `/card/${slug}/${isVi ? "contact.vcf" : "contact-en.vcf"}`;
  const shareText = isVi ? `Thẻ danh thiếp của ${person.name} – ${title}, FACS` : `${person.name} – ${title}, FACS`;
  const baseName = `${fileSlug(person.name)}-FACS`;

  const flash = (key) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1800);
  };
  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    flash(key);
  };

  // Chia sẻ: trên điện thoại mở bảng chia sẻ của máy (Zalo, Messenger, WhatsApp, AirDrop…); máy tính mở bảng chọn kênh.
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${person.name} · FACS`, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    setSheet("share");
  };

  const downloadSvg = async () => {
    const svg = await QRCode.toString(qrUrl, { type: "svg", errorCorrectionLevel: "H", margin: 2, color: { dark: QR_DARK, light: "#ffffff" } });
    const size = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] || 33);
    let mark = "";
    try {
      const blob = await (await fetch(MARK_SRC)).blob();
      const dataUrl = await new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.readAsDataURL(blob);
      });
      const box = size * 0.24;
      const x = (size - box) / 2;
      mark = `<rect x="${x}" y="${x}" width="${box}" height="${box}" rx="${box * 0.22}" fill="#ffffff"/><image href="${dataUrl}" x="${x + box * 0.16}" y="${x + box * 0.16}" width="${box * 0.68}" height="${box * 0.68}" preserveAspectRatio="xMidYMid meet"/>`;
    } catch {
      /* không tải được logo: vẫn xuất QR không có logo */
    }
    const out = svg.replace("</svg>", `${mark}</svg>`);
    const url = URL.createObjectURL(new Blob([out], { type: "image/svg+xml" }));
    triggerDownload(url, `${baseName}-QR.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Ảnh PNG để gửi qua chat / in: QR + logo ở giữa + tên, chức danh, tên miền.
  const downloadPng = async () => {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#eef4ff";
    ctx.fillRect(0, 0, W, 210);
    const qr = document.createElement("canvas");
    await QRCode.toCanvas(qr, qrUrl, { errorCorrectionLevel: "H", margin: 1, width: 760, color: { dark: QR_DARK, light: "#ffffff" } });
    const qx = (W - 760) / 2;
    const qy = 250;
    ctx.drawImage(qr, qx, qy, 760, 760);
    try {
      const mark = await loadImage(MARK_SRC);
      const box = 170;
      const bx = (W - box) / 2;
      const by = qy + (760 - box) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, box, box, 36);
      else ctx.rect(bx, by, box, box);
      ctx.fill();
      const ih = box * 0.66;
      const iw = (mark.width / mark.height) * ih;
      ctx.drawImage(mark, (W - iw) / 2, by + (box - ih) / 2, iw, ih);
    } catch {
      /* không có logo vẫn tải được QR */
    }
    ctx.textAlign = "center";
    ctx.fillStyle = "#0b1a3a";
    ctx.font = "700 64px Cambria, Georgia, serif";
    ctx.fillText("FACS.", W / 2, 132);
    ctx.font = "700 58px Cambria, Georgia, serif";
    ctx.fillText(person.name, W / 2, 1104);
    ctx.fillStyle = "#475569";
    ctx.font = "500 34px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(title.length > 52 ? `${title.slice(0, 50)}…` : title, W / 2, 1162);
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "600 34px 'Helvetica Neue', Arial, sans-serif";
    ctx.fillText(`${COMPANY.domain}/card/${slug}`, W / 2, 1250);
    triggerDownload(canvas.toDataURL("image/png"), `${baseName}-QR.png`);
  };

  const enc = encodeURIComponent;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const channels = [
    { key: "zalo", label: "Zalo", note: isVi ? "Sao chép link rồi mở Zalo" : "Copies the link, then opens Zalo", onClick: () => { copy(shareUrl, "zalo"); window.open(coarse ? "https://zalo.me/" : "https://chat.zalo.me/", "_blank", "noopener"); } },
    coarse && { key: "messenger", label: "Messenger", href: `fb-messenger://share/?link=${enc(shareUrl)}` },
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}` },
    { key: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}` },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(`${shareText} ${shareUrl}`)}` },
    { key: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(shareText)}` },
    { key: "email", label: "Email", href: `mailto:?subject=${enc(`${person.name} · FACS`)}&body=${enc(`${shareText}\n${shareUrl}`)}` },
    coarse && { key: "sms", label: isVi ? "Tin nhắn" : "SMS", href: `sms:?&body=${enc(`${shareText} ${shareUrl}`)}` },
  ].filter(Boolean);

  const qrBlock = (large) => (
    <div className={`dcard-qr${large ? " dcard-qr--lg" : ""}`}>
      <div className="dcard-qr__code" aria-label={isVi ? `Mã QR thẻ danh thiếp của ${person.name}` : `QR code for ${person.name}'s card`} role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <span className="dcard-qr__mark" aria-hidden="true">
        <img src={MARK_SRC} alt="" />
      </span>
    </div>
  );

  const actions = [
    { key: "call", icon: Phone, label: isVi ? "Gọi" : "Call", href: `tel:${tel}` },
    { key: "zalo", icon: MessageCircle, label: "Zalo", href: `https://zalo.me/${zaloNumber(person.phone)}`, external: true },
    { key: "mail", icon: Mail, label: "Email", href: `mailto:${person.email}` },
    { key: "qr", icon: QrCode, label: isVi ? "Mã QR" : "QR code", onClick: () => setSheet("qr") },
  ];

  return (
    <main className="dcard-page" data-no-translate>
      <div className="dcard-top">
        <Link to="/" className="dcard-top__logo" aria-label={isVi ? "Về trang chủ FACS" : "Go to FACS homepage"}>
          <img src={MARK_SRC} alt="" aria-hidden="true" width="63" height="64" className="facs-mark h-[24px] w-auto" />
          <span>FACS<span className="text-facs-logo">.</span></span>
        </Link>
        <div className="dcard-top__tools">
          <div className="hdr-lang" role="group" aria-label={isVi ? "Ngôn ngữ" : "Language"}>
            <button type="button" onClick={() => setLanguage("en")} aria-pressed={!isVi} className={!isVi ? "is-on" : ""}>EN</button>
            <button type="button" onClick={() => setLanguage("vi")} aria-pressed={isVi} className={isVi ? "is-on" : ""}>VI</button>
          </div>
          <button
            type="button"
            className="hdr-tool"
            onClick={() => setSiteTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? (isVi ? "Chuyển sang chế độ tối" : "Switch to dark mode") : isVi ? "Chuyển sang chế độ sáng" : "Switch to light mode"}
          >
            {theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className="dcard-layout">
        <motion.article className="dcard" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className="dcard__band" aria-hidden="true">
            <span className="dcard__band-slogan">{isVi ? COMPANY.sloganVi : COMPANY.slogan}</span>
          </div>

          <div className="dcard__head">
            <img src={person.photo} alt={person.name} className="dcard__photo" width="112" height="112" />
            <h1 className="dcard__name">{person.name}</h1>
            <p className="dcard__title">{title}</p>
            <p className="dcard__role">{role}</p>
            <ul className="dcard__chips" aria-label={isVi ? "Chứng chỉ" : "Credentials"}>
              {credentials.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>

          <div className="dcard__actions">
            {actions.map((a) => {
              const Icon = a.icon;
              const body = (
                <>
                  <span className="dcard__action-icon"><Icon size={20} /></span>
                  <span>{a.label}</span>
                </>
              );
              return a.href ? (
                <a key={a.key} href={a.href} className="dcard__action" {...(a.external ? { target: "_blank", rel: "noreferrer" } : {})}>{body}</a>
              ) : (
                <button key={a.key} type="button" className="dcard__action" onClick={a.onClick}>{body}</button>
              );
            })}
          </div>

          <div className="dcard__cta">
            <a href={vcfHref} className="site-cta dcard__btn">
              <UserPlus size={18} />
              {isVi ? "Lưu vào danh bạ" : "Save contact"}
            </a>
            <button type="button" className="dcard__btn dcard__btn--ghost" onClick={share}>
              <Share2 size={18} />
              {isVi ? "Chia sẻ thẻ" : "Share card"}
            </button>
          </div>

          <ul className="dcard__rows">
            <li>
              <Phone size={17} aria-hidden="true" />
              <a href={`tel:${tel}`}>{person.phone}</a>
              <button type="button" className="dcard__copy" onClick={() => copy(person.phone, "phone")} aria-label={isVi ? "Sao chép số điện thoại" : "Copy phone number"}>
                {copied === "phone" ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </li>
            <li>
              <Mail size={17} aria-hidden="true" />
              <a href={`mailto:${person.email}`}>{person.email}</a>
              <button type="button" className="dcard__copy" onClick={() => copy(person.email, "email")} aria-label={isVi ? "Sao chép email" : "Copy email"}>
                {copied === "email" ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </li>
          </ul>

          <section className="dcard__company" aria-label={isVi ? "Thông tin công ty" : "Company information"}>
            <div className="dcard__company-head">
              <img src={MARK_SRC} alt="" aria-hidden="true" className="facs-mark h-[30px] w-auto" />
              <div>
                <div className="dcard__company-name">FACS<span className="text-facs-logo">.</span></div>
                <div className="sig-slogan">{isVi ? COMPANY.sloganVi : COMPANY.slogan}</div>
              </div>
            </div>
            <p className="dcard__muted">{isVi ? COMPANY.descriptionVi : COMPANY.description}</p>

            <div className="dcard__links">
              <a href={COMPANY.url} target="_blank" rel="noreferrer" className="dcard__link dcard__link--main">
                <Globe size={18} />
                <span>{COMPANY.domain}</span>
                <ArrowUpRight size={15} className="dcard__link-arrow" />
              </a>
              <a href={COMPANY.facebook} target="_blank" rel="noreferrer" className="dcard__link dcard__link--main">
                <SocialGlyph name="facebook" />
                <span>Facebook</span>
                <ArrowUpRight size={15} className="dcard__link-arrow" />
              </a>
              <a href={COMPANY.linkedin} target="_blank" rel="noreferrer" className="dcard__link" aria-label="LinkedIn">
                <SocialGlyph name="linkedin" />
                <span>LinkedIn</span>
              </a>
              <a href={COMPANY.instagram} target="_blank" rel="noreferrer" className="dcard__link" aria-label="Instagram">
                <SocialGlyph name="instagram" />
                <span>Instagram</span>
              </a>
            </div>

            <ul className="dcard__rows dcard__rows--company">
              <li>
                <Phone size={17} aria-hidden="true" />
                <span className="dcard__row-label">{isVi ? "Điện thoại" : "Hotline"}</span>
                <a href={`tel:${toE164(COMPANY.hotline)}`}>{COMPANY.hotline}</a>
              </li>
              <li>
                <Mail size={17} aria-hidden="true" />
                <span className="dcard__row-label">Email</span>
                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </li>
              {COMPANY.offices.map((o) => (
                <li key={o.label} className="dcard__office">
                  <MapPin size={17} aria-hidden="true" />
                  <div>
                    <span className="dcard__row-label">{isVi ? o.labelVi : o.label}</span>
                    <a href={mapsUrl(isVi ? o.addressVi : o.address)} target="_blank" rel="noreferrer">{isVi ? o.addressVi : o.address}</a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="dcard__foot">
            <Link to={`/about/team/${slug}`} className="dcard__profile">
              {isVi ? "Xem hồ sơ đầy đủ" : "View full profile"} <ArrowUpRight size={15} />
            </Link>
            <span className="dcard__url">{COMPANY.domain}/card/{slug}</span>
          </div>
        </motion.article>

        {/* Máy tính: mã QR luôn hiện cạnh thẻ để người đối diện quét. */}
        <motion.aside className="dcard-side" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}>
          {qrBlock(false)}
          <p className="dcard-side__hint">{isVi ? "Quét để mở thẻ danh thiếp trên điện thoại" : "Scan to open this card on your phone"}</p>
          <div className="dcard-side__btns">
            <button type="button" className="dcard__chipbtn" onClick={downloadPng}><Download size={15} /> PNG</button>
            <button type="button" className="dcard__chipbtn" onClick={downloadSvg}><Download size={15} /> SVG</button>
            <button type="button" className="dcard__chipbtn" onClick={() => copy(shareUrl, "link")}>{copied === "link" ? <Check size={15} /> : <Copy size={15} />} Link</button>
          </div>
        </motion.aside>
      </div>

      {/* Gắn thẳng vào <body>: khung chuyển trang có transform nên position:fixed bên trong sẽ lệch khỏi giữa màn hình. */}
      {createPortal(
      <AnimatePresence>
        {sheet && (
          <motion.div className="dcard-sheet" data-no-translate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(null)}>
            <motion.div
              className="dcard-sheet__panel"
              role="dialog"
              aria-modal="true"
              aria-label={sheet === "qr" ? (isVi ? "Mã QR" : "QR code") : isVi ? "Chia sẻ thẻ" : "Share card"}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className="dcard-sheet__close hdr-tool" onClick={() => setSheet(null)} aria-label={isVi ? "Đóng" : "Close"}>
                <X size={18} />
              </button>
              {sheet === "qr" ? (
                <>
                  {qrBlock(true)}
                  <div className="dcard-sheet__name">{person.name}</div>
                  <div className="dcard__muted">{isVi ? "Đưa mã này cho người đối diện quét" : "Let the other person scan this code"}</div>
                  <div className="dcard-side__btns">
                    <button type="button" className="dcard__chipbtn" onClick={downloadPng}><Download size={15} /> PNG</button>
                    <button type="button" className="dcard__chipbtn" onClick={downloadSvg}><Download size={15} /> SVG</button>
                    <button type="button" className="dcard__chipbtn" onClick={share}><Share2 size={15} /> {isVi ? "Chia sẻ" : "Share"}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="dcard-sheet__name">{isVi ? "Chia sẻ thẻ qua" : "Share via"}</div>
                  <div className="dcard-share">
                    {channels.map((c) =>
                      c.href ? (
                        <a key={c.key} href={c.href} target="_blank" rel="noreferrer" className="dcard-share__item">{c.label}</a>
                      ) : (
                        <button key={c.key} type="button" className="dcard-share__item" onClick={c.onClick} title={c.note}>
                          {copied === c.key ? (isVi ? "Đã sao chép" : "Copied") : c.label}
                        </button>
                      ),
                    )}
                    <button type="button" className="dcard-share__item" onClick={() => copy(shareUrl, "link")}>
                      {copied === "link" ? (isVi ? "Đã sao chép" : "Copied") : isVi ? "Sao chép link" : "Copy link"}
                    </button>
                  </div>
                  <div className="dcard__url">{shareUrl}</div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
      )}
    </main>
  );
}
