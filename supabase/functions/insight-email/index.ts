import { createClient } from "npm:@supabase/supabase-js@2";
import { deliverInsightClaim } from "../_shared/insight-delivery.ts";
import { selectedAudienceIds, selectedAudienceSnapshot } from "../_shared/insight-selection.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { buildInsightEmail, INSIGHT_EMAIL_TEMPLATE_VERSION } from "../_shared/email-template.ts";
import type { InsightPost } from "../_shared/email-template.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";

const SENDER = "infor@facs.vn";
const TO = [{ mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" }];
const CC = [
  { mail_address: "yendoan@facs.vn", name: "Yen Doan" },
  { mail_address: "thanhhuynh@facs.vn", name: "Thanh Huynh" },
];
const EMAIL_REVIEW_SCHEMA_VERSION = "2026-08-26-v1";
type AdminClient = ReturnType<typeof createClient<any>>;
type InsightEmailPost = InsightPost & Record<string, any>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify({ server_now: new Date().toISOString(), ...(body as Record<string, unknown>) }), {
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
  if (error) throw new Error(`Không thể đọc bài viết: ${error.message}`);
  if (!data) throw new Error("Không tìm thấy bài viết.");
  return data as InsightEmailPost;
}

async function emailContentHash(post: InsightEmailPost, siteUrl: string) {
  const snapshot = JSON.stringify({
    review_schema: EMAIL_REVIEW_SCHEMA_VERSION,
    template_version: INSIGHT_EMAIL_TEMPLATE_VERSION,
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

function recipientSummary(bccCount: number, cc = CC.map((item) => item.mail_address)) {
  return {
    sender: SENDER,
    to: TO.map((item) => item.mail_address),
    cc,
    bcc_count: bccCount,
    total_recipients: bccCount + TO.length + cc.length,
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

    if (action === "workflow_status") {
      return json({ post: await loadPost(admin, String(body.post_id || "")) });
    }

    if (action === "preview" || action === "preview_single" || action === "preview_selected") {
      const post = await loadPost(admin, String(body.post_id || ""));
      if (post.email_notification_status === "processing") throw new Error("Bài viết đang có lượt gửi. Vui lòng chờ hoàn tất.");
      const hash = await emailContentHash(post, siteUrl);
      const email = buildInsightEmail(post, siteUrl, false);
      if (action === "preview_selected") {
        if (post.email_delivery_mode === "disabled" || post.status !== "published" || !post.published_at || Date.parse(post.published_at) > Date.now()) {
          throw new Error("Chỉ được gửi bài viết đã xuất bản và cho phép gửi email.");
        }
        const ids = selectedAudienceIds(body.audience_ids);
        const { data, error } = await admin.from("insight_email_audience").select("id,email,display_name,status").in("id", ids).order("email");
        if (error) throw new Error(`Không thể tải khách đã chọn: ${error.message}`);
        const snapshot = selectedAudienceSnapshot(ids, data || []);
        return json({ ok: true, post_id: post.id, preview_hash: hash, subject: email.subject,
          body_html: email.html, contacts: snapshot.contacts, recipients: { ...recipientSummary(snapshot.bcc.length), bcc: snapshot.bcc } });
      }
      if (action === "preview_single") {
        if (post.email_delivery_mode === "disabled") throw new Error("Bài viết đang ở chế độ Không gửi email.");
        if (post.status !== "published" || !post.published_at || Date.parse(post.published_at) > Date.now()) {
          throw new Error("Chỉ được gửi riêng bài viết đã xuất bản công khai.");
        }
        const { data: contact, error } = await admin.from("insight_email_audience")
          .select("id,email,display_name,status").eq("id", String(body.audience_id || "")).single();
        const address = String(contact?.email || "").trim().toLowerCase();
        if (error || contact?.status !== "subscribed" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
          || [SENDER, ...TO.map((item) => item.mail_address), ...CC.map((item) => item.mail_address)].includes(address)) {
          throw new Error("Khách hàng không còn trong danh sách đang nhận hoặc địa chỉ không hợp lệ.");
        }
        return json({ ok: true, post_id: post.id, preview_hash: hash, subject: email.subject,
          body_html: email.html, contact: { ...contact, email: address },
          recipients: { ...recipientSummary(1, []), bcc: [address] } });
      }
      const bcc = await getAudienceRecipients(admin);
      const keepTest = post.email_notification_test_hash === hash;
      const { data: reviewed, error } = await admin.from("posts").update({
        email_notification_previewed_at: new Date().toISOString(),
        email_notification_preview_hash: hash,
        ...(!keepTest ? { email_notification_tested_at: null, email_notification_test_hash: null } : {}),
        email_notification_confirmed_at: null,
        email_notification_confirmed_by: null,
      }).eq("id", post.id).select("*").single();
      if (error) throw new Error(`Không thể lưu trạng thái xem trước: ${error.message}`);
      return json({ ok: true, post_id: post.id, post: reviewed, preview_hash: hash,
        subject: email.subject, body_html: email.html, recipients: recipientSummary(bcc.length),
        warnings: bcc.length === 0 ? ["Danh sách Audience chưa có khách hàng đang ở trạng thái subscribed."] : [] });
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
          const { data: tested, error: stateError } = await admin.from("posts").update({
            email_notification_tested_at: new Date().toISOString(),
            email_notification_test_hash: hash,
            email_notification_confirmed_at: null,
            email_notification_confirmed_by: null,
          }).eq("id", post.id).select("*").single();
          if (stateError) throw new Error(`Email thử đã gửi nhưng chưa lưu được trạng thái: ${stateError.message}`);
          post = tested as InsightEmailPost;
        }
        return json({
          ok: true,
          post,
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

    if (action === "confirm_send" || action === "confirm_single" || action === "confirm_selected") {
      const single = action === "confirm_single";
      const selected = action === "confirm_selected";
      if (String(body.confirmation_text || "") !== (single ? "SEND-SINGLE" : selected ? "SEND-SELECTED" : "SEND-AUDIENCE")) {
        throw new Error("Thiếu xác nhận gửi email.");
      }
      const post = await loadPost(admin, String(body.post_id || ""));
      const currentHash = await emailContentHash(post, siteUrl);
      if ((single || selected) && String(body.preview_hash || "") !== currentHash) {
        throw new Error("Nội dung bài viết đã thay đổi. Hãy mở lại xác nhận gửi.");
      }
      const requestId = String(body.request_id || crypto.randomUUID());
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
        throw new Error("Mã lượt gửi không hợp lệ.");
      }
      const selectionIds = selected ? selectedAudienceIds(body.audience_ids) : null;
      if (selected && (!Array.isArray(body.expected_bcc) || !body.expected_bcc.length || body.expected_bcc.length > 497 || body.expected_bcc.some((email: unknown) => typeof email !== "string"))) {
        throw new Error("Thiếu danh sách Bcc đã xem trước. Hãy chọn lại khách hàng.");
      }
      const { data: claim, error: claimError } = await admin.rpc(selected ? "claim_insight_email_selected_delivery" : "claim_insight_email_delivery", {
        p_post_id: post.id, p_confirmed_by: user.id, p_expected_hash: currentHash,
        p_expected_updated_at: post.updated_at, p_request_id: requestId,
        ...(selected ? { p_audience_ids: selectionIds, p_expected_bcc: body.expected_bcc }
          : { p_audience_id: single ? String(body.audience_id || "") : null }),
      });
      if (claimError) throw new Error(claimError.message);
      const result = await deliverInsightClaim(claim, {
        send: async (recipients) => {
          const token = await getMicrosoftGraphToken();
          const email = buildInsightEmail(claim.post as InsightEmailPost, siteUrl, false);
          return sendMicrosoftMail({ accessToken: token, senderEmail: SENDER, senderName: "FACS Insights",
            subject: email.subject, bodyHtml: email.html, to: TO, ...recipients,
            replyTo: [{ mail_address: SENDER, name: "FACS Insights" }] });
        },
        finalize: async (sent) => {
          const { error } = await admin.rpc("finalize_insight_email_delivery", {
            p_post_id: post.id, p_log_id: claim.log_id,
            p_message_id: sent.message_id || null, p_thread_id: sent.thread_id || null,
          });
          if (error) throw new Error(`Không thể chốt trạng thái gửi: ${error.message}`);
        },
        fail: async (message) => {
          const { error } = await admin.rpc("fail_insight_email_delivery", {
            p_post_id: post.id, p_log_id: claim.log_id, p_error: message,
          });
          if (error) throw new Error(`${message}. Chưa thể lưu trạng thái lỗi; hãy kiểm tra nhật ký trước khi thử lại.`);
        },
      });
      return json({ ok: true, result, recipients: recipientSummary(claim.bcc.length, claim.cc) });
    }

    return json({ error: "Action không hợp lệ" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
