import { supabase } from "./supabaseClient";

export function newSubmissionKey() {
  return window.crypto.randomUUID();
}

export async function submitWebsiteForm(formElement, { type, language, submissionKey, extra = {} }) {
  if (!supabase) throw new Error("Website chưa kết nối Supabase.");
  const body = new FormData(formElement);
  body.set("type", type);
  body.set("language", language === "en" ? "en" : "vi");
  body.set("submission_key", submissionKey);
  body.set("source_url", window.location.href);
  body.set("consent", body.get("consent") ? "true" : "false");
  Object.entries(extra).forEach(([key, value]) => body.set(key, value || ""));

  const { data, error } = await supabase.functions.invoke("form-submissions", { body });
  if (error) {
    let message = error.message || "Không thể gửi biểu mẫu.";
    try {
      const details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // Keep the SDK error when the response body is unavailable.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function invokeFormEmailAdmin(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("form-email-admin", {
    body: { action, ...payload },
  });
  if (error) {
    let message = error.message || "Không thể gọi dịch vụ email.";
    try {
      const details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // Keep the SDK error when the Edge Function did not return JSON.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
