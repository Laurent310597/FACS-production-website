import { supabase } from "./supabaseClient";

export const emailStatusLabels = {
  disabled: "Không gửi email",
  pending: "Chờ gửi",
  cancelled: "Đã hủy gửi",
  processing: "Đang gửi",
  sent: "Đã gửi",
  failed: "Gửi thất bại",
};

export const emailStatusStyles = {
  disabled: "bg-slate-300/10 text-slate-300",
  pending: "bg-sky-300/10 text-sky-200",
  cancelled: "bg-amber-300/10 text-amber-200",
  processing: "bg-violet-300/10 text-violet-200",
  sent: "bg-emerald-300/10 text-emerald-200",
  failed: "bg-red-300/10 text-red-200",
};

export function deriveEmailStatus({ enabled, currentStatus, action }) {
  if (!enabled) return currentStatus === "sent" ? "sent" : currentStatus === "cancelled" ? "cancelled" : "disabled";
  if (currentStatus === "sent") return "sent";
  if (action === "cancel") return "cancelled";
  return "pending";
}

export async function invokeInsightEmail(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("insight-email", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || "Không thể gọi Edge Function insight-email.");
  if (data?.error) throw new Error(data.error);
  return data;
}
