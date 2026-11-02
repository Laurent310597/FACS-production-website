import { publicationDateBounds } from "./insightPostSearch.js";

export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function historyQuery(client, filters, options) {
  const bounds = publicationDateBounds(filters.from, filters.to);
  let query = client.from("insight_email_delivery_logs").select(
    options.head ? "id" : "id,created_at,delivery_type,delivery_scope,status,bcc_count,bcc_addresses,error_message,posts(title_vi,title_en)", options,
  );
  if (bounds.from) query = query.gte("created_at", bounds.from);
  if (bounds.to) query = query.lt("created_at", bounds.to);
  return query;
}

export async function countEmailHistory(client, filters) {
  const results = await Promise.all([null, "sent", "failed", "processing"].map((status) => {
    const query = historyQuery(client, filters, { count: "exact", head: true });
    return status ? query.eq("status", status) : query;
  }));
  const error = results.find((result) => result.error)?.error;
  if (error) throw new Error(error.message);
  return Object.fromEntries(["total", "sent", "failed", "processing"].map((key, index) => [key, results[index].count || 0]));
}

export function listEmailHistory(client, filters, page, pageSize) {
  const start = page * pageSize;
  return historyQuery(client, filters, { count: "exact" }).order("created_at", { ascending: false }).order("id")
    .range(start, start + pageSize - 1);
}
