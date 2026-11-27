import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  PencilLine,
  Phone,
  Plus,
  RotateCw,
  Share,
  Share2,
  Smartphone,
  Sun,
  UserPlus,
  X,
} from "lucide-react";
import { leadership } from "../data/team";
import { COMPANY } from "../data/company";
import { cardUrl, mapsUrl, toE164, zaloNumber } from "../lib/digitalCard";
import { cardVcfUrl, fetchCardRow, mergeCard, readCardCache, writeCardCache } from "../lib/cardProfile";
import { supabase } from "../lib/supabaseClient";
import { useLanguage } from "../components/LanguageContext";
import { setSiteTheme, useSiteTheme } from "../components/site/siteTheme";

const CardEditor = lazy(() => import("../components/card/CardEditor"));

const QR_DARK = "#0b2a5b";
const LOGO_DOT = "#22d3ee"; // màu dấu "." của logo FACS (giống website)
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

/** Chạy như app trên màn hình chính (đã cài)? */
function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

/** iPhone/iPad: không có nút cài tự động, phải hướng dẫn "Thêm vào MH chính". */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Cài thẻ thành app: Android/Chrome dùng lời nhắc cài đặt của trình duyệt; iPhone hiện hướng dẫn. */
function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return { promptEvent, setPromptEvent, installed, ios: isIOS() };
}

/** Gắn manifest + thẻ meta "app" cho iPhone khi vào thẻ bằng điều hướng trong website (trang mở thẳng đã có sẵn từ lúc build). */
function useAppHead(slug, shortName) {
  useEffect(() => {
    const added = [];
    const ensure = (selector, create) => {
      if (document.head.querySelector(selector)) return;
      const el = create();
      document.head.appendChild(el);
      added.push(el);
    };
    const link = (rel, href) => () => Object.assign(document.createElement("link"), { rel, href });
    const meta = (name, content) => () => Object.assign(document.createElement("meta"), { name, content });
    ensure('link[rel="manifest"]', link("manifest", `/card/${slug}/manifest.webmanifest`));
    ensure('link[rel="apple-touch-icon"]', link("apple-touch-icon", "/card/icons/apple-touch-icon.png"));
    ensure('meta[name="apple-mobile-web-app-capable"]', meta("apple-mobile-web-app-capable", "yes"));
    ensure('meta[name="apple-mobile-web-app-title"]', meta("apple-mobile-web-app-title", shortName));
    ensure('meta[name="robots"]', meta("robots", "noindex, nofollow"));
    // Lưu sẵn thẻ để mở được khi không có mạng (chỉ bản build thật; phạm vi /card/, không ảnh hưởng website).
    if (import.meta.env.PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/card/sw.js", { scope: "/card/" }).catch(() => {});
    }
    return () => added.forEach((el) => el.remove());
  }, [slug, shortName]);
}

