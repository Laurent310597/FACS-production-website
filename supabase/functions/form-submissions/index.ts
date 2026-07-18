import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendSubmissionEmails } from "../_shared/submission-mailer.ts";
import { cleanText, clientIp, hasValidCvSignature, isUuid, isValidEmail, normalizeCv, sha256 } from "../_shared/form-validation.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function required(value: string, label: string, minLength = 1) {
  if (value.length < minLength) throw new Error(`${label} chưa hợp lệ.`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const siteUrl = (Deno.env.get("FACS_SITE_URL") || "https://facs.vn").replace(/\/$/, "");
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const form = await req.formData();
    const type = cleanText(form.get("type"), 20);
    if (!['career', 'contact'].includes(type)) return json({ error: "Loại biểu mẫu không hợp lệ." }, 400);

    // Hidden honeypot: bots commonly fill every visible and hidden text field.
    if (cleanText(form.get("website"), 200)) return json({ ok: true });

    const ipHash = await sha256(`${type}:${clientIp(req)}:${serviceKey.slice(0, 24)}`);
    const { data: allowed, error: rateError } = await admin.rpc("check_form_submission_rate_limit", {
      p_ip_hash: ipHash,
      p_limit: type === "career" ? 3 : 5,
      p_window_minutes: 60,
    });
    if (rateError) throw new Error(`Không thể kiểm tra giới hạn gửi: ${rateError.message}`);
    if (!allowed) return json({ error: "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau." }, 429);

    const submissionKey = cleanText(form.get("submission_key"), 36);
    if (!isUuid(submissionKey)) return json({ error: "Mã gửi biểu mẫu không hợp lệ." }, 400);
    const fullName = cleanText(form.get("full_name"), 120);
    const email = cleanText(form.get("email"), 254).toLowerCase();
    const phone = cleanText(form.get("phone"), 40);
    const language = cleanText(form.get("language"), 2) === "en" ? "en" : "vi";
    const sourceUrl = cleanText(form.get("source_url"), 500);
    const consent = cleanText(form.get("consent"), 10) === "true";

    required(fullName, "Họ và tên", 2);
    if (!isValidEmail(email)) return json({ error: "Địa chỉ email chưa hợp lệ." }, 400);
    if (!consent) return json({ error: "Vui lòng xác nhận đồng ý để FACS xử lý thông tin." }, 400);

    if (type === "career") {
      required(phone, "Số điện thoại", 5);
      const { data: existing } = await admin.from("career_applications").select("id").eq("submission_key", submissionKey).maybeSingle();
      if (existing) return json({ ok: true, id: existing.id, duplicate: true });

      const cvEntry = form.get("cv");
      if (!(cvEntry instanceof File)) return json({ error: "Vui lòng chọn file CV." }, 400);
      const cv = normalizeCv(cvEntry);
      const jobPostId = cleanText(form.get("job_post_id"), 36);
      const requestedPosition = cleanText(form.get("position"), 200);
      const message = cleanText(form.get("message"), 4000);
      let position = requestedPosition;
      let validJobId: string | null = null;

      if (jobPostId && isUuid(jobPostId)) {
        const { data: job } = await admin.from("job_posts").select("id,title_vi,title_en").eq("id", jobPostId).maybeSingle();
        if (job) {
          validJobId = job.id;
          position = language === "en" ? (job.title_en || job.title_vi || position) : (job.title_vi || job.title_en || position);
        }
      }

      const applicationId = crypto.randomUUID();
      const now = new Date();
      const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${applicationId}/${cv.safeName}`;
      const bytes = new Uint8Array(await cvEntry.arrayBuffer());
      if (!hasValidCvSignature(bytes, cv.extension)) return json({ error: "Nội dung file CV không khớp với định dạng đã chọn." }, 400);
      const { error: uploadError } = await admin.storage.from("career-cvs").upload(path, bytes, {
        contentType: cv.mimeType,
        upsert: false,
      });
      if (uploadError) throw new Error(`Không thể lưu CV: ${uploadError.message}`);

      const { data: application, error: insertError } = await admin.from("career_applications").insert({
        id: applicationId,
        submission_key: submissionKey,
        job_post_id: validJobId,
        position: position || null,
        full_name: fullName,
        email,
        phone,
        message: message || null,
        language,
        source_url: sourceUrl || null,
        cv_bucket: "career-cvs",
        cv_path: path,
        cv_original_name: cv.originalName,
        cv_mime_type: cv.mimeType,
        cv_size_bytes: cvEntry.size,
      }).select("*").single();

      if (insertError || !application) {
        await admin.storage.from("career-cvs").remove([path]);
        throw new Error(`Không thể lưu hồ sơ: ${insertError?.message || "không có dữ liệu"}`);
      }

      const deliveries = await sendSubmissionEmails({ admin, type: "career", row: application, siteUrl });
      return json({ ok: true, id: application.id, deliveries });
    }

    const { data: existing } = await admin.from("contact_inquiries").select("id").eq("submission_key", submissionKey).maybeSingle();
    if (existing) return json({ ok: true, id: existing.id, duplicate: true });

    const message = cleanText(form.get("message"), 5000);
    required(message, "Nội dung cần tư vấn", 5);
    const { data: inquiry, error: insertError } = await admin.from("contact_inquiries").insert({
      submission_key: submissionKey,
      full_name: fullName,
      email,
      phone: phone || null,
      company_name: cleanText(form.get("company_name"), 200) || null,
      service_interest: cleanText(form.get("service_interest"), 200) || null,
      message,
      language,
      source_url: sourceUrl || null,
    }).select("*").single();
    if (insertError || !inquiry) throw new Error(`Không thể lưu yêu cầu: ${insertError?.message || "không có dữ liệu"}`);

    const deliveries = await sendSubmissionEmails({ admin, type: "contact", row: inquiry, siteUrl });
    return json({ ok: true, id: inquiry.id, deliveries });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const clientError = /chưa hợp lệ|chỉ chấp nhận|vượt quá|đang trống|Vui lòng/i.test(message);
    return json({ error: message }, clientError ? 400 : 500);
  }
});
