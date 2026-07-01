import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type CredentialRow = {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string | null;
};

const TOKEN_URL = "https://open.larksuite.com/open-apis/authen/v2/oauth/token";

export async function getValidLarkAccessToken(admin: SupabaseClient) {
  const appId = Deno.env.get("LARK_APP_ID")?.trim();
  const appSecret = Deno.env.get("LARK_APP_SECRET")?.trim();
  if (!appId || !appSecret) throw new Error("Thiếu LARK_APP_ID hoặc LARK_APP_SECRET trong Edge Function Secrets.");

  const { data, error } = await admin
    .from("lark_oauth_credentials")
    .select("access_token,refresh_token,access_token_expires_at,refresh_token_expires_at")
    .eq("id", true)
    .maybeSingle<CredentialRow>();

  if (error) throw new Error(`Không thể đọc Lark OAuth credential: ${error.message}`);
  if (!data) throw new Error("Mailbox info@facs.vn chưa được kết nối Lark OAuth.");

  const expiresAt = new Date(data.access_token_expires_at).getTime();
  if (expiresAt > Date.now() + 5 * 60 * 1000) return data.access_token;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: appSecret,
      refresh_token: data.refresh_token,
    }),
  });

  const token = await response.json();
  if (!response.ok || String(token.code ?? "0") !== "0" || !token.access_token) {
    throw new Error(`Lark không thể làm mới token: ${token.error_description || token.msg || token.error || response.statusText}`);
  }

  const now = Date.now();
  const { error: updateError } = await admin.from("lark_oauth_credentials").upsert({
    id: true,
    mailbox_email: "info@facs.vn",
    access_token: token.access_token,
    refresh_token: token.refresh_token || data.refresh_token,
    access_token_expires_at: new Date(now + Number(token.expires_in || 7200) * 1000).toISOString(),
    refresh_token_expires_at: token.refresh_token_expires_in
      ? new Date(now + Number(token.refresh_token_expires_in) * 1000).toISOString()
      : data.refresh_token_expires_at,
    granted_scopes: token.scope || null,
    updated_at: new Date().toISOString(),
  });

  if (updateError) throw new Error(`Không thể lưu token Lark mới: ${updateError.message}`);
  return token.access_token as string;
}

export type LarkMailAddress = { mail_address: string; name?: string };

export async function sendLarkMail(params: {
  accessToken: string;
  subject: string;
  bodyHtml: string;
  bodyPlainText: string;
  to: LarkMailAddress[];
  cc: LarkMailAddress[];
  bcc: LarkMailAddress[];
  dedupeKey: string;
}) {
  const response = await fetch("https://open.larksuite.com/open-apis/mail/v1/user_mailboxes/info%40facs.vn/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      subject: params.subject,
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      body_html: params.bodyHtml,
      body_plain_text: params.bodyPlainText,
      dedupe_key: params.dedupeKey,
      head_from: { mail_address: "info@facs.vn", name: "FACS Insights" },
    }),
  });

  const payload = await response.json();
  if (!response.ok || Number(payload.code) !== 0) {
    const error = new Error(payload.msg || `Lark Mail API error ${response.status}`) as Error & { code?: number };
    error.code = Number(payload.code || response.status);
    throw error;
  }
  return payload.data as { message_id?: string; thread_id?: string };
}