/** Tấm danh thiếp: mặt trước thông tin, chạm để lật sang mặt sau là mã QR. */
function BusinessCard({ person, isVi, title, role, qrSvg, flipped, onFlip, slug }) {
  return (
    <button
      type="button"
      className={`bcard${flipped ? " is-flipped" : ""}`}
      onClick={onFlip}
      aria-pressed={flipped}
      aria-label={flipped ? (isVi ? "Mặt sau: mã QR. Chạm để lật lại" : "Back: QR code. Tap to flip back") : isVi ? "Mặt trước. Chạm để xem mã QR" : "Front. Tap to show the QR code"}
    >
      <span className="bcard__inner">
        <span className="bcard__face bcard__face--front">
          <span className="bcard__top">
            <span className="bcard__brand">
              <span className="bcard__plate"><img src={MARK_SRC} alt="" /></span>
              <span className="bcard__wordmark">FACS<span className="bcard__dot">.</span></span>
            </span>
            <span className="bcard__kind">{isVi ? "Thẻ danh thiếp" : "Business card"}</span>
          </span>
          <span className="bcard__person">
            <img src={person.photoUrl} alt="" className="bcard__photo" onError={(e) => { if (!e.currentTarget.src.endsWith(`/card/${slug}.jpg`)) e.currentTarget.src = `/card/${slug}.jpg`; }} />
            <span className="bcard__name">{person.name}</span>
            <span className="bcard__title">{title}</span>
            <span className="bcard__role">{role}</span>
          </span>
          <span className="bcard__lines">
            <span><Phone size={14} aria-hidden="true" />{person.phone}</span>
            <span><Mail size={14} aria-hidden="true" />{person.email}</span>
            <span><Globe size={14} aria-hidden="true" />{COMPANY.domain}</span>
          </span>
          <span className="bcard__foot">
            <span className="bcard__slogan">{isVi ? COMPANY.sloganVi : COMPANY.slogan}</span>
            <RotateCw size={15} aria-hidden="true" className="bcard__flipicon" />
          </span>
        </span>
        <span className="bcard__face bcard__face--back">
          <span className="bcard__back-title">{isVi ? "Quét để lưu liên hệ" : "Scan to save contact"}</span>
          <span className="bcard__qr">
            <span className="bcard__qr-code" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <span className="bcard__qr-mark"><img src={MARK_SRC} alt="" /></span>
          </span>
          <span className="bcard__back-name">{person.name}</span>
          <span className="bcard__back-url">{COMPANY.domain}/card/{slug}</span>
          <span className="bcard__back-brand">
            <img src={MARK_SRC} alt="" />
            <span>FACS<span className="bcard__dot">.</span></span>
          </span>
        </span>
      </span>
    </button>
  );
}

