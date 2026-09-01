import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";
import {
  AR_SENDER,
  REVIEW_VALIDITY_MS,
  assertDeliveryAllowed,
  currentMode,
  deliveryRecipients,
  prepareReminder,
  verifyConfirmation,
} from "./handler.mjs";

type AdminClient = ReturnType<typeof createClient<any>>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
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

async function loadSource(admin: AdminClient, customerId: string) {
  if (!customerId) throw new Error("Vui lòng chọn khách hàng.");
  const [{ data: source, error: sourceError }, { data: template, error: templateError }] = await Promise.all([
    admin.rpc("ar_reminder_source", { p_customer_id: customerId }),
    admin.from("ar_reminder_template").select("*").eq("template_key", "default").single(),
  ]);
  if (sourceError) throw new Error(`Không thể tải công nợ: ${sourceError.message}`);
  if (templateError || !template) throw new Error(`Không thể tải mẫu email: ${templateError?.message || "not found"}`);
  if (!source?.customer || !Array.isArray(source.invoices) || !source.invoices.length) {
    throw new Error("Khách hàng không còn hóa đơn phải thu để nhắc.");
  }
  return { source, template };
}

async function finish(admin: AdminClient, deliveryId: string, status: string, messageId?: string, errorMessage?: string) {
  const { error } = await admin.rpc("finish_ar_reminder", {
    p_delivery_id: deliveryId,
    p_status: status,
    p_provider_message_id: messageId || null,
    p_error_message: errorMessage || null,
  });
  if (error) throw new Error(error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const emailMode = currentMode(Deno.env.get("FACS_AR_EMAIL_MODE"));
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const user = await requireAdmin(req, admin);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "status") {
      return json({
        ...getMicrosoftMailStatus(),
        mailbox_email: AR_SENDER,
        email_mode: emailMode,
        test_enabled: emailMode === "test" || emailMode === "live",
        live_enabled: emailMode === "live",
      });
    }

    const customerId = String(body.customer_id || "");
    const statementDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    const { source, template } = await loadSource(admin, customerId);
    const prepared = await prepareReminder({ source, template, statementDate, test: action === "test" });

    if (action === "preview") {
      const now = new Date();
      const { error } = await admin.from("ar_reminder_reviews").upsert({
        customer_id: customerId,
        source_hash: prepared.source_hash,
        previewed_at: now.toISOString(),
        previewed_by: user.id,
        tested_at: null,
        tested_by: null,
        expires_at: new Date(now.getTime() + REVIEW_VALIDITY_MS).toISOString(),
        updated_at: now.toISOString(),
      });
      if (error) throw new Error(`Không thể lưu trạng thái xem trước: ${error.message}`);
      const recipients = deliveryRecipients(source, "live");
      return json({
        ok: true,
        customer_id: customerId,
        source_hash: prepared.source_hash,
        subject: prepared.subject,
        body_html: prepared.html,
        total_outstanding: prepared.total_outstanding,
        invoice_count: prepared.invoice_count,
        recipients,
        confirmation_phrase: `SEND-${customerId.slice(0, 8).toUpperCase()}`,
        review_expires_at: new Date(now.getTime() + REVIEW_VALIDITY_MS).toISOString(),
      });
    }

    if (!['test', 'live'].includes(action)) return json({ error: "Action không hợp lệ." }, 400);
    const deliveryType = action as "test" | "live";
    const requestOrigin = req.headers.get("origin") || "";
    assertDeliveryAllowed({ mode: emailMode, deliveryType, supabaseUrl, requestOrigin });
    if (deliveryType === "live") verifyConfirmation(body.confirmation, customerId);

    const recipients = deliveryRecipients(source, deliveryType);
    if (recipients.to.length + recipients.cc.length > 50) throw new Error("Tổng số người nhận vượt giới hạn 50.");
    const { data: deliveryId, error: claimError } = await admin.rpc("claim_ar_reminder", {
      p_customer_id: customerId,
      p_delivery_type: deliveryType,
      p_source_hash: prepared.source_hash,
      p_to_addresses: recipients.to,
      p_cc_addresses: recipients.cc,
      p_subject: prepared.subject,
      p_body_html: prepared.html,
      p_source_snapshot: source,
      p_requested_by: user.id,
    });
    if (claimError || !deliveryId) throw new Error(`Không thể khóa lượt gửi: ${claimError?.message || "unknown error"}`);

    let graphAccepted = false;
    let graphMessageId = "";
    try {
      const accessToken = await getMicrosoftGraphToken();
      const result = await sendMicrosoftMail({
        accessToken,
        senderEmail: AR_SENDER,
        senderName: "FACS Accounting",
        subject: prepared.subject,
        bodyHtml: prepared.html,
        to: recipients.to.map((mail_address) => ({ mail_address })),
        cc: recipients.cc.map((mail_address) => ({ mail_address })),
        replyTo: [{ mail_address: AR_SENDER, name: "FACS Accounting" }],
        dedupeKey: `facs-ar-${deliveryType}-${deliveryId}`,
      });
      graphAccepted = true;
      graphMessageId = result.message_id || "";
      await finish(admin, deliveryId, "sent", graphMessageId);
      return json({ ok: true, delivery_id: deliveryId, delivery_type: deliveryType, recipients });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);
      if (graphAccepted) {
        try { await finish(admin, deliveryId, "manual_review", graphMessageId, message); } catch { /* keep processing lock */ }
        throw new Error(`${message}. Microsoft 365 đã nhận email; hệ thống đã khóa gửi lại để kiểm tra Sent Items.`);
      }
      try { await finish(admin, deliveryId, "failed", undefined, message); } catch { /* original error remains primary */ }
      throw sendError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    const status = /không hợp lệ|missing|expired|changed|disabled|restricted|not enabled|confirmation|already/i.test(message) ? 400 : 500;
    return json({ error: message }, status);
  }
});

