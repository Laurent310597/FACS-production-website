import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";
import { sendSubmissionEmails } from "../_shared/submission-mailer.ts";
import { DEFAULT_RECEIPT_TEMPLATES } from "../_shared/form-email-templates.ts";

const PUBLIC_MAILBOXES = ["hr@facs.vn", "contact@facs.vn"];
const FORM_MAILBOX = "tunguyen@facs.vn";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
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

    if (action === "oauth_status") {
      return json({ ...getMicrosoftMailStatus(), mailbox_email: FORM_MAILBOX, public_mailboxes: PUBLIC_MAILBOXES });
    }

    if (action === "get_templates") {
      const { data, error } = await admin.from("form_email_templates").select("template_key,subject,body_vi,body_en,updated_at");
      if (error) {
        // Keep the CMS usable with code defaults while the additive v20.15
        // migration is still being applied to an environment.
        if (error.code === "42P01" || error.message.toLowerCase().includes("form_email_templates")) {
          return json({ templates: Object.values(DEFAULT_RECEIPT_TEMPLATES).map((item) => ({ ...item, is_custom: false })), storage_ready: false });
        }
        throw new Error(error.message);
      }
      const saved = new Map((data || []).map((item) => [item.template_key, item]));
      return json({
        templates: Object.values(DEFAULT_RECEIPT_TEMPLATES).map((item) => ({ ...item, ...(saved.get(item.template_key) || {}), is_custom: saved.has(item.template_key) })), storage_ready: true,
      });
    }

    if (action === "save_template") {
      const templateKey = String(body.template_key || "") as keyof typeof DEFAULT_RECEIPT_TEMPLATES;
      if (!DEFAULT_RECEIPT_TEMPLATES[templateKey]) return json({ error: "Mẫu email không hợp lệ." }, 400);
      const subject = String(body.subject || "").trim();
      const bodyVi = String(body.body_vi || "").trim();
      const bodyEn = String(body.body_en || "").trim();
      if (!subject || !bodyVi || !bodyEn) return json({ error: "Tiêu đề và nội dung song ngữ không được để trống." }, 400);
      if (subject.length > 300 || bodyVi.length > 12000 || bodyEn.length > 12000) return json({ error: "Nội dung email vượt quá giới hạn cho phép." }, 400);
      const { data, error } = await admin.from("form_email_templates").upsert({
        template_key: templateKey,
        subject,
        body_vi: bodyVi,
        body_en: bodyEn,
        updated_by: (await admin.auth.getUser((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim())).data.user?.id || null,
        updated_at: new Date().toISOString(),
      }).select("template_key,subject,body_vi,body_en,updated_at").single();
      if (error) throw new Error(error.message);
      return json({ template: { ...data, is_custom: true } });
    }

    if (action === "reset_template") {
      const templateKey = String(body.template_key || "") as keyof typeof DEFAULT_RECEIPT_TEMPLATES;
      if (!DEFAULT_RECEIPT_TEMPLATES[templateKey]) return json({ error: "Mẫu email không hợp lệ." }, 400);
      const { error } = await admin.from("form_email_templates").delete().eq("template_key", templateKey);
      if (error) throw new Error(error.message);
      return json({ template: { ...DEFAULT_RECEIPT_TEMPLATES[templateKey], is_custom: false } });
    }

    if (action === "test") {
      const senderEmail = String(body.sender_email || "").toLowerCase();
      if (!PUBLIC_MAILBOXES.includes(senderEmail)) return json({ error: "Hộp thư công khai gửi thử không hợp lệ." }, 400);
      const senderName = senderEmail === "hr@facs.vn" ? "FACS Careers" : "FACS Contact";
      const token = await getMicrosoftGraphToken();
      const testTime = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const result = await sendMicrosoftMail({
        accessToken: token,
        senderEmail,
        senderName,
        subject: `[TEST] Kiểm tra gửi từ ${senderEmail}`,
        bodyHtml: `<div style="font-family:Arial,sans-serif;line-height:1.7"><h2>Kiểm tra FACS Email Automation</h2><p>Email thử đã được gửi thành công từ <strong>${senderEmail}</strong> qua Microsoft 365.</p><p>Thời gian: ${testTime}</p></div>`,
        to: [{ mail_address: FORM_MAILBOX, name: "Tu Nguyen" }],
        replyTo: [{ mail_address: senderEmail, name: senderName }],
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
