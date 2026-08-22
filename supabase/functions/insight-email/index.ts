import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildInsightEmail } from "../_shared/email-template.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";

const SENDER = "infor@facs.vn";
const TO = [{ mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" }];
const CC = [
  { mail_address: "yendoan@facs.vn", name: "Yen Doan" },
  { mail_address: "thanhhuynh@facs.vn", name: "Thanh Huynh" },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

async function createLog(admin: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  const { data, error } = await admin.from("insight_email_delivery_logs").insert(payload).select("id").single();
  if (error) throw new Error(`Không thể tạo email log: ${error.message}`);
  return data.id as string;
}

async function finishLog(admin: ReturnType<typeof createClient>, id: string, payload: Record<string, unknown>) {
  await admin.from("insight_email_delivery_logs").update({ ...payload, completed_at: new Date().toISOString() }).eq("id", id);
}

async function markPostFailure(admin: ReturnType<typeof createClient>, postId: string, message: string) {
  await admin.from("posts").update({
    email_notification_status: "failed",
    email_notification_last_error: message.slice(0, 2000),
    email_notification_processing_at: null,
    email_notification_next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }).eq("id", postId);
}

async function processPost(admin: ReturnType<typeof createClient>, post: Record<string, any>, siteUrl: string) {
  const { data: audience, error: audienceError } = await admin
    .from("insight_email_audience")
    .select("email,display_name")
    .eq("status", "subscribed")
    .order("email");

  if (audienceError) throw new Error(`Không thể tải audience: ${audienceError.message}`);
  const bcc = (audience || [])
    .map((item) => ({ mail_address: String(item.email).trim().toLowerCase(), name: item.display_name || undefined }))
    .filter((item) => item.mail_address && ![SENDER, ...TO.map((x) => x.mail_address), ...CC.map((x) => x.mail_address)].includes(item.mail_address));

  const uniqueBcc = Array.from(new Map(bcc.map((item) => [item.mail_address, item])).values());
  if (uniqueBcc.length === 0) throw new Error("Danh sách BCC chưa có khách hàng đang ở trạng thái subscribed.");
  if (uniqueBcc.length + TO.length + CC.length > 500) throw new Error("Tổng số người nhận vượt giới hạn 500 của Microsoft 365. Vui lòng giảm audience trước khi gửi.");

  const logId = await createLog(admin, {
    post_id: post.id,
    delivery_type: "notification",
    status: "processing",
    sender_email: SENDER,
    to_addresses: TO.map((item) => item.mail_address),
    cc_addresses: CC.map((item) => item.mail_address),
    bcc_count: uniqueBcc.length,
  });

  try {
    const token = await getMicrosoftGraphToken();
    const email = buildInsightEmail(post, siteUrl, false);
    const result = await sendMicrosoftMail({
        accessToken: token,
        senderEmail: SENDER,
        senderName: "FACS Insights",
        subject: email.subject,
        bodyHtml: email.html,
        to: TO,
        cc: CC,
        bcc: uniqueBcc,
        replyTo: [{ mail_address: SENDER, name: "FACS Insights" }],
        dedupeKey: `facs-insight-${post.id}`,
      });

    await admin.from("posts").update({
      email_notification_status: "sent",
      email_notification_sent_at: new Date().toISOString(),
      email_notification_processing_at: null,
      email_notification_next_attempt_at: null,
      email_notification_last_error: null,
      email_notification_message_id: result.message_id || post.email_notification_message_id || null,
      email_notification_thread_id: result.thread_id || post.email_notification_thread_id || null,
    }).eq("id", post.id);

    await finishLog(admin, logId, {
      status: "sent",
      lark_message_id: result.message_id || null,
      lark_thread_id: result.thread_id || null,
    });
    return { post_id: post.id, status: "sent", bcc_count: uniqueBcc.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markPostFailure(admin, post.id, message);
    await finishLog(admin, logId, { status: "failed", error_message: message.slice(0, 2000) });
    return { post_id: post.id, status: "failed", error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").trim();
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const cronSecret = Deno.env.get("FACS_CRON_SECRET") || "";
    const cronAuthorized = Boolean(cronSecret && req.headers.get("x-facs-cron-secret") === cronSecret);

    if (action === "process") {
      if (!cronAuthorized) await requireAdmin(req, admin);
      const postId = body.post_id ? String(body.post_id) : null;
      const { data: claimed, error } = await admin.rpc("claim_due_insight_emails", {
        p_post_id: postId,
        p_limit: postId ? 1 : 10,
      });
      if (error) throw new Error(`Không thể claim email đến hạn: ${error.message}`);

      const results = [];
      for (const post of claimed || []) results.push(await processPost(admin, post, siteUrl));
      return json({ ok: true, processed: results.length, results });
    }

    await requireAdmin(req, admin);

    if (action === "oauth_status") {
      return json({ ...getMicrosoftMailStatus(), mailbox_email: SENDER });
    }

    if (action === "test") {
      const postId = String(body.post_id || "");
      if (!postId) return json({ error: "Thiếu post_id" }, 400);
      const { data: post, error } = await admin.from("posts").select("*").eq("id", postId).single();
      if (error || !post) return json({ error: "Không tìm thấy bài viết" }, 404);

      const logId = await createLog(admin, {
        post_id: post.id,
        delivery_type: "test",
        status: "processing",
        sender_email: SENDER,
        to_addresses: TO.map((item) => item.mail_address),
        cc_addresses: [],
        bcc_count: 0,
      });

      try {
        const token = await getMicrosoftGraphToken();
        const email = buildInsightEmail(post, siteUrl, true);
        const result = await sendMicrosoftMail({
          accessToken: token,
          senderEmail: SENDER,
          senderName: "FACS Insights",
          subject: email.subject,
          bodyHtml: email.html,
          to: TO,
          cc: [],
          bcc: [],
          replyTo: [{ mail_address: SENDER, name: "FACS Insights" }],
          dedupeKey: `facs-insight-test-${post.id}-${Date.now()}`,
        });
        await finishLog(admin, logId, {
          status: "sent",
          lark_message_id: result.message_id || null,
          lark_thread_id: result.thread_id || null,
        });
        return json({ ok: true, to: TO[0].mail_address });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await finishLog(admin, logId, { status: "failed", error_message: message.slice(0, 2000) });
        throw error;
      }
    }

    return json({ error: "Action không hợp lệ" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
