import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import AdminConfigurationNotice from "./AdminConfigurationNotice";

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(undefined);
  const [access, setAccess] = useState({ user: null, ok: false });
  const userId = session?.user?.id || null;

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session || null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession || null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Chỉ tài khoản trong danh sách quản trị mới vào CMS (tài khoản chỉnh thẻ danh thiếp thì không).
  useEffect(() => {
    if (!supabase || !userId) return undefined;
    let mounted = true;
    supabase.rpc("is_cms_admin").then(({ data, error }) => {
      if (mounted) setAccess({ user: userId, ok: !error && data === true });
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (!isSupabaseConfigured) return <AdminConfigurationNotice />;

  if (session === undefined || (session && access.user !== userId)) {
    return (
      <div data-no-translate className="flex min-h-screen items-center justify-center bg-cms-0 text-cyan-100">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!access.ok) {
    return (
      <div data-no-translate className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cms-0 px-6 text-center text-cyan-100">
        <p className="text-lg font-semibold">Tài khoản {session.user.email} không có quyền quản trị.</p>
        <button
          type="button"
          className="rounded-xl border border-cyan-300/40 px-4 py-2 text-sm font-semibold"
          onClick={() => supabase.auth.signOut()}
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return children;
}
