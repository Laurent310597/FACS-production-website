import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { buildLegalCalendarEmail, legalEmailContentHash, MAX_BCC, normalizeAudience, parseMonth, pickRecipients, receivedThisMonth, sortLegalEvents } from "../_shared/legal-calendar-email.ts";
import type { LegalEmailEvent } from "../_shared/legal-calendar-email.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";

// Gửi khách hàng (BCC) các mốc pháp lý của một tháng từ infor@facs.vn.
// Luồng riêng, chỉ ĐỌC danh sách khách hàng của Insights; không ghi gì vào bảng/luồng Insights.
const SENDER = "infor@facs.vn";
const SENDER_NAME = "FACS Legal Calendar";
const TO = [{ mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" }];
const CC = [
  { mail_address: "yendoan@facs.vn", name: "Yen Doan" },
  { mail_address: "thanhhuynh@facs.vn", name: "Thanh Huynh" },
];
const MAX_RECIPIENTS = 500; // giới hạn mỗi email của Microsoft 365
const SEND_CONFIRMATION = "SEND-LEGAL-MONTH";
const STUCK_AFTER_MS = 30 * 60 * 1000;
const EVENT_FIELDS = "id,event_date,category,title_vi,title_en,summary_vi,summary_en,target_audience_vi,target_audience_en,period_label_vi,period_label_en,legal_basis_vi,legal_basis_en,official_source_url,status,verification_status";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AdminClient = ReturnType<typeof createClient<any>>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify({ server_now: new Date().toISOString(), ...(body as Record<string, unknown>) }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function requireAdmin(req: Request, admin: AdminClient) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

async function loadMonth(admin: AdminClient, monthKey: string) {
  const month = parseMonth(monthKey);
  const { data, error } = await admin.from("legal_calendar_events").select(EVENT_FIELDS)
    .gte("event_date", month.first).lte("event_date", month.last).order("event_date");
  if (error) throw new Error(`Không thể đọc mốc pháp lý: ${error.message}`);
  const rows = data || [];
  const events = sortLegalEvents(rows.filter((row) => row.status === "published" && row.verification_status === "verified") as LegalEmailEvent[]);
  return {
    month,
    events,
    excluded: {
      published_unverified: rows.filter((row) => row.status === "published" && row.verification_status !== "verified").length,
      draft: rows.filter((row) => row.status === "draft").length,
    },
  };
}

async function loadAudience(admin: AdminClient) {
  const { data, error } = await admin.from("insight_email_audience").select("id,email,display_name,company_name,created_at").eq("status", "subscribed").order("email");
  if (error) throw new Error(`Không thể tải danh sách khách hàng: ${error.message}`);
  return normalizeAudience(data || [], [SENDER, ...TO.map((item) => item.mail_address), ...CC.map((item) => item.mail_address)]);
}

/** Ai đã nhận (hoặc đang được gửi) email của tháng này. */
async function monthReceived(admin: AdminClient, first: string) {
  const { data, error } = await admin.from("legal_calendar_email_deliveries").select("status,bcc_addresses,completed_at,created_at")
    .eq("month", first).eq("delivery_type", "send").in("status", ["sent", "processing"]);
  if (error) throw new Error(`Không thể đọc danh sách đã nhận: ${error.message}`);
  return receivedThisMonth(data || []);
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

const LOG_FIELDS = "id,month,delivery_type,audience_scope,request_id,content_hash,event_count,status,sender_email,subject,to_addresses,cc_addresses,bcc_count,message_id,error_message,created_by,created_at,completed_at";

async function monthLogs(admin: AdminClient, first: string) {
  const { data, error } = await admin.from("legal_calendar_email_deliveries").select(LOG_FIELDS)
    .eq("month", first).order("created_at", { ascending: false }).limit(20);
  if (error) throw new Error(`Không thể đọc nhật ký gửi: ${error.message}`);
  return data || [];
}

async function finishLog(admin: AdminClient, id: string, payload: Record<string, unknown>) {
  const { error } = await admin.from("legal_calendar_email_deliveries")
    .update({ ...payload, completed_at: new Date().toISOString() }).eq("id", id);
  return error;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const siteUrl = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").trim();

  try {
    const user = await requireAdmin(req, admin);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "history") {
      const { data, error } = await admin.from("legal_calendar_email_deliveries").select(LOG_FIELDS)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw new Error(error.message);
      return json({ logs: data || [] });
    }

    if (action === "preview") {
      const { month, events, excluded } = await loadMonth(admin, body.month);
      const [audience, logs, received] = await Promise.all([loadAudience(admin), monthLogs(admin, month.first), monthReceived(admin, month.first)]);
      const hash = await legalEmailContentHash(month.key, events, siteUrl);
      const email = events.length ? buildLegalCalendarEmail(month.key, events, siteUrl, false) : null;
      const tested = logs.some((log) => log.delivery_type === "test" && log.status === "sent" && log.content_hash === hash);
      const warnings = [];
      if (!events.length) warnings.push("Tháng này chưa có mốc pháp lý đã xuất bản và đã xác minh.");
      if (excluded.published_unverified) warnings.push(`${excluded.published_unverified} mốc đang công khai nhưng chưa xác minh sẽ không có trong email.`);
      if (!audience.length) warnings.push("Danh sách khách hàng chưa có ai đang ở trạng thái nhận email.");
      if (audience.length > MAX_BCC) warnings.push(`Danh sách có ${audience.length} khách, vượt giới hạn ${MAX_RECIPIENTS} người nhận của Microsoft 365; hãy chọn từng nhóm để gửi.`);
      return json({
        month: month.key,
        events,
        excluded,
        content_hash: hash,
        subject: email?.subject || null,
        body_html: email?.html || null,
        recipients: recipientSummary(audience.length),
        audience: audience.map((contact) => ({ ...contact, received: received.get(contact.email) || null })),
        tested,
        logs,
        warnings,
        mail: { ...getMicrosoftMailStatus(), mailbox_email: SENDER },
      });
    }

    if (action === "test") {
      const { month, events } = await loadMonth(admin, body.month);
      const hash = await legalEmailContentHash(month.key, events, siteUrl);
      if (String(body.content_hash || "") !== hash) throw new Error("Nội dung các mốc vừa thay đổi. Hãy xem trước lại trước khi gửi thử.");
      const email = buildLegalCalendarEmail(month.key, events, siteUrl, true);
      const { data: log, error } = await admin.from("legal_calendar_email_deliveries").insert({
        month: month.first, delivery_type: "test", request_id: crypto.randomUUID(), content_hash: hash,
        event_count: events.length, status: "processing", sender_email: SENDER, subject: email.subject,
        to_addresses: TO.map((item) => item.mail_address), cc_addresses: [], bcc_count: 0, created_by: user.id,
      }).select("id").single();
      if (error) throw new Error(`Không thể ghi nhật ký gửi thử: ${error.message}`);
      try {
        const result = await sendMicrosoftMail({
          accessToken: await getMicrosoftGraphToken(), senderEmail: SENDER, senderName: SENDER_NAME,
          subject: email.subject, bodyHtml: email.html, to: TO, cc: [], bcc: [],
          replyTo: [{ mail_address: SENDER, name: SENDER_NAME }], dedupeKey: `facs-legal-test-${log.id}`,
        });
        await finishLog(admin, log.id, { status: "sent", message_id: result.message_id || null });
        return json({ ok: true, to: TO[0].mail_address, content_hash: hash });
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : String(sendError);
        await finishLog(admin, log.id, { status: "failed", error_message: message.slice(0, 2000) });
        throw sendError;
      }
    }

    if (action === "send") {
      if (body.confirmation_text !== SEND_CONFIRMATION) throw new Error("Thiếu xác nhận gửi email.");
      const requestId = String(body.request_id || "");
      if (!UUID.test(requestId)) throw new Error("Mã lượt gửi không hợp lệ.");

      // Bấm lại cùng một lượt (mạng chập chờn): trả về kết quả cũ, không gửi lần hai.
      const { data: existing } = await admin.from("legal_calendar_email_deliveries").select(LOG_FIELDS).eq("request_id", requestId).maybeSingle();
      if (existing) {
        if (existing.status === "sent") return json({ ok: true, already_processed: true, log: existing });
        throw new Error("Lượt gửi này đã được ghi nhận. Hãy kiểm tra nhật ký trước khi tạo lượt gửi mới.");
      }

      const { month, events } = await loadMonth(admin, body.month);
      if (!events.length) throw new Error("Tháng này chưa có mốc pháp lý đã xuất bản và đã xác minh.");
      const hash = await legalEmailContentHash(month.key, events, siteUrl);
      if (String(body.content_hash || "") !== hash) throw new Error("Nội dung các mốc vừa thay đổi. Hãy xem trước và gửi thử lại.");

      const logs = await monthLogs(admin, month.first);
      if (!logs.some((log) => log.delivery_type === "test" && log.status === "sent" && log.content_hash === hash)) {
        throw new Error("Cần gửi thử nội dung này tới tunguyen@facs.vn trước khi gửi khách hàng.");
      }
      if (logs.some((log) => log.delivery_type === "send" && log.status === "processing")) {
        throw new Error("Tháng này đang có một lượt gửi chưa hoàn tất. Hãy kiểm tra nhật ký và Sent Items.");
      }
      const audience = await loadAudience(admin);
      if (!audience.length) throw new Error("Danh sách khách hàng chưa có ai đang ở trạng thái nhận email.");
      const { scope, contacts } = pickRecipients(audience, body.audience_mode, body.audience_ids);
      if (contacts.length > MAX_BCC) throw new Error(`Tổng người nhận vượt giới hạn ${MAX_RECIPIENTS} của Microsoft 365. Hãy chọn từng nhóm khách hàng để gửi.`);
      const bcc = contacts.map((contact) => ({ mail_address: contact.email, name: contact.name || undefined }));

      // Danh sách phải khớp đúng danh sách anh/chị đã xem khi bấm gửi.
      const expected = Array.isArray(body.expected_bcc) ? body.expected_bcc.map((email: unknown) => String(email).toLowerCase()).sort() : [];
      if (expected.join(",") !== bcc.map((item) => item.mail_address).join(",")) {
        throw new Error("Danh sách người nhận vừa thay đổi. Hãy làm mới và kiểm tra lại trước khi gửi.");
      }

      // Chống gửi trùng: gửi tất cả khi tháng đã gửi, hoặc tick khách đã nhận tháng này → phải chọn "Gửi lại".
      if (body.allow_resend !== true) {
        const received = await monthReceived(admin, month.first);
        if (scope === "all" && logs.some((log) => log.delivery_type === "send" && log.status === "sent")) {
          throw new Error("Tháng này đã được gửi cho khách hàng. Hãy chọn từng khách mới, hoặc tick \"Gửi lại\" nếu thực sự muốn gửi lại tất cả.");
        }
        const repeat = bcc.filter((item) => received.has(item.mail_address)).map((item) => item.mail_address);
        if (repeat.length) {
          throw new Error(`${repeat.length} khách đã nhận email tháng này (${repeat.slice(0, 3).join(", ")}${repeat.length > 3 ? ", …" : ""}). Bỏ chọn họ hoặc tick "Gửi lại".`);
        }
      }

      const email = buildLegalCalendarEmail(month.key, events, siteUrl, false);
      const { data: log, error: logError } = await admin.from("legal_calendar_email_deliveries").insert({
        month: month.first, delivery_type: "send", audience_scope: scope, request_id: requestId, content_hash: hash,
        event_count: events.length, status: "processing", sender_email: SENDER, subject: email.subject,
        to_addresses: TO.map((item) => item.mail_address), cc_addresses: CC.map((item) => item.mail_address),
        bcc_addresses: bcc.map((item) => item.mail_address), bcc_count: bcc.length, created_by: user.id,
      }).select("id").single();
      if (logError) {
        if (logError.code === "23505") throw new Error("Tháng này đang có một lượt gửi khác. Vui lòng chờ hoàn tất.");
        throw new Error(`Không thể ghi nhật ký gửi: ${logError.message}`);
      }

      let accepted = false;
      try {
        const result = await sendMicrosoftMail({
          accessToken: await getMicrosoftGraphToken(), senderEmail: SENDER, senderName: SENDER_NAME,
          subject: email.subject, bodyHtml: email.html, to: TO, cc: CC, bcc,
          replyTo: [{ mail_address: SENDER, name: SENDER_NAME }], dedupeKey: `facs-legal-${requestId}`,
        });
        accepted = true;
        const finishError = await finishLog(admin, log.id, { status: "sent", message_id: result.message_id || null });
        if (finishError) throw new Error(`Microsoft 365 đã nhận email nhưng chưa chốt được trạng thái: ${finishError.message}`);
        return json({ ok: true, log_id: log.id, scope, recipients: recipientSummary(bcc.length), event_count: events.length });
      } catch (sendError) {
        const message = sendError instanceof Error ? sendError.message : String(sendError);
        // Microsoft đã nhận thư: giữ trạng thái "đang xử lý" để không ai gửi lại trước khi đối chiếu Sent Items.
        if (accepted) throw new Error(`${message}. Hệ thống đã khoá gửi lại tháng này; hãy kiểm tra Sent Items.`);
        await finishLog(admin, log.id, { status: "failed", error_message: message.slice(0, 2000) });
        throw sendError;
      }
    }

    if (action === "release_stuck") {
      if (body.confirmation_text !== "CHECKED-SENT-ITEMS") throw new Error("Thiếu xác nhận đã kiểm tra Sent Items.");
      const { data: log, error } = await admin.from("legal_calendar_email_deliveries").select("id,status,created_at")
        .eq("id", String(body.log_id || "")).maybeSingle();
      if (error || !log) throw new Error("Không tìm thấy lượt gửi.");
      if (log.status !== "processing") throw new Error("Lượt gửi này không ở trạng thái đang xử lý.");
      if (Date.now() - Date.parse(log.created_at) < STUCK_AFTER_MS) throw new Error("Lượt gửi mới bắt đầu dưới 30 phút; hãy chờ thêm.");
      // Admin đối chiếu Sent Items: thấy thư → ghi "đã gửi" (để lần sau phải chọn Gửi lại); không thấy → "lỗi".
      const found = body.outcome === "sent";
      if (!found && body.outcome !== "failed") throw new Error("Hãy chọn kết quả đối chiếu Sent Items.");
      const finishError = await finishLog(admin, log.id, {
        status: found ? "sent" : "failed",
        error_message: `Chốt thủ công sau khi kiểm tra Sent Items: ${found ? "đã thấy thư" : "không thấy thư"} (${user.email || user.id}).`,
      });
      if (finishError) throw new Error(finishError.message);
      return json({ ok: true });
    }

    return json({ error: "Action không hợp lệ" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
