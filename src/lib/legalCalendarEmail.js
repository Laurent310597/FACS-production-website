import { supabase } from "./supabaseClient";

/** Gọi Edge Function gửi email lịch pháp lý theo tháng. */
export async function invokeLegalEmail(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("legal-calendar-email", { body: { action, ...payload } });
  if (error) {
    let message = error.message || "Không thể gọi Edge Function legal-calendar-email.";
    try {
      const details = await error.context?.json?.();
      message = details?.error || details?.message || message;
    } catch {
      // Giữ thông báo lỗi gốc khi không đọc được nội dung phản hồi.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Tháng hiện tại theo giờ Việt Nam, dạng YYYY-MM. */
export function currentMonth(now = new Date()) {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 7);
}

/** Tháng mặc định: từ ngày 15 trở đi gợi ý tháng sau (thường gửi trước khi tháng mới bắt đầu). */
export function defaultEmailMonth(now = new Date()) {
  const [y, m, d] = now.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).split("-").map(Number);
  return shiftMonth(`${y}-${String(m).padStart(2, "0")}`, d >= 15 ? 1 : 0);
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthTitle(key) {
  const [y, m] = key.split("-");
  return `Tháng ${m}/${y}`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
