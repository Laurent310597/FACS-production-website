import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildRawEmail } from "../_shared/mime-message.ts";
import { FORM_MAILBOX, getValidFormLarkToken, sendFormLarkMail } from "../_shared/form-lark.ts";
import { sendSubmissionEmails } from "../_shared/submission-mailer.ts";

const PUBLIC_MAILBOXES = ["hr@facs.vn", "contact@facs.vn"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function allowedSiteOrigin(candidate: string | null, fallback: string) {
  try {
    const url = new URL(candidate || fallback);
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

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

async function oauthUrl(admin: ReturnType<typeof createClient>, returnUrl: string) {
  const appId = Deno.env.get("LARK_APP_ID")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  if (!appId || !supabaseUrl) throw new Error("Thiếu LARK_APP_ID hoặc SUPABASE_URL.");

  const encodedReturnUrl = base64Url(new TextEncoder().encode(returnUrl));
  const state = `${encodedReturnUrl}.${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  const verifierBytes = crypto.getRandomValues(new Uint8Array(48));
  const codeVerifier = base64Url(verifierBytes);
  const challengeBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier)));
  const { error } = await admin.from("form_lark_oauth_states").insert({
    state_hash: await sha256(state),
    code_verifier: codeVerifier,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
  if (error) throw new Error(`Không thể tạo phiên kết nối Lark: ${error.message}`);

  const callback = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/form-lark-oauth-callback`;
  const url = new URL("https://accounts.larksuite.com/open-apis/authen/v1/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("scope", "mail:user_mailbox.message:send offline_access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", base64Url(challengeBytes));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").replace(/\/$/, "");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    await requireAdmin(req, admin);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "oauth_url") {
      const returnUrl = allowedSiteOrigin(req.headers.get("origin"), siteUrl);
      return json({ url: await oauthUrl(admin, returnUrl) });
    }

    if (action === "oauth_status") {
      const { data, error } = await admin
        .from("form_lark_oauth_credentials")
        .select("mailbox_email,access_token_expires_at,refresh_token_expires_at,granted_scopes,updated_at")
        .eq("id", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return json({ connected: Boolean(data), mailbox_email: data?.mailbox_email || FORM_MAILBOX, public_mailboxes: PUBLIC_MAILBOXES, updated_at: data?.updated_at || null });
    }

    if (action === "oauth_disconnect") {
      const { error } = await admin.from("form_lark_oauth_credentials").delete().eq("id", true);
      if (error) throw new Error(error.message);
      return json({ ok: true });
    }

    if (action === "test") {
      const senderEmail = String(body.sender_email || "").toLowerCase();
      if (!PUBLIC_MAILBOXES.includes(senderEmail)) return json({ error: "Hộp thư công khai gửi thử không hợp lệ." }, 400);
      const senderName = senderEmail === "hr@facs.vn" ? "FACS Careers" : "FACS Contact";
      const token = await getValidFormLarkToken(admin);
      const testTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const raw = buildRawEmail({
        from: senderEmail,
        fromName: senderName,
        to: [{ mail_address: FORM_MAILBOX, name: "Tu Nguyen" }],
        replyTo: senderEmail,
        subject: `[TEST] Kiểm tra gửi từ ${senderEmail}`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>Kiểm tra FACS Email Automation</h2><p>Email thử đã được gửi thành công từ <strong>${senderEmail}</strong>.</p><p>Thời gian: ${testTime}</p></div>`,
        plainText: `Kiểm tra FACS Email Automation\n\nEmail thử đã được gửi thành công từ ${senderEmail}.\nThời gian: ${testTime}`,
      });
      const result = await sendFormLarkMail({
        accessToken: token,
        raw,
        senderEmail,
        senderName,
        dedupeKey: `facs-form-test-${Date.now()}`,
      });
      await admin.from("submission_email_logs").insert({
        delivery_type: "test",
        status: "sent",
        authenticated_mailbox: FORM_MAILBOX,
        sender_email: senderEmail,
        to_addresses: [FORM_MAILBOX],
        lark_message_id: result.message_id || null,
        lark_thread_id: result.thread_id || null,
        completed_at: new Date().toISOString(),
      });
      return json({ ok: true, to: FORM_MAILBOX, sender_email: senderEmail });
    }

    if (action === "retry") {
      const type = String(body.type || "");
      const id = String(body.id || "");
      const delivery = String(body.delivery || "");
      if (!['career', 'contact'].includes(type) || !['internal', 'receipt'].includes(delivery)) {
        return json({ error: "Yêu cầu gửi lại không hợp lệ." }, 400);
      }
      const table = type === "career" ? "career_applications" : "contact_inquiries";
      const { data: row, error } = await admin.from(table).select("*").eq("id", id).single();
      if (error || !row) return json({ error: "Không tìm thấy dữ liệu cần gửi lại." }, 404);
      const results = await sendSubmissionEmails({
        admin,
        type: type as "career" | "contact",
        row,
        siteUrl,
        only: delivery as "internal" | "receipt",
      });
      return json({ ok: true, results });
    }

    return json({ error: "Action không hợp lệ." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
