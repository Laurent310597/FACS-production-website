import { Link, NavLink, useNavigate } from "react-router-dom";
import { Briefcase, CalendarRange, ExternalLink, FilePlus2, LayoutDashboard, LogOut, MailCheck, MessagesSquare, Newspaper, Radar, UserRoundSearch } from "lucide-react";
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
        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link to="/admin/posts" className="font-serif text-2xl font-black tracking-[-0.04em]">
            FACS<span className="text-cyan-300">.</span>
            <span className="ml-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Content CMS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/insights" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white md:flex">
              Insights <ExternalLink size={15} />
            </Link>
            <Link to="/careers" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white md:flex">
              Careers <ExternalLink size={15} />
            </Link>
            <Link to="/legal-calendar" target="_blank" className="hidden items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-200/30 hover:text-white xl:flex">
              Legal Calendar <ExternalLink size={15} />
            </Link>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-red-300/30 hover:text-red-200">
              <LogOut size={15} /> Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-5 py-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-8">
        <aside className="h-fit rounded-[26px] border border-white/10 bg-white/[0.035] p-3 lg:sticky lg:top-28">
          <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <div className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:col-span-2 lg:col-span-1">Insights</div>
            <NavLink to="/admin/posts" end className={navClass}>
              <LayoutDashboard size={18} /> Danh sách bài viết
            </NavLink>
            <NavLink to="/admin/posts/new" end className={navClass}>
              <Newspaper size={18} /> Viết bài mới
            </NavLink>

            <div className="mt-2 border-t border-white/10 px-4 pb-1 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:col-span-2 lg:col-span-1">Careers</div>
            <NavLink to="/admin/jobs" end className={navClass}>
              <Briefcase size={18} /> Danh sách tuyển dụng
            </NavLink>
            <NavLink to="/admin/jobs/new" end className={navClass}>
              <FilePlus2 size={18} /> Tạo JD mới
            </NavLink>
            <NavLink to="/admin/applications" end className={navClass}>
              <UserRoundSearch size={18} /> Hồ sơ ứng tuyển
            </NavLink>

            <div className="mt-2 border-t border-white/10 px-4 pb-1 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:col-span-2 lg:col-span-1">Contact</div>
            <NavLink to="/admin/inquiries" end className={navClass}>
              <MessagesSquare size={18} /> Yêu cầu liên hệ
            </NavLink>

            <div className="mt-2 border-t border-white/10 px-4 pb-1 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:col-span-2 lg:col-span-1">Legal Calendar</div>
            <NavLink to="/admin/legal-calendar" end className={navClass}>
              <CalendarRange size={18} /> Mốc pháp lý
            </NavLink>
            <NavLink to="/admin/legal-sources" end className={navClass}>
              <Radar size={18} /> Nguồn & cập nhật
            </NavLink>

            <div className="mt-2 border-t border-white/10 px-4 pb-1 pt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 sm:col-span-2 lg:col-span-1">Automation</div>
            <NavLink to="/admin/form-email" end className={navClass}>
              <MailCheck size={18} /> Email biểu mẫu
            </NavLink>
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
