import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ExternalLink, Globe, LogOut, Menu, Orbit, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import AdminNavWheel from "./AdminNavWheel";
import CommandPalette from "./CommandPalette";
import HeaderWave from "./HeaderWave";
import CmsBackdrop from "./CmsBackdrop";
import { ADMIN_NAV, PUBLIC_SITE_LINKS, activeGroupId, activeItemPath, activeTrail, loadNavMode, loadOpenGroups, saveNavMode, saveOpenGroups } from "./adminNav";

const itemClass = (active) =>
  `group/nav flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 [&>svg:first-child]:transition-transform [&>svg:first-child]:duration-300 hover:[&>svg:first-child]:scale-115 hover:[&>svg:first-child]:-rotate-6 ${
    active ? "bg-cyan-300/[0.12] text-cyan-50 shadow-[inset_3px_0_0_#FF6B35,0_10px_30px_-18px_rgba(43,91,255,0.9)]" : "text-ink-2 hover:translate-x-1 hover:bg-white/[0.06] hover:text-ink-1 hover:shadow-[inset_2px_0_0_rgba(255,107,53,0.6)]"
  }`;
const iconButton = "facs-ripple-host flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] text-ink-2 transition duration-200 hover:scale-[1.07] hover:border-cyan-300/50 hover:bg-white/[0.06] hover:text-ink-1 active:scale-95";
const iconButtonSm = "facs-ripple-host flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] text-ink-2 transition duration-200 hover:scale-[1.08] hover:border-cyan-300/50 hover:bg-white/[0.06] hover:text-ink-1 active:scale-95";

function NavItem({ item, currentPath, compact = false }) {
  const Icon = item.icon;
  const cls = itemClass(item.to && item.to === currentPath) + (compact ? " py-2.5" : "");
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer noopener" className={cls}>
        <Icon size={18} /> {item.label} <ExternalLink size={14} className="ml-auto opacity-60" />
      </a>
    );
  }
  return (
    <NavLink to={item.to} end className={() => cls}>
      <Icon size={18} /> {item.label}
    </NavLink>
  );
}

