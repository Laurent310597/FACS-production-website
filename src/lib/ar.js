import { supabase } from "./supabaseClient";

export const agingFilters = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "unpaid", label: "Tất cả chưa thu" },
  { value: "current", label: "Chưa đến hạn" },
  { value: "due", label: "Đến hạn hôm nay" },
  { value: "overdue_1_30", label: "Quá hạn 1–30 ngày" },
  { value: "overdue_31_60", label: "Quá hạn 31–60 ngày" },
  { value: "overdue_61_plus", label: "Quá hạn trên 60 ngày" },
  { value: "paid", label: "Đã thu" },
  { value: "cancelled", label: "Đã hủy" },
];

export function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function formatArDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function formatArDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function todayInVietnam() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function differenceInDays(later, earlier) {
  const laterDate = new Date(`${later}T00:00:00Z`);
  const earlierDate = new Date(`${earlier}T00:00:00Z`);
  return Math.round((laterDate.getTime() - earlierDate.getTime()) / 86_400_000);
}

export function getInvoiceAging(invoice, currentDate = todayInVietnam()) {
  if (invoice.source_status === "cancelled") return { key: "cancelled", label: "Đã hủy", days: 0, tone: "slate" };
  if (invoice.is_paid) return { key: "paid", label: "Đã thu", days: 0, tone: "emerald" };
  const days = differenceInDays(currentDate, invoice.due_date);
  if (days < 0) return { key: "current", label: "Chưa đến hạn", days, tone: "cyan" };
  if (days === 0) return { key: "due", label: "Đến hạn hôm nay", days, tone: "amber" };
  if (days <= 30) return { key: "overdue_1_30", label: `Quá hạn ${days} ngày`, days, tone: "amber" };
  if (days <= 60) return { key: "overdue_31_60", label: `Quá hạn ${days} ngày`, days, tone: "orange" };
  return { key: "overdue_61_plus", label: `Quá hạn ${days} ngày`, days, tone: "red" };
}

export function summarizeAr(invoices, currentDate = todayInVietnam()) {
  const active = invoices.filter((item) => item.source_status !== "cancelled");
  const unpaid = active.filter((item) => !item.is_paid);
  const paidThisMonth = active.filter((item) => item.is_paid && item.paid_at?.startsWith(currentDate.slice(0, 7)));
  const byKey = (key) => unpaid.filter((item) => getInvoiceAging(item, currentDate).key === key)
    .reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0);
  return {
    totalOutstanding: unpaid.reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0),
    current: byKey("current") + byKey("due"),
    overdue1To30: byKey("overdue_1_30"),
    overdue31To60: byKey("overdue_31_60"),
    overdue61Plus: byKey("overdue_61_plus"),
    paidThisMonth: paidThisMonth.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    customersOutstanding: new Set(unpaid.map((item) => item.customer_id)).size,
    missingEmail: new Set(unpaid.filter((item) => !item.ar_customers?.primary_email).map((item) => item.customer_id)).size,
  };
}

export async function importArCustomers(rows, fileName, fileSha256) {
  const { data, error } = await supabase.rpc("import_ar_customer_master", {
    p_rows: rows,
    p_file_name: fileName,
    p_file_sha256: fileSha256 || null,
  });
  if (error) throw error;
  return data;
}

export async function importArInvoices(rows, fileName, fileSha256) {
  const { data, error } = await supabase.rpc("import_ar_viettel_invoices", {
    p_rows: rows,
    p_file_name: fileName,
    p_file_sha256: fileSha256 || null,
  });
  if (error) throw error;
  return data;
}

export async function setArInvoicePaid(invoiceId, isPaid, paidAt, note) {
  const { data, error } = await supabase.rpc("set_ar_invoice_paid", {
    p_invoice_id: invoiceId,
    p_is_paid: isPaid,
    p_paid_at: paidAt || null,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
  return data;
}
