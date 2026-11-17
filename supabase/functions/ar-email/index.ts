// CMS > AR: gửi email nhắc công nợ từ accounting@facs.vn qua Microsoft 365 (cùng ứng dụng Graph với email Insights / Contact).
// Không có gì được gửi tự động: chỉ khi quản trị viên bấm "Gửi" và xác nhận.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getMicrosoftGraphToken, getMicrosoftMailStatus, sendMicrosoftMail } from "../_shared/microsoft-graph.ts";
import {
  AR_SENDER,
  AR_SENDER_NAME,
  type ArReminder,
  type ArSettings,
  DEFAULT_AR_SETTINGS,
  SAMPLE_REMINDER,
  bankMissing,
  buildArReminderEmail,
  cleanReminder,
  cleanSettings,
} from "../_shared/ar-reminder.ts";

type AdminClient = ReturnType<typeof createClient<any>>;
const SEND_GAP_MS = 2100; // Exchange Online: tối đa ~30 email/phút mỗi hộp thư

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });
}

async function requireAdmin(req: Request, admin: AdminClient) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  return data.user;
}

async function loadSettings(admin: AdminClient): Promise<{ settings: ArSettings; is_custom: boolean; updated_at: string | null }> {
  const { data, error } = await admin.from("ar_reminder_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { settings: { ...DEFAULT_AR_SETTINGS }, is_custom: false, updated_at: null };
  const settings = { ...DEFAULT_AR_SETTINGS };
  for (const key of Object.keys(DEFAULT_AR_SETTINGS) as (keyof ArSettings)[]) settings[key] = String(data[key] ?? "");
  return { settings, is_custom: true, updated_at: data.updated_at };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const siteUrl = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").replace(/\/$/, "");

  try {
    const user = await requireAdmin(req, admin);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    if (action === "status") {
      const { settings } = await loadSettings(admin);
      return json({ ...getMicrosoftMailStatus(), sender: AR_SENDER, bank_ready: !bankMissing(settings), user_email: user.email || null });
    }

    if (action === "get_settings") {
      const loaded = await loadSettings(admin);
      return json({ ...loaded, defaults: DEFAULT_AR_SETTINGS });
    }

    if (action === "save_settings") {
      const cleaned = cleanSettings(body.settings || {});
      if (!cleaned.ok) return json({ error: cleaned.error }, 400);
      const { error } = await admin
        .from("ar_reminder_settings")
        .upsert({ id: 1, ...cleaned.settings, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return json(await loadSettings(admin));
    }

    if (action === "add_reminders") {
      const input = Array.isArray(body.rows) ? body.rows : [];
      if (!input.length) return json({ error: "Không có dòng nào để lưu." }, 400);
      if (input.length > 500) return json({ error: "Tối đa 500 dòng mỗi lần." }, 400);
      const errors: { index: number; error: string }[] = [];
      const rows: Record<string, unknown>[] = [];
      input.forEach((item: Record<string, unknown>, index: number) => {
        const cleaned = cleanReminder(item || {});
        if (!cleaned.ok) errors.push({ index, error: cleaned.error });
        else rows.push({ ...cleaned.reminder, batch_label: String(body.batch_label || "").trim().slice(0, 200) || null, created_by: user.id });
      });
      // Có lỗi thì không lưu dòng nào, để sửa file rồi tải lại (tránh lưu nửa chừng).
      if (errors.length) return json({ error: `Có ${errors.length} dòng chưa hợp lệ.`, row_errors: errors }, 400);
      const { data, error } = await admin.from("ar_reminders").insert(rows).select("id");
      if (error) throw new Error(error.message);
      return json({ inserted: data?.length || 0 });
    }

    if (action === "update_reminder") {
      const cleaned = cleanReminder(body.row || {});
      if (!cleaned.ok) return json({ error: cleaned.error }, 400);
      const { data, error } = await admin.from("ar_reminders").update(cleaned.reminder)
        .eq("id", String(body.id || "")).in("status", ["draft", "failed"]).select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) return json({ error: "Dòng này đã gửi hoặc đang gửi nên không sửa được." }, 409);
      return json({ ok: true });
    }

    if (action === "preview") {
      // Dùng cài đặt đang sửa (chưa lưu) nếu có, để xem trước ngay trong trình soạn.
      let settings = (await loadSettings(admin)).settings;
      if (body.settings) {
        const cleaned = cleanSettings(body.settings);
        if (!cleaned.ok) return json({ error: cleaned.error }, 400);
        settings = cleaned.settings;
      }
      let reminder: ArReminder = SAMPLE_REMINDER;
      if (body.id) {
        const { data, error } = await admin.from("ar_reminders").select("*").eq("id", body.id).maybeSingle();
        if (error || !data) return json({ error: "Không tìm thấy dòng nhắc nợ." }, 404);
        reminder = data as ArReminder;
      } else if (body.reminder) {
        const cleaned = cleanReminder(body.reminder);
        if (!cleaned.ok) return json({ error: cleaned.error }, 400);
        reminder = cleaned.reminder;
      }
      return json({ ...buildArReminderEmail(reminder, settings, siteUrl), bank_warning: bankMissing(settings) });
    }

    if (action === "test") {
      // Bản thử chỉ gửi tới email của chính người đang đăng nhập.
      if (!getMicrosoftMailStatus().connected) return json({ error: "Chưa cấu hình Microsoft 365 trên Supabase." }, 400);
      if (!user.email) return json({ error: "Tài khoản quản trị không có email." }, 400);
      const { settings } = await loadSettings(admin);
      let reminder: ArReminder = SAMPLE_REMINDER;
      if (body.id) {
        const { data } = await admin.from("ar_reminders").select("*").eq("id", body.id).maybeSingle();
        if (data) reminder = data as ArReminder;
      }
      const mail = buildArReminderEmail(reminder, settings, siteUrl);
      const token = await getMicrosoftGraphToken();
      await sendMicrosoftMail({
        accessToken: token,
        senderEmail: AR_SENDER,
        senderName: AR_SENDER_NAME,
        subject: `[THỬ] ${mail.subject}`,
        bodyHtml: mail.html,
        to: [{ mail_address: user.email }],
        replyTo: [{ mail_address: AR_SENDER }],
        dedupeKey: `facs-ar-test-${crypto.randomUUID()}`,
      });
      return json({ sent_to: user.email });
    }

    if (action === "send") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => typeof v === "string").slice(0, 25) : [];
      if (!ids.length) return json({ error: "Chưa chọn dòng nào để gửi." }, 400);
      if (!getMicrosoftMailStatus().connected) return json({ error: "Chưa cấu hình Microsoft 365 trên Supabase." }, 400);
      const { settings } = await loadSettings(admin);
      const missing = bankMissing(settings);
      if (missing) return json({ error: missing }, 400);

      const { data: claimed, error: claimError } = await admin.rpc("ar_claim_reminders", { p_ids: ids, p_resend: body.resend === true });
      if (claimError) throw new Error(claimError.message);
      const rows = (claimed || []) as (ArReminder & { id: string })[];
      const token = rows.length ? await getMicrosoftGraphToken() : "";
      const results: { id: string; status: "sent" | "failed"; error?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (i > 0) await sleep(SEND_GAP_MS);
        try {
          const mail = buildArReminderEmail(row, settings, siteUrl);
          const result = await sendMicrosoftMail({
            accessToken: token,
            senderEmail: AR_SENDER,
            senderName: AR_SENDER_NAME,
            subject: mail.subject,
            bodyHtml: mail.html,
            to: row.recipient_emails.map((e) => ({ mail_address: e, name: row.recipient_name })),
            cc: (row.cc_emails || []).map((e) => ({ mail_address: e })),
            replyTo: [{ mail_address: AR_SENDER }],
            dedupeKey: `facs-ar-${row.id}-${Date.now()}`,
          });
          await admin.from("ar_reminders").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            sent_subject: mail.subject,
            message_id: result.message_id,
            last_error: null,
          }).eq("id", row.id);
          results.push({ id: row.id, status: "sent" });
        } catch (sendError) {
          const message = (sendError instanceof Error ? sendError.message : String(sendError)).slice(0, 2000);
          await admin.from("ar_reminders").update({ status: "failed", last_error: message }).eq("id", row.id);
          results.push({ id: row.id, status: "failed", error: message });
        }
      }
      const skipped = ids.filter((id: string) => !rows.some((r) => r.id === id));
      return json({ results, skipped });
    }

    return json({ error: "Hành động không hợp lệ." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." }, 401);
    return json({ error: message }, 500);
  }
});