/** Thanh bên mở rộng: mỗi nhóm thu gọn / mở ra được; nhóm đang dùng luôn mở. */
function ExpandedNav({ currentPath, activeId, openGroups, toggleGroup }) {
  return (
    <nav className="grid gap-1">
      {ADMIN_NAV.map((group, index) => {
        const GroupIcon = group.icon;
        const isActive = group.id === activeId;
        const isOpen = isActive || openGroups.includes(group.id);
        return (
          <div key={group.id} className={index ? "border-t border-white/[0.06] pt-1" : ""}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              disabled={isActive}
              className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-ink-3 transition hover:text-ink-1 disabled:cursor-default disabled:hover:text-ink-3"
              aria-expanded={isOpen}
            >
              <GroupIcon size={15} className={isActive ? "text-sunset" : ""} />
              <span className={isActive ? "text-ink-1" : ""}>{group.label}</span>
              
              {!isActive && <ChevronDown size={14} className={`ml-auto transition-transform ${isOpen ? "" : "-rotate-90"}`} />}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="items"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-1 pb-2">
                    {group.items.map((item) => <NavItem key={item.to || item.href} item={item} currentPath={currentPath} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

/** Thanh bên thu gọn: chỉ còn biểu tượng nhóm; rê chuột (hoặc bấm) vào biểu tượng để hiện chức năng của nhóm. */
function CollapsedNav({ currentPath, activeId }) {
  return (
    <nav className="flex flex-col items-center gap-2">
      {ADMIN_NAV.map((group) => {
        const GroupIcon = group.icon;
        const isActive = group.id === activeId;
        return (
          <div key={group.id} className="group relative">
            <button
              type="button"
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${isActive ? "bg-cyan-300/[0.12] text-cyan-100" : "text-slate-400 hover:bg-white/[0.07] hover:text-white"}`}
              aria-label={group.label}
            >
              <GroupIcon size={20} />
            </button>
            {/* pl-3 làm "cầu nối" để rê chuột từ biểu tượng sang bảng không bị tắt */}
            <div className="invisible absolute left-full top-0 z-50 pl-3 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="w-64 rounded-2xl border border-cyan-200/15 bg-cms-3 p-2 shadow-2xl">
                <div className="px-3 pb-2 pt-1 text-[13px] font-semibold text-sunset">{group.label}</div>
                <div className="grid gap-1">
                  {group.items.map((item) => <NavItem key={item.to || item.href} item={item} currentPath={currentPath} compact />)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

// Chuyển động chung cho CMS (một bộ lắng nghe cho cả trang):
// - ánh sáng theo con trỏ trên .facs-card, nghiêng 3D trên .facs-tile;
// - thẻ hiện dần khi cuộn tới (lần lượt từng thẻ);
// - gợn sóng khi bấm nút.
function useCmsMotion(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = null;

    const apply = () => {
      frame = 0;
      let el = last?.target instanceof Element ? last.target.closest(".facs-card, .facs-tile") : null;
      while (el) {
        const r = el.getBoundingClientRect();
        const x = last.clientX - r.left;
        const y = last.clientY - r.top;
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        if (el.classList.contains("facs-tile") && !reduce) {
          el.style.setProperty("--rx", `${((0.5 - y / r.height) * 7).toFixed(2)}deg`);
          el.style.setProperty("--ry", `${((x / r.width - 0.5) * 9).toFixed(2)}deg`);
        }
        el = el.parentElement?.closest(".facs-card, .facs-tile") || null;
      }
    };
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onDown = (e) => {
      if (reduce || e.button !== 0) return;
      const host = e.target instanceof Element ? e.target.closest(".facs-ripple-host, button.bg-brand, a.bg-brand") : null;
      if (!host || host.disabled) return;
      const r = host.getBoundingClientRect();
      const size = Math.hypot(r.width, r.height) * 2;
      const dot = document.createElement("span");
      dot.className = "facs-ripple";
      dot.style.cssText = `left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:${size}px;height:${size}px`;
      host.appendChild(dot);
      setTimeout(() => dot.remove(), 650);
    };
    root.addEventListener("pointerdown", onDown);

    let io = null;
    let mo = null;
    if (!reduce && "IntersectionObserver" in window) {
      root.classList.add("facs-reveal");
      io = new IntersectionObserver(
        (entries) => {
          entries
            .filter((en) => en.isIntersecting)
            .forEach((en, i) => {
              const el = en.target;
              el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
              el.classList.add("is-in");
              io.unobserve(el);
              setTimeout(() => (el.style.transitionDelay = ""), 900);
            });
        },
        { rootMargin: "0px 0px -6% 0px" },
      );
      const watch = (scope) => scope.querySelectorAll?.(".facs-card:not(.is-in)").forEach((el) => io.observe(el));
      watch(root);
      mo = new MutationObserver((records) => {
        for (const rec of records)
          rec.addedNodes.forEach((n) => {
            if (!(n instanceof Element)) return;
            if (n.matches(".facs-card:not(.is-in)")) io.observe(n);
            watch(n);
          });
      });
      mo.observe(root, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      cancelAnimationFrame(frame);
      io?.disconnect();
      mo?.disconnect();
    };
  }, [rootRef]);
}

export default function AdminLayout({ children }) {
  const rootRef = useRef(null);
  useCmsMotion(rootRef);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = activeItemPath(location.pathname);
  const activeId = activeGroupId(location.pathname);
  const [mode, setMode] = useState(loadNavMode); // expanded | collapsed | wheel
  const [openGroups, setOpenGroups] = useState(() => loadOpenGroups() ?? []);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const siteMenuRef = useRef(null);
  const trail = activeTrail(location.pathname);

  // Ctrl/⌘ + K mở bảng tìm nhanh.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Đóng menu "Xem website" khi bấm ra ngoài; đóng ngăn kéo menu khi chuyển trang.
  useEffect(() => {
    if (!siteMenuOpen) return undefined;
    const onDown = (e) => {
      if (!siteMenuRef.current?.contains(e.target)) setSiteMenuOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setSiteMenuOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [siteMenuOpen]);
  const [drawerPath, setDrawerPath] = useState(location.pathname);
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  const changeMode = (next) => {
    setMode(next);
    saveNavMode(next);
  };
  const toggleGroup = (id) =>
    setOpenGroups((list) => {
      const next = list.includes(id) ? list.filter((g) => g !== id) : [...list, id];
      saveOpenGroups(next);
      return next;
    });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  const gridCols = mode === "expanded" ? "lg:grid-cols-[260px_minmax(0,1fr)]" : mode === "collapsed" ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "";

  return (
    <MotionConfig reducedMotion="user">
    <div ref={rootRef} data-no-translate className="facs-cms facs-aurora min-h-screen text-ink-1">
      <CmsBackdrop />
      <header className="sticky top-0 z-40 bg-midnight-2/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-5 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" onClick={() => setDrawerOpen(true)} className={`${iconButton} lg:hidden`} title="Mở menu" aria-label="Mở menu">
              <Menu size={19} />
            </button>
            <button type="button" onClick={() => setWheelOpen(true)} className={`${iconButton} hidden lg:flex`} title="Menu vòng xoay" aria-label="Mở menu vòng xoay">
              <Orbit size={19} />
            </button>
            <Link to="/admin/posts" className="shrink-0 font-serif text-2xl font-black tracking-[-0.04em]" aria-label="FACS CMS – về trang đầu">
              FACS<span className="text-facs-logo">.</span>
            </Link>
            {trail.group && (
              <nav aria-label="Vị trí hiện tại" className="ml-1 hidden min-w-0 items-center gap-1.5 border-l border-white/[0.08] pl-4 text-sm md:flex">
                <span className="shrink-0 text-ink-3">{trail.group.label}</span>
                <ChevronRight size={14} className="shrink-0 text-ink-3" />
                {trail.isSubPage ? (
                  <>
                    <Link to={trail.item.to} className="truncate text-ink-2 transition hover:text-ink-1">{trail.item.label}</Link>
                    <ChevronRight size={14} className="shrink-0 text-ink-3" />
                    <span className="truncate font-semibold text-ink-1">Chi tiết</span>
                  </>
                ) : (
                  <span className="truncate font-semibold text-ink-1">{trail.item.label}</span>
                )}
              </nav>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 text-sm text-ink-3 transition hover:border-cyan-300/40 hover:text-ink-1 sm:w-56 lg:w-64"
              aria-label="Tìm nhanh (Ctrl K)"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Tìm nhanh…</span>
              <kbd className="ml-auto hidden rounded-md border border-white/[0.12] px-1.5 py-0.5 font-sans text-[11px] sm:inline">Ctrl K</kbd>
            </button>
            <div ref={siteMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setSiteMenuOpen((v) => !v)}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] px-3 text-sm text-ink-2 transition hover:border-cyan-300/40 hover:text-ink-1"
                aria-haspopup="menu"
                aria-expanded={siteMenuOpen}
              >
                <Globe size={16} />
                <span className="hidden md:inline">Xem website</span>
                <ChevronDown size={14} className={`hidden transition-transform md:block ${siteMenuOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {siteMenuOpen && (
                  <motion.div
                    role="menu"
                    className="absolute right-0 top-12 w-56 rounded-2xl border border-cyan-300/[0.16] bg-cms-3 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
                    initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                  >
                    {PUBLIC_SITE_LINKS.map((link) => (
                      <a key={link.href} role="menuitem" href={link.href} target="_blank" rel="noreferrer noopener" onClick={() => setSiteMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink-2 transition hover:bg-white/[0.06] hover:text-ink-1">
                        {link.label} <ExternalLink size={14} className="opacity-60" />
                      </a>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" onClick={handleLogout} className={`${iconButton} hover:border-rose-300/40! hover:text-rose-200!`} title="Đăng xuất" aria-label="Đăng xuất">
              <LogOut size={17} />
            </button>
          </div>
        </div>
        <HeaderWave />
      </header>

      <div className={`mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:px-8 lg:py-8 ${gridCols}`}>
        {mode !== "wheel" && (
          <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
            {/* Màn hình nhỏ luôn dùng thanh mở rộng; màn hình lớn theo lựa chọn */}
            <div className={`rounded-[20px] border border-white/[0.07] bg-midnight-2/90 p-3 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto ${mode === "collapsed" ? "lg:hidden" : ""}`}>
              <div className="mb-1 flex items-center justify-between px-2 pb-2">
                <span className="text-[13px] font-semibold text-ink-3">Menu</span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => changeMode("wheel")} className={iconButtonSm} title="Ẩn thanh bên, dùng menu vòng xoay" aria-label="Dùng menu vòng xoay">
                    <Orbit size={15} />
                  </button>
                  <button type="button" onClick={() => changeMode("collapsed")} className={`${iconButtonSm} hidden lg:flex`} title="Thu gọn thanh bên" aria-label="Thu gọn thanh bên">
                    <PanelLeftClose size={15} />
                  </button>
                </div>
              </div>
              <ExpandedNav currentPath={currentPath} activeId={activeId} openGroups={openGroups} toggleGroup={toggleGroup} />
            </div>

            {mode === "collapsed" && (
              <div className="hidden flex-col items-center gap-3 rounded-[20px] border border-white/[0.07] bg-midnight-2/90 px-2 py-3 lg:flex">
                <button type="button" onClick={() => changeMode("expanded")} className={iconButton} title="Mở rộng thanh bên" aria-label="Mở rộng thanh bên">
                  <PanelLeftOpen size={18} />
                </button>
                <div className="h-px w-8 bg-white/10" />
                <CollapsedNav currentPath={currentPath} activeId={activeId} />
                <div className="h-px w-8 bg-white/10" />
                <button type="button" onClick={() => setWheelOpen(true)} className={iconButton} title="Menu vòng xoay" aria-label="Mở menu vòng xoay">
                  <Orbit size={18} />
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Nội dung trang hiện mờ dần khi chuyển trang */}
        <motion.section
          key={location.pathname}
          className="min-w-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {children}
        </motion.section>
      </div>

      {mode === "wheel" && (
        <div className="fixed bottom-5 left-5 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWheelOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[#160800] shadow-[0_12px_32px_rgba(255,107,53,0.45)] hover:bg-brand-hover transition hover:scale-105"
            title="Mở menu vòng xoay"
            aria-label="Mở menu vòng xoay"
          >
            <Orbit size={24} />
          </button>
          <button type="button" onClick={() => changeMode("expanded")} className={`${iconButton} bg-cms-3/95`} title="Hiện lại thanh bên" aria-label="Hiện lại thanh bên">
            <PanelLeftOpen size={18} />
          </button>
        </div>
      )}

      {/* Màn hình nhỏ: menu trượt từ trái thay cho thanh bên */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 bg-[#020409]/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} aria-label="Đóng menu" />
            <motion.div
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[320px] flex-col border-r border-white/[0.07] bg-midnight-2 p-3"
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                <span className="font-serif text-xl font-black">FACS<span className="text-facs-logo">.</span></span>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => { setDrawerOpen(false); setWheelOpen(true); }} className={iconButtonSm} aria-label="Dùng menu vòng xoay"><Orbit size={15} /></button>
                  <button type="button" onClick={() => setDrawerOpen(false)} className={iconButtonSm} aria-label="Đóng menu"><X size={15} /></button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ExpandedNav currentPath={currentPath} activeId={activeId} openGroups={openGroups} toggleGroup={toggleGroup} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {wheelOpen && <AdminNavWheel open onClose={() => setWheelOpen(false)} />}
    </div>
    </MotionConfig>
  );
}
