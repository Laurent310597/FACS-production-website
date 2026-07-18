import { createClient } from "npm:@supabase/supabase-js@2";
import { FORM_MAILBOX } from "../_shared/form-lark.ts";

function page(title: string, message: string, ok = false) {
  const color = ok ? "#67e8f9" : "#fca5a5";
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0d1726;color:#fff;font-family:Arial,sans-serif;padding:24px;"><div style="max-width:620px;border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:36px;background:rgba(255,255,255,.05);box-shadow:0 30px 90px rgba(0,0,0,.35);"><div style="font-size:13px;font-weight:700;letter-spacing:.18em;color:${color};text-transform:uppercase;">FACS Email Automation</div><h1 style="font-size:32px;margin:14px 0;">${title}</h1><p style="line-height:1.7;color:#cbd5e1;">${message}</p><a href="https://facs.vn/admin/form-email" style="display:inline-block;margin-top:18px;padding:12px 18px;border-radius:14px;background:#67e8f9;color:#071421;text-decoration:none;font-weight:700;">Trở lại trang quản trị</a></div></body></html>`, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
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
  if (oauthError) return page("Không thể kết nối Lark", `Lark từ chối cấp quyền: ${oauthError}`);
  if (!code || !state) return page("Thiếu dữ liệu OAuth", "Không nhận được code hoặc state từ Lark.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appId = Deno.env.get("LARK_APP_ID")?.trim();
  const appSecret = Deno.env.get("LARK_APP_SECRET")?.trim();
  if (!appId || !appSecret) return page("Thiếu cấu hình Lark", "Edge Function chưa có LARK_APP_ID hoặc LARK_APP_SECRET.");

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stateHash = await sha256(state);
  const { data: stateRow, error: stateError } = await admin
    .from("form_lark_oauth_states")
    .select("code_verifier,expires_at")
    .eq("state_hash", stateHash)
    .maybeSingle();
  await admin.from("form_lark_oauth_states").delete().eq("state_hash", stateHash);
  if (stateError || !stateRow) return page("OAuth state không hợp lệ", "Phiên kết nối không tồn tại hoặc đã được sử dụng.");
  if (new Date(stateRow.expires_at).getTime() < Date.now()) return page("OAuth state đã hết hạn", "Vui lòng quay lại Admin và kết nối lại.");

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
    return page("Lark token exchange thất bại", token.error_description || token.msg || token.error || response.statusText);
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
  if (saveError) return page("Không thể lưu kết nối", saveError.message);
  return page("Kết nối Lark thành công", `${FORM_MAILBOX} đã được cấp quyền. Bây giờ hãy gửi thử từ hr@facs.vn và contact@facs.vn trong Admin.`, true);
});
