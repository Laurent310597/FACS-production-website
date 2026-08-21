import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getMicrosoftGraphToken, sendMicrosoftMail } from "./microsoft-graph.ts";
import {
  buildCareerInternalEmail,
  buildCareerReceipt,
  buildContactInternalEmail,
  buildContactReceipt,
  buildEditableReceipt,
} from "./form-email-templates.ts";

const INTERNAL_RECIPIENTS = [
  { mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" },
  { mail_address: "thanhhuynh@facs.vn", name: "Thanh Huynh" },
  { mail_address: "yendoan@facs.vn", name: "Yen Doan" },
];
const FORM_MAILBOX = "tunguyen@facs.vn";

type Delivery = "internal" | "receipt";
type SubmissionType = "career" | "contact";

async function createLog(admin: SupabaseClient, payload: Record<string, unknown>) {
  const { data, error } = await admin.from("submission_email_logs").insert({ ...payload, status: "processing" }).select("id").single();
  if (error) throw new Error(`Không thể tạo email log: ${error.message}`);
  return data.id as string;
}

async function finishLog(admin: SupabaseClient, id: string, payload: Record<string, unknown>) {
  await admin.from("submission_email_logs").update({ ...payload, completed_at: new Date().toISOString() }).eq("id", id);
}

function fields(delivery: Delivery) {
  return delivery === "internal"
    ? { status: "internal_email_status", attempts: "internal_email_attempts", sentAt: "internal_email_sent_at", messageId: "internal_email_message_id" }
    : { status: "receipt_email_status", attempts: "receipt_email_attempts", sentAt: "receipt_email_sent_at", messageId: "receipt_email_message_id" };
}

async function updateDelivery(admin: SupabaseClient, table: string, id: string, delivery: Delivery, currentAttempts: number, payload: Record<string, unknown>) {
  const columns = fields(delivery);
  await admin.from(table).update({
    [columns.attempts]: currentAttempts + 1,
    ...payload,
  }).eq("id", id);
}

async function sendOne(params: {
  admin: SupabaseClient;
  type: SubmissionType;
  row: Record<string, any>;
  delivery: Delivery;
  siteUrl: string;
}) {
  const isCareer = params.type === "career";
  const table = isCareer ? "career_applications" : "contact_inquiries";
  const parentKey = isCareer ? "career_application_id" : "contact_inquiry_id";
  const columns = fields(params.delivery);
  const senderEmail = isCareer ? "hr@facs.vn" : "contact@facs.vn";
  const senderName = isCareer ? "FACS Careers" : "FACS Contact";
  const to = params.delivery === "internal"
    ? INTERNAL_RECIPIENTS
    : [{ mail_address: String(params.row.email), name: String(params.row.full_name) }];
  const replyTo = params.delivery === "internal" ? String(params.row.email) : senderEmail;
  let configuredTemplate = null;
  if (params.delivery === "receipt") {
    const templateKey = isCareer ? "career_receipt" : "contact_receipt";
    const { data } = await params.admin.from("form_email_templates").select("template_key,subject,body_vi,body_en").eq("template_key", templateKey).maybeSingle();
    configuredTemplate = data;
  }
  const template = configuredTemplate
    ? buildEditableReceipt(params.type, params.row, params.siteUrl, configuredTemplate)
    : isCareer
    ? params.delivery === "internal"
      ? buildCareerInternalEmail(params.row, `${params.siteUrl}/admin/applications`)
      : buildCareerReceipt(params.row, params.siteUrl)
    : params.delivery === "internal"
      ? buildContactInternalEmail(params.row, `${params.siteUrl}/admin/inquiries`)
      : buildContactReceipt(params.row, params.siteUrl);

  let logId: string | null = null;
  try {
    logId = await createLog(params.admin, {
      [parentKey]: params.row.id,
      delivery_type: params.delivery,
      authenticated_mailbox: FORM_MAILBOX,
      sender_email: senderEmail,
      to_addresses: to.map((item) => item.mail_address),
    });

    await updateDelivery(params.admin, table, params.row.id, params.delivery, Number(params.row[columns.attempts] || 0), {
      [columns.status]: "processing",
      last_email_error: null,
    });

    let attachment: { filename: string; contentType: string; bytes: Uint8Array } | undefined;
    if (isCareer && params.delivery === "internal") {
      const { data, error } = await params.admin.storage.from(params.row.cv_bucket).download(params.row.cv_path);
      if (error || !data) throw new Error(`Không thể tải CV để đính kèm: ${error?.message || "không có dữ liệu"}`);
      attachment = {
        filename: params.row.cv_original_name,
        contentType: params.row.cv_mime_type,
        bytes: new Uint8Array(await data.arrayBuffer()),
      };
    }

    const token = await getMicrosoftGraphToken();
    const result = await sendMicrosoftMail({
        accessToken: token,
        senderEmail,
        senderName,
        subject: template.subject,
        bodyHtml: template.html,
        to,
        replyTo: [{ mail_address: replyTo }],
        attachment,
        dedupeKey: `facs-${params.type}-${params.delivery}-${params.row.id}`,
      });

    await params.admin.from(table).update({
      [columns.status]: "sent",
      [columns.sentAt]: new Date().toISOString(),
      [columns.messageId]: result.message_id || params.row[columns.messageId] || null,
      last_email_error: null,
    }).eq("id", params.row.id);
    await finishLog(params.admin, logId, {
      status: "sent",
      lark_message_id: result.message_id || null,
      lark_thread_id: result.thread_id || null,
    });
    return { delivery: params.delivery, status: "sent" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await params.admin.from(table).update({
      [columns.status]: "failed",
      last_email_error: message.slice(0, 2000),
    }).eq("id", params.row.id);
    if (logId) await finishLog(params.admin, logId, { status: "failed", error_message: message.slice(0, 2000) });
    return { delivery: params.delivery, status: "failed", error: message };
  }
}

export async function sendSubmissionEmails(params: {
  admin: SupabaseClient;
  type: SubmissionType;
  row: Record<string, any>;
  siteUrl: string;
  only?: Delivery;
}) {
  const deliveries: Delivery[] = params.only ? [params.only] : ["internal", "receipt"];
  const results = [];
  for (const delivery of deliveries) results.push(await sendOne({ ...params, delivery }));
  return results;
}
