import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildInsightEmail } from "../_shared/email-template.ts";
import type { InsightPost } from "../_shared/email-template.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";

const SENDER = "infor@facs.vn";
const TO = [{ mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" }];
const CC = [
  { mail_address: "yendoan@facs.vn", name: "Yen Doan" },
  { mail_address: "thanhhuynh@facs.vn", name: "Thanh Huynh" },
];
const TEST_VALIDITY_MS = 24 * 60 * 60 * 1000;
const EMAIL_REVIEW_SCHEMA_VERSION = "2026-08-26-v1";
type AdminClient = ReturnType<typeof createClient<any>>;
type InsightEmailPost = InsightPost & Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function requireAdmin(req: Request, admin: AdminClient) {
  const authorization = req.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

async function loadPost(admin: AdminClient, postId: string) {
  if (!postId) throw new Error("Vui lòng chọn bài viết.");
  const { data, error } = await admin.from("posts").select("*").eq("id", postId).single();
  if (error || !data) throw new Error("Không tìm thấy bài viết.");
  return data as InsightEmailPost;
}

async function emailContentHash(post: InsightEmailPost, siteUrl: string) {
  const snapshot = JSON.stringify({
    review_schema: EMAIL_REVIEW_SCHEMA_VERSION,
    id: post.id,
    title_vi: post.title_vi || "",
    title_en: post.title_en || "",
    excerpt_vi: post.excerpt_vi || "",
    excerpt_en: post.excerpt_en || "",
    slug: post.slug || "",
    slug_vi: post.slug_vi || "",
    slug_en: post.slug_en || "",
    status: post.status || "",
    published_at: post.published_at || "",
    site_url: siteUrl,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getAudienceRecipients(admin: AdminClient) {
  const { data: audience, error } = await admin
    .from("insight_email_audience")
    .select("email,display_name")
    .eq("status", "subscribed")
    .order("email");
  if (error) throw new Error(`Không thể tải audience: ${error.message}`);

  const excluded = new Set([SENDER, ...TO.map((item) => item.mail_address), ...CC.map((item) => item.mail_address)]);
  const normalized = (audience || [])
    .map((item) => ({
      mail_address: String(item.email || "").trim().toLowerCase(),
      name: item.display_name || undefined,
    }))
    .filter((item) => item.mail_address && !excluded.has(item.mail_address));
  return Array.from(new Map(normalized.map((item) => [item.mail_address, item])).values());
}

function recipientSummary(bccCount: number) {
  return {
    sender: SENDER,
    to: TO.map((item) => item.mail_address),
    cc: CC.map((item) => item.mail_address),
    bcc_count: bccCount,
    total_recipients: bccCount + TO.length + CC.length,
  };
}

async function createLog(admin: AdminClient, payload: Record<string, unknown>) {
  const { data, error } = await admin.from("insight_email_delivery_logs").insert(payload).select("id").single();
  if (error) throw new Error(`Không thể tạo email log: ${error.message}`);
  return data.id as string;
}

async function finishLog(admin: AdminClient, id: string, payload: Record<string, unknown>) {
  await admin.from("insight_email_delivery_logs").update({ ...payload, completed_at: new Date().toISOString() }).eq("id", id);
}

async function markPostFailure(admin: AdminClient, postId: string, message: string) {
  await admin.from("posts").update({
    email_notification_status: "failed",
    email_notification_last_error: message.slice(0, 2000),
    email_notification_processing_at: null,
    email_notification_next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }).eq("id", postId);
}

async function processPost(admin: AdminClient, post: InsightEmailPost, siteUrl: string) {
  let logId: string | null = null;
  let graphAccepted = false;
  try {
    const uniqueBcc = await getAudienceRecipients(admin);
    if (uniqueBcc.length === 0) throw new Error("Danh sách BCC chưa có khách hàng đang ở trạng thái subscribed.");
    if (uniqueBcc.length + TO.length + CC.length > 500) throw new Error("Tổng số người nhận vượt giới hạn 500 của Microsoft 365. Vui lòng giảm audience trước khi gửi.");

    logId = await createLog(admin, {
      post_id: post.id,
      delivery_type: "notification",
      status: "processing",
      sender_email: SENDER,
      to_addresses: TO.map((item) => item.mail_address),
      cc_addresses: CC.map((item) => item.mail_address),
      bcc_count: uniqueBcc.length,
    });

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
    graphAccepted = true;

    const { error: finalizeError } = await admin.rpc("finalize_insight_email_delivery", {
      p_post_id: post.id,
      p_log_id: logId,
      p_message_id: result.message_id || null,
      p_thread_id: result.thread_id || null,
    });
    if (finalizeError) throw new Error(`Microsoft 365 đã nhận email nhưng không thể chốt trạng thái: ${finalizeError.message}`);
    return { post_id: post.id, status: "sent", bcc_count: uniqueBcc.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (graphAccepted) {
      // The Graph API accepted the email. Keep the post in "processing" so neither
      // cron nor an admin can send it again before a human verifies Sent Items.
      return {
        post_id: post.id,
        status: "manual_review",
        error: `${message}. Hệ thống đã khóa gửi lại; hãy kiểm tra Sent Items và log trước khi xử lý thủ công.`,
      };
    }
    await markPostFailure(admin, post.id, message);
    if (logId) {
      await finishLog(admin, logId, { status: "failed", error_message: message.slice(0, 2000) });
    } else {
      try {
        const failedLogId = await createLog(admin, {
          post_id: post.id,
          delivery_type: "notification",
          status: "failed",
          sender_email: SENDER,
          to_addresses: TO.map((item) => item.mail_address),
          cc_addresses: CC.map((item) => item.mail_address),
          bcc_count: 0,
          error_message: message.slice(0, 2000),
        });
        await finishLog(admin, failedLogId, {});
      } catch {
        // The post failure state remains authoritative if logging also fails.
      }
    }
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

    const user = await requireAdmin(req, admin);

    if (action === "oauth_status") {
      return json({ ...getMicrosoftMailStatus(), mailbox_email: SENDER });
    }

    if (action === "preview") {
      const post = await loadPost(admin, String(body.post_id || ""));
      const hash = await emailContentHash(post, siteUrl);
      const bcc = await getAudienceRecipients(admin);
      const email = buildInsightEmail(post, siteUrl, false);

      await admin.from("posts").update({
        email_notification_previewed_at: new Date().toISOString(),
        email_notification_preview_hash: hash,
        email_notification_tested_at: null,
        email_notification_test_hash: null,
        email_notification_confirmed_at: null,
        email_notification_confirmed_by: null,
      }).eq("id", post.id);

      return json({
        ok: true,
        post_id: post.id,
        preview_hash: hash,
        subject: email.subject,
        body_html: email.html,
        recipients: recipientSummary(bcc.length),
        warnings: bcc.length === 0 ? ["Danh sách Audience chưa có khách hàng đang ở trạng thái subscribed."] : [],
      });
    }

    if (action === "test") {
      const postId = String(body.post_id || "");
      let post: InsightEmailPost | null = null;
      if (postId) {
        post = await loadPost(admin, postId);
        const currentHash = await emailContentHash(post, siteUrl);
        if (!post.email_notification_preview_hash || post.email_notification_preview_hash !== currentHash) {
          throw new Error("Nội dung chưa được xem trước hoặc đã thay đổi. Vui lòng xem trước email lại trước khi gửi thử.");
        }
      }

      const logId = await createLog(admin, {
        post_id: post?.id || null,
        delivery_type: "test",
        status: "processing",
        sender_email: SENDER,
        to_addresses: TO.map((item) => item.mail_address),
        cc_addresses: [],
        bcc_count: 0,
      });

      try {
        const token = await getMicrosoftGraphToken();
        const email = post
          ? buildInsightEmail(post, siteUrl, true)
          : {
              subject: `[TEST] Kiểm tra gửi từ ${SENDER}`,
              html: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>Kiểm tra FACS Insights Email</h2><p>Email thử đã được gửi thành công từ <strong>${SENDER}</strong> qua Microsoft 365.</p><p>Thời gian: ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div>`,
            };
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
          dedupeKey: `facs-insight-test-${post?.id || "mailbox"}-${Date.now()}`,
        });
        await finishLog(admin, logId, {
          status: "sent",
          lark_message_id: result.message_id || null,
          lark_thread_id: result.thread_id || null,
        });
        if (post) {
          const hash = await emailContentHash(post, siteUrl);
          await admin.from("posts").update({
            email_notification_tested_at: new Date().toISOString(),
            email_notification_test_hash: hash,
            email_notification_confirmed_at: null,
            email_notification_confirmed_by: null,
          }).eq("id", post.id);
        }
        return json({
          ok: true,
          post_id: post?.id || null,
          to: TO[0].mail_address,
          test_hash: post ? await emailContentHash(post, siteUrl) : null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await finishLog(admin, logId, { status: "failed", error_message: message.slice(0, 2000) });
        throw error;
      }
    }

    if (action === "confirm_send") {
      if (String(body.confirmation_text || "") !== "SEND-AUDIENCE") {
        throw new Error("Thiếu xác nhận gửi Audience.");
      }

      const post = await loadPost(admin, String(body.post_id || ""));
      if (post.email_delivery_mode === "disabled") {
        throw new Error("Bài viết đang ở chế độ Không gửi email.");
      }
      if (post.email_notification_status === "sent") {
        throw new Error("Email của bài viết này đã được gửi. Hệ thống không cho phép gửi lặp lại.");
      }
      if (post.email_notification_status === "processing") {
        throw new Error("Email đang được xử lý. Vui lòng không gửi lặp lại.");
      }
      if (post.status !== "published" || !post.published_at || new Date(post.published_at).getTime() > Date.now()) {
        throw new Error("Chỉ được gửi Audience sau khi bài viết đã được xuất bản công khai.");
      }

      const currentHash = await emailContentHash(post, siteUrl);
      if (!post.email_notification_preview_hash || post.email_notification_preview_hash !== currentHash) {
        throw new Error("Bản xem trước không còn khớp với bài viết hiện tại. Vui lòng xem trước lại.");
      }
      if (!post.email_notification_test_hash || post.email_notification_test_hash !== currentHash) {
        throw new Error("Email thử không còn khớp với bài viết hiện tại. Vui lòng gửi thử lại.");
      }
      const testedAt = post.email_notification_tested_at ? new Date(post.email_notification_tested_at).getTime() : 0;
      if (!testedAt || Date.now() - testedAt > TEST_VALIDITY_MS) {
        throw new Error("Lần gửi thử đã quá 24 giờ. Vui lòng xem trước và gửi thử lại.");
      }

      const bcc = await getAudienceRecipients(admin);
      if (bcc.length === 0) throw new Error("Danh sách Audience chưa có khách hàng đang ở trạng thái subscribed.");
      if (bcc.length + TO.length + CC.length > 500) {
        throw new Error("Tổng số người nhận vượt giới hạn 500 của Microsoft 365. Vui lòng giảm Audience trước khi gửi.");
      }

      const { data: claimed, error: claimError } = await admin.rpc("confirm_and_claim_insight_email", {
        p_post_id: post.id,
        p_confirmed_by: user.id,
        p_expected_hash: currentHash,
      });
      if (claimError) throw new Error(`Không thể xác nhận và khóa lượt gửi: ${claimError.message}`);
      if (!claimed?.length) throw new Error("Bài viết hoặc trạng thái kiểm duyệt vừa thay đổi. Vui lòng tải lại và thực hiện lại ba bước.");

      const result = await processPost(admin, claimed[0] as InsightEmailPost, siteUrl);
      if (result.status !== "sent") throw new Error(result.error || "Microsoft 365 không gửi được email.");
      return json({ ok: true, result, recipients: recipientSummary(bcc.length) });
    }

    return json({ error: "Action không hợp lệ" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
