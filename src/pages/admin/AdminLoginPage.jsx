import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminConfigurationNotice from "../../components/admin/AdminConfigurationNotice";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/admin/posts", { replace: true });
    });
  }, [navigate]);

  if (!isSupabaseConfigured) return <AdminConfigurationNotice />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (loginError) {
      setError("Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.");
      return;
    }

    navigate(location.state?.from || "/admin/posts", { replace: true });
  };

  return (
    <main data-no-translate className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.16),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] px-6 py-14 text-white">
      <div className="absolute -left-28 top-20 h-80 w-80 rounded-full bg-cyan-400/10 blur-[120px]" />
      <div className="absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-cyan-200/15 bg-white/[0.05] p-7 shadow-[0_35px_110px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-9">
        <Link to="/" className="font-serif text-4xl font-black tracking-[-0.05em]">
          FACS<span className="text-cyan-300">.</span>
        </Link>
        <div className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">Insights Administration</div>
        <h1 className="mt-8 text-3xl font-bold">Đăng nhập quản trị</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">Đăng nhập bằng tài khoản quản trị đã được tạo trong Supabase.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Email</span>
            <div className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/40">
              <Mail size={18} className="text-slate-500" />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-transparent px-3 py-3.5 text-white outline-none placeholder:text-slate-600"
                placeholder="admin@facs.vn"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-200">Mật khẩu</span>
            <div className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/40">
              <LockKeyhole size={18} className="text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent px-3 py-3.5 text-white outline-none placeholder:text-slate-600"
                placeholder="••••••••••"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-slate-500 transition hover:text-cyan-200" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <div className="rounded-2xl border border-red-300/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">{error}</div>}

          <button disabled={loading} className="w-full rounded-2xl bg-cyan-300 px-5 py-3.5 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <Link to="/insights" className="mt-6 block text-center text-sm text-slate-500 transition hover:text-cyan-200">← Trở lại trang Insights</Link>
      </div>
    </main>
  );
}
