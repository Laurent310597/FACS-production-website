import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import AdminConfigurationNotice from "./AdminConfigurationNotice";

export default function ProtectedAdminRoute({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(undefined);

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

  if (!isSupabaseConfigured) return <AdminConfigurationNotice />;

  if (session === undefined) {
    return (
      <div data-no-translate className="flex min-h-screen items-center justify-center bg-[#0d1726] text-cyan-100">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
