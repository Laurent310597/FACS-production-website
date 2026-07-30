import { supabase } from "./supabaseClient";

export function newAssistantSessionId() {
  return window.crypto.randomUUID();
}

export async function askFACSAssistant({ message, history, language, sessionId }) {
  if (!supabase) throw new Error("Website chưa kết nối Supabase.");

  const { data, error } = await supabase.functions.invoke("website-assistant", {
    body: {
      message,
      history,
      language: language === "en" ? "en" : "vi",
      session_id: sessionId,
      source_url: window.location.href,
    },
  });

  if (error) {
    let messageText = error.message || "Không thể kết nối với trợ lý FACS.";
    try {
      const details = await error.context?.json?.();
      if (details?.error) messageText = details.error;
    } catch {
      // Keep the SDK error when the response body is unavailable.
    }
    throw new Error(messageText);
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.answer) throw new Error("Trợ lý FACS chưa trả về nội dung.");
  return data;
}
