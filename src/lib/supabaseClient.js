import { createClient } from "@supabase/supabase-js";
import { emailPreviewFetch, isEmailDataPreview } from "./emailPreviewAccess";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
export const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      ...(isEmailDataPreview ? { global: { fetch: emailPreviewFetch } } : {}),
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