export default function CardPage() {
  const { slug } = useParams();
  const { language, setLanguage } = useLanguage();
  const theme = useSiteTheme();
  const isVi = language === "vi";
  const basePerson = leadership.find((p) => p.slug === slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const [row, setRow] = useState(() => readCardCache(slug));
  const person = useMemo(() => mergeCard(basePerson, row), [basePerson, row]);
  const [canEdit, setCanEdit] = useState(false);
  // Quay lại từ email (xác nhận tài khoản / đặt lại mật khẩu): mở ngay khung chỉnh sửa.
  const [returnFlag] = useState(() => (searchParams.get("reset") ? "password" : searchParams.get("confirmed") ? "edit" : ""));
  const [editMode, setEditMode] = useState(returnFlag || "login");

  const shareUrl = useMemo(() => cardUrl(slug, canonicalOrigin()), [slug]);
  const qrUrl = `${shareUrl}?src=qr`;
  const [qrSvg, setQrSvg] = useState("");
  const [sheet, setSheet] = useState(() => (returnFlag ? "edit" : null)); // "qr" | "share" | null
  const [copied, setCopied] = useState("");
  const [flipped, setFlipped] = useState(false);
  const { promptEvent, setPromptEvent, installed, ios } = useInstallApp();
  const shortName = `FACS · ${person ? person.name.trim().split(/\s+/).pop() : ""}`;
  useAppHead(slug, shortName);

  // Thông tin mới nhất do chủ thẻ cập nhật (mất mạng thì dùng bản đã lưu trên máy).
  useEffect(() => {
    if (!basePerson) return undefined;
    let alive = true;
    fetchCardRow(slug)
      .then((data) => {
        if (!alive || !data) return;
        setRow(data);
        writeCardCache(slug, data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [slug, basePerson]);

  // Chủ thẻ đang đăng nhập: hiện nút chỉnh sửa nhanh ở đầu trang.
  useEffect(() => {
    if (!supabase || !basePerson) return undefined;
    let alive = true;
    const check = (session) => {
      if (!session) {
        setCanEdit(false);
        return;
      }
      supabase.rpc("card_can_edit", { p_slug: slug }).then(({ data }) => alive && setCanEdit(data === true));
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setEditMode("password");
        setSheet("edit");
      }
      check(session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [slug, basePerson]);

  useEffect(() => {
    if (!searchParams.has("reset") && !searchParams.has("confirmed")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("reset");
    next.delete("confirmed");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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
  const vcfHref = cardVcfUrl(slug, isVi);
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
    const wordW = ctx.measureText("FACS").width;
    const dotW = ctx.measureText(".").width;
    ctx.textAlign = "left";
    ctx.fillText("FACS", W / 2 - (wordW + dotW) / 2, 132);
    ctx.fillStyle = LOGO_DOT;
    ctx.fillText(".", W / 2 - (wordW + dotW) / 2 + wordW, 132);
    ctx.textAlign = "center";
    ctx.fillStyle = "#0b1a3a";
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
    { key: "save", icon: UserPlus, label: isVi ? "Danh bạ" : "Save", href: vcfHref },
    { key: "share", icon: Share2, label: isVi ? "Chia sẻ" : "Share", onClick: share },
  ];

  const install = async () => {
    if (promptEvent) {
      promptEvent.prompt();
      try {
        await promptEvent.userChoice;
      } finally {
        setPromptEvent(null);
      }
      return;
    }
    setSheet("install");
  };
  const showInstall = !installed && (promptEvent || ios || coarse);

  return (
    <main className="dcard-page" data-no-translate>
      <div className="dcard-top">
        <Link to="/" className="dcard-top__logo" aria-label={isVi ? "Về trang chủ FACS" : "Go to FACS homepage"}>
          <img src={MARK_SRC} alt="" aria-hidden="true" width="63" height="64" className="facs-mark h-[24px] w-auto" />
          <span>FACS<span className="text-facs-logo">.</span></span>
        </Link>
        <div className="dcard-top__tools">
          {canEdit && (
            <button type="button" className="hdr-tool" onClick={() => { setEditMode("edit"); setSheet("edit"); }} aria-label={isVi ? "Chỉnh sửa thẻ" : "Edit card"} title={isVi ? "Chỉnh sửa thẻ" : "Edit card"}>
              <PencilLine size={18} />
            </button>
          )}
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

      <div className="dcard-stage">
        <motion.div initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}>
          <BusinessCard person={person} isVi={isVi} title={title} role={role} qrSvg={qrSvg} flipped={flipped} onFlip={() => setFlipped((f) => !f)} slug={slug} />
        </motion.div>
        <p className="dcard-hint">
          <RotateCw size={14} aria-hidden="true" />
          {flipped ? (isVi ? "Chạm vào thẻ để xem lại mặt trước" : "Tap the card to see the front") : isVi ? "Chạm vào thẻ để hiện mã QR" : "Tap the card to show the QR code"}
        </p>

        <div className="dcard-quick">
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

        {showInstall && (
          <button type="button" className="dcard-install" onClick={install}>
            <span className="dcard-install__icon"><img src="/card/icons/icon-192.png" alt="" /></span>
            <span className="dcard-install__text">
              <strong>{isVi ? "Cài thẻ lên màn hình chính" : "Add card to Home Screen"}</strong>
              <span>{isVi ? "Mở thẻ như một ứng dụng, dùng được cả khi không có mạng" : "Open it like an app, even offline"}</span>
            </span>
            <Plus size={20} aria-hidden="true" />
          </button>
        )}

        <article className="dcard dcard--details">
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

          <ul className="dcard__chips dcard__chips--left" aria-label={isVi ? "Chứng chỉ" : "Credentials"}>
            {credentials.map((c) => (
              <li key={c}>{c}</li>
            ))}
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

          <div className="dcard__downloads">
            <span className="dcard__row-label">{isVi ? "Tải mã QR" : "Download QR"}</span>
            <div className="dcard-side__btns">
              <button type="button" className="dcard__chipbtn" onClick={downloadPng}><Download size={15} /> PNG</button>
              <button type="button" className="dcard__chipbtn" onClick={downloadSvg}><Download size={15} /> SVG</button>
              <button type="button" className="dcard__chipbtn" onClick={() => copy(shareUrl, "link")}>{copied === "link" ? <Check size={15} /> : <Copy size={15} />} Link</button>
            </div>
          </div>

          <div className="dcard__foot">
            <Link to={`/about/team/${slug}`} className="dcard__profile">
              {isVi ? "Xem hồ sơ đầy đủ" : "View full profile"} <ArrowUpRight size={15} />
            </Link>
            <span className="dcard__url">{COMPANY.domain}/card/{slug}</span>
          </div>
        </article>

        <button type="button" className="dcard-owner" onClick={() => { setEditMode(canEdit ? "edit" : "login"); setSheet("edit"); }}>
          <PencilLine size={14} aria-hidden="true" />
          {isVi ? "Chỉnh sửa thẻ · dành cho chủ thẻ" : "Edit card · for the card owner"}
        </button>
      </div>

      {/* Gắn thẳng vào <body>: khung chuyển trang có transform nên position:fixed bên trong sẽ lệch khỏi giữa màn hình. */}
      {createPortal(
      <AnimatePresence>
        {sheet && (
          <motion.div className="dcard-sheet" data-no-translate initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => sheet !== "edit" && setSheet(null)}>
            <motion.div
              className={`dcard-sheet__panel${sheet === "edit" ? " dcard-sheet__panel--form" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-label={sheet === "edit" ? (isVi ? "Chỉnh sửa thẻ" : "Edit card") : sheet === "qr" ? (isVi ? "Mã QR" : "QR code") : isVi ? "Chia sẻ thẻ" : "Share card"}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className="dcard-sheet__close hdr-tool" onClick={() => setSheet(null)} aria-label={isVi ? "Đóng" : "Close"}>
                <X size={18} />
              </button>
              {sheet === "edit" ? (
                <Suspense fallback={<div className="cedit-loading" />}>
                  <CardEditor
                    slug={slug}
                    isVi={isVi}
                    person={person}
                    row={row}
                    initialMode={editMode}
                    onSaved={(data) => {
                      setRow(data);
                      writeCardCache(slug, data);
                      setCanEdit(true);
                    }}
                  />
                </Suspense>
              ) : sheet === "install" ? (
                <>
                  <span className="dcard-install__icon dcard-install__icon--lg"><img src="/card/icons/icon-192.png" alt="" /></span>
                  <div className="dcard-sheet__name">{isVi ? "Cài thẻ lên màn hình chính" : "Add to Home Screen"}</div>
                  {ios ? (
                    <ol className="dcard-steps">
                      <li><span>1</span><span>{isVi ? "Bấm nút Chia sẻ" : "Tap the Share button"} <Share size={16} aria-label={isVi ? "biểu tượng chia sẻ" : "share icon"} /> {isVi ? "trên thanh trình duyệt" : "in the browser bar"}</span></li>
                      <li><span>2</span><span>{isVi ? "Chọn “Thêm vào MH chính”" : "Choose “Add to Home Screen”"} <Plus size={16} aria-hidden="true" /></span></li>
                      <li><span>3</span><span>{isVi ? "Bấm “Thêm” – biểu tượng FACS hiện trên màn hình chính" : "Tap “Add” – the FACS icon appears on your Home Screen"}</span></li>
                    </ol>
                  ) : (
                    <ol className="dcard-steps">
                      <li><span>1</span><span>{isVi ? "Mở menu ⋮ của trình duyệt" : "Open the browser menu ⋮"}</span></li>
                      <li><span>2</span><span>{isVi ? "Chọn “Thêm vào màn hình chính” hoặc “Cài đặt ứng dụng”" : "Choose “Add to Home screen” or “Install app”"}</span></li>
                      <li><span>3</span><span>{isVi ? "Biểu tượng FACS hiện trên màn hình chính" : "The FACS icon appears on your Home Screen"}</span></li>
                    </ol>
                  )}
                  <div className="dcard__muted"><Smartphone size={14} aria-hidden="true" /> {isVi ? "Chạm biểu tượng là mở thẳng thẻ của bạn, kể cả khi không có mạng." : "Tap the icon to open your card instantly, even offline."}</div>
                </>
              ) : sheet === "qr" ? (
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
