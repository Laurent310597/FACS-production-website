import { Link, NavLink, useNavigate } from "react-router-dom";
import { ExternalLink, FilePlus2, LayoutDashboard, LogOut, Mail } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
    isActive
      ? "bg-cyan-300 text-[#071421] shadow-[0_16px_38px_rgba(34,211,238,0.20)]"
      : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
  }`;

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div data-no-translate className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.10),transparent_28%),linear-gradient(135deg,#0d1726_0%,#101b2f_55%,#132238_100%)] text-white">
      <header className="sticky top-0 z-40 border-b border-cyan-200/15 bg-[#0d1726]/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between gap-4 px-5 lg:px-8">
          <Link to="/admin/posts" className="font-serif text-2xl font-black tracking-[-0.04em]">
            FACS<span className="text-cyan-300">.</span>
            <span className="ml-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Insights CMS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/insights" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white sm:flex">
              Xem website <ExternalLink size={15} />
            </Link>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-red-300/30 hover:text-red-200">
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="h-fit rounded-[26px] border border-white/10 bg-white/[0.035] p-3 lg:sticky lg:top-28">
          <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <NavLink to="/admin/posts" end className={navClass}>
              <LayoutDashboard size={18} /> Danh sách bài viết
            </NavLink>
            <NavLink to="/admin/posts/new" className={navClass}>
              <FilePlus2 size={18} /> Viết bài mới
            </NavLink>
            <NavLink to="/admin/email" className={navClass}>
              <Mail size={18} /> Email & Audience
            </NavLink>
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
