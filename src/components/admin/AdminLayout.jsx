import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ExternalLink, LogOut, Orbit, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import AdminNavWheel from "./AdminNavWheel";
import { ADMIN_NAV, activeGroupId, activeItemPath, loadNavMode, loadOpenGroups, saveNavMode, saveOpenGroups } from "./adminNav";

const itemClass = (active) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
    active ? "bg-cyan-300/[0.1] text-cyan-100 shadow-[inset_3px_0_0_#67E8F9]" : "text-ink-2 hover:bg-white/[0.06] hover:text-ink-1"
  }`;
const iconButton = "flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] text-ink-2 transition hover:border-cyan-200/40 hover:bg-white/[0.05] hover:text-ink-1";
const iconButtonSm = "flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] text-ink-2 transition hover:border-cyan-200/40 hover:bg-white/[0.05] hover:text-ink-1";

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
          <div key={group.id} className={index ? "border-t border-white/10 pt-1" : ""}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              disabled={isActive}
              className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3 transition hover:text-slate-200 disabled:cursor-default disabled:hover:text-ink-3"
              aria-expanded={isOpen}
            >
              <GroupIcon size={14} className={isActive ? "text-cyan-300" : ""} />
              <span className={isActive ? "text-cyan-200" : ""}>{group.label}</span>
              {!isOpen && <span className="ml-1 rounded-full bg-white/[0.06] px-1.5 text-[10px] tracking-normal text-ink-3">{group.items.length}</span>}
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
                <div className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">{group.label}</div>
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

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = activeItemPath(location.pathname);
  const activeId = activeGroupId(location.pathname);
  const [mode, setMode] = useState(loadNavMode); // expanded | collapsed | wheel
  const [openGroups, setOpenGroups] = useState(() => loadOpenGroups() ?? []);
  const [wheelOpen, setWheelOpen] = useState(false);

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
    <div data-no-translate className="facs-cms min-h-screen bg-cms-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.08),transparent_45%)] text-ink-1">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-cms-0/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setWheelOpen(true)} className={iconButton} title="Menu vòng xoay" aria-label="Mở menu vòng xoay">
              <Orbit size={19} />
            </button>
            <Link to="/admin/posts" className="font-serif text-2xl font-black tracking-[-0.04em]">
              FACS<span className="text-cyan-300">.</span>
              <span className="ml-3 hidden font-sans text-xs font-bold uppercase tracking-[0.18em] text-slate-400 sm:inline">Content CMS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/insights" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-ink-2 transition hover:border-cyan-200/40 hover:text-ink-1 md:flex">
              Insights <ExternalLink size={15} />
            </Link>
            <Link to="/careers" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-ink-2 transition hover:border-cyan-200/40 hover:text-ink-1 md:flex">
              Careers <ExternalLink size={15} />
            </Link>
            <Link to="/legal-calendar" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-ink-2 transition hover:border-cyan-200/40 hover:text-ink-1 xl:flex">
              Legal Calendar <ExternalLink size={15} />
            </Link>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-ink-2 transition hover:border-rose-300/40 hover:text-rose-200">
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className={`mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:px-8 lg:py-8 ${gridCols}`}>
        {mode !== "wheel" && (
          <aside className="h-fit lg:sticky lg:top-28">
            {/* Màn hình nhỏ luôn dùng thanh mở rộng; màn hình lớn theo lựa chọn */}
            <div className={`rounded-[20px] border border-white/10 bg-cms-1 p-3 lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto ${mode === "collapsed" ? "lg:hidden" : ""}`}>
              <div className="mb-1 flex items-center justify-between px-2 pb-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-3">Menu</span>
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
              <div className="hidden flex-col items-center gap-3 rounded-[20px] border border-white/10 bg-cms-1 px-2 py-3 lg:flex">
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
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_32px_rgba(37,99,235,0.45)] hover:bg-brand-hover transition hover:scale-105"
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

      {wheelOpen && <AdminNavWheel open onClose={() => setWheelOpen(false)} />}
    </div>
    </MotionConfig>
  );
}
