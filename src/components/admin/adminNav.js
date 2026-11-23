import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CalendarRange,
  FilePlus2,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Mail,
  MailCheck,
  MessagesSquare,
  Newspaper,
  Radar,
  ReceiptText,
  Scale,
  Sparkles,
  UserRoundSearch,
  Wallet,
  Workflow,
} from "lucide-react";

// Địa chỉ Văn phòng AI ảo (FACS AI Office trên Cloudflare Pages). Đổi bằng biến VITE_AI_OFFICE_URL trên Vercel nếu cần.
export const AI_OFFICE_URL = import.meta.env.VITE_AI_OFFICE_URL || "https://facs-ai-office.pages.dev/";

// Một nguồn duy nhất cho menu quản trị: thanh bên (mở rộng / thu gọn) và menu vòng xoay đều đọc từ đây.
export const ADMIN_NAV = [
  {
    id: "insights",
    label: "Insights",
    icon: Newspaper,
    items: [
      { to: "/admin/posts", label: "Danh sách bài viết", icon: LayoutDashboard },
      { to: "/admin/posts/new", label: "Viết bài mới", icon: Newspaper },
      { to: "/admin/email", label: "Email Insights", icon: Mail },
    ],
  },
  {
    id: "hub",
    label: "FACS Hub",
    icon: Sparkles,
    items: [
      { to: "/admin/hub/content", label: "Tạo nội dung AI", icon: Sparkles },
      { to: "/admin/hub/social", label: "Đăng & lịch đăng", icon: CalendarClock },
      { to: "/admin/hub/zalo", label: "AI Zalo", icon: MessagesSquare },
      { to: "/admin/hub/library", label: "Thư viện Hub", icon: FolderOpen },
      { href: AI_OFFICE_URL, label: "Văn phòng AI ảo", icon: Building2, external: true },
    ],
  },
  {
    id: "careers",
    label: "Careers",
    icon: Briefcase,
    items: [
      { to: "/admin/jobs", label: "Danh sách tuyển dụng", icon: Briefcase },
      { to: "/admin/jobs/new", label: "Tạo JD mới", icon: FilePlus2 },
      { to: "/admin/applications", label: "Hồ sơ ứng tuyển", icon: UserRoundSearch },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    icon: Inbox,
    items: [{ to: "/admin/inquiries", label: "Yêu cầu liên hệ", icon: MessagesSquare }],
  },
  {
    id: "legal",
    label: "Legal Calendar",
    icon: Scale,
    items: [
      { to: "/admin/legal-dashboard", label: "Dashboard vận hành", icon: BarChart3 },
      { to: "/admin/legal-calendar", label: "Mốc pháp lý", icon: CalendarRange },
      { to: "/admin/legal-email", label: "Email lịch tháng", icon: MailCheck },
      { to: "/admin/legal-sources", label: "Nguồn & cập nhật", icon: Radar },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    icon: Workflow,
    items: [{ to: "/admin/form-email", label: "Email biểu mẫu", icon: MailCheck }],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    items: [{ to: "/admin/ar", label: "AR – Nhắc công nợ", icon: ReceiptText }],
  },
];

/** Mục đang mở: khớp đúng đường dẫn; nếu không có thì khớp đường dẫn con dài nhất (vd. /admin/posts/123/edit → Danh sách bài viết). */
export function activeItemPath(pathname) {
  const paths = ADMIN_NAV.flatMap((g) => g.items.filter((i) => i.to).map((i) => i.to));
  if (paths.includes(pathname)) return pathname;
  return paths.filter((p) => pathname.startsWith(`${p}/`)).sort((a, b) => b.length - a.length)[0] || null;
}

export function activeGroupId(pathname) {
  const path = activeItemPath(pathname);
  return ADMIN_NAV.find((g) => g.items.some((i) => i.to === path))?.id || null;
}

const MODE_KEY = "facs-admin-nav-mode";
const GROUPS_KEY = "facs-admin-nav-open-groups";
export const NAV_MODES = ["expanded", "collapsed", "wheel"];

export function loadNavMode() {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return NAV_MODES.includes(value) ? value : "expanded";
  } catch {
    return "expanded";
  }
}

export function saveNavMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ không nhớ lựa chọn.
  }
}

/** Danh sách nhóm đang mở mà người dùng đã chọn; null nếu chưa từng chọn (khi đó chỉ mở nhóm đang dùng). */
export function loadOpenGroups() {
  try {
    const raw = localStorage.getItem(GROUPS_KEY);
    if (raw === null) return null;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : null;
  } catch {
    return null;
  }
}

export function saveOpenGroups(ids) {
  try {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(ids));
  } catch {
    // Bỏ qua.
  }
}

// Các trang công khai mở nhanh từ menu "Xem website" và bảng lệnh Ctrl+K.
export const PUBLIC_SITE_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/insights", label: "Insights" },
  { href: "/careers", label: "Careers" },
  { href: "/legal-calendar", label: "Legal Calendar" },
  { href: "/contact", label: "Liên hệ" },
];

/** Nhóm và mục đang mở, dùng cho breadcrumb trên header. */
export function activeTrail(pathname) {
  const path = activeItemPath(pathname);
  const group = ADMIN_NAV.find((g) => g.items.some((i) => i.to === path));
  const item = group?.items.find((i) => i.to === path);
  return { group, item, isSubPage: Boolean(path && pathname !== path) };
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu. */
export function foldVi(text = "") {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
