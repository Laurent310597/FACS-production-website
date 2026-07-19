import { createClient } from "npm:@supabase/supabase-js@2";
import { FORM_MAILBOX } from "../_shared/form-lark.ts";

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function returnUrlFromState(state: string | null) {
  const fallback = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").replace(/\/$/, "");
  try {
    const encodedOrigin = state?.split(".", 1)[0];
    if (!encodedOrigin || !state?.includes(".")) return fallback;
    const url = new URL(decodeBase64Url(encodedOrigin));
    const hostname = url.hostname.toLowerCase();
    const allowedHost = hostname === "facs.vn"
      || hostname === "www.facs.vn"
      || hostname.endsWith(".vercel.app");
    if (url.protocol === "https:" && allowedHost) return url.origin;
  } catch {
    // Fall back to the configured production site URL.
  }
  return fallback;
}

function redirectToAdmin(state: string | null, ok: boolean, message: string) {
  const target = new URL("/admin/form-email", returnUrlFromState(state));
  target.searchParams.set("lark", ok ? "connected" : "error");
  target.searchParams.set("message", message.slice(0, 240));
  return Response.redirect(target.toString(), 302);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) return redirectToAdmin(state, false, `Lark từ chối cấp quyền: ${oauthError}`);
  if (!code || !state) return redirectToAdmin(state, false, "Không nhận được code hoặc state từ Lark.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appId = Deno.env.get("LARK_APP_ID")?.trim();
  const appSecret = Deno.env.get("LARK_APP_SECRET")?.trim();
  if (!appId || !appSecret) return redirectToAdmin(state, false, "Chưa có cấu hình Lark trên máy chủ.");

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stateHash = await sha256(state);
  const { data: stateRow, error: stateError } = await admin
    .from("form_lark_oauth_states")
    .select("code_verifier,expires_at")
    .eq("state_hash", stateHash)
    .maybeSingle();
  await admin.from("form_lark_oauth_states").delete().eq("state_hash", stateHash);
  if (stateError || !stateRow) return redirectToAdmin(state, false, "Phiên kết nối không tồn tại hoặc đã được sử dụng.");
  if (new Date(stateRow.expires_at).getTime() < Date.now()) return redirectToAdmin(state, false, "Phiên kết nối đã hết hạn. Vui lòng kết nối lại.");

  const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/form-lark-oauth-callback`;
  const response = await fetch("https://open.larksuite.com/open-apis/authen/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: callback,
      code_verifier: stateRow.code_verifier,
    }),
  });
  const token = await response.json();
  if (!response.ok || String(token.code ?? "0") !== "0" || !token.access_token || !token.refresh_token) {
    return redirectToAdmin(state, false, token.error_description || token.msg || token.error || response.statusText);
  }

  const now = Date.now();
  const { error: saveError } = await admin.from("form_lark_oauth_credentials").upsert({
    id: true,
    mailbox_email: FORM_MAILBOX,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    access_token_expires_at: new Date(now + Number(token.expires_in || 7200) * 1000).toISOString(),
    refresh_token_expires_at: token.refresh_token_expires_in
      ? new Date(now + Number(token.refresh_token_expires_in) * 1000).toISOString()
      : null,
    granted_scopes: token.scope || null,
    updated_at: new Date().toISOString(),
  });
  if (saveError) return redirectToAdmin(state, false, saveError.message);
  return redirectToAdmin(state, true, `${FORM_MAILBOX} đã được cấp quyền thành công.`);
});
