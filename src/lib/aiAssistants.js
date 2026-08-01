import { supabase } from "./supabaseClient";

export function newAISessionId() {
  return window.crypto.randomUUID();
}

async function invoke(functionName, body) {
  if (!supabase) throw new Error("Website chưa kết nối Supabase.");
  const { data, error } = await supabase.functions.invoke(functionName, { body });
  if (error) {
    let message = error.message || "Không thể kết nối với trợ lý AI.";
    try {
      const details = await error.context?.json?.();
      if (details?.error) message = details.error;
    } catch {
      // Retain the SDK error when the Edge Function body cannot be read.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function askPublicLegalAI({ message, history, language, sessionId, channel }) {
  const data = await invoke("legal-ai-assistant", {
    message,
    history,
    language: language === "en" ? "en" : "vi",
    session_id: sessionId,
    channel: channel === "legal_page" ? "legal_page" : "popup",
  });
  if (!data?.answer) throw new Error("Trợ lý AI chưa trả về nội dung.");
  return data;
}

export async function askCmsAssistant({ message, history, page }) {
  const data = await invoke("cms-assistant", { message, history, page });
  if (!data?.answer) throw new Error("Trợ lý CMS chưa trả về nội dung.");
  return data;
}
