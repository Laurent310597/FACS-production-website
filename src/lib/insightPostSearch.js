export const INSIGHT_POST_PAGE_SIZE = 8;
export const INSIGHT_POST_COLUMNS = [
  "id", "title_vi", "title_en", "excerpt_vi", "excerpt_en", "status", "published_at", "updated_at",
  "email_delivery_mode", "email_notification_status", "email_notification_tested_at",
  "email_notification_preview_hash", "email_notification_test_hash",
].join(",");

export const EMPTY_POST_FILTERS = {
  keyword: "", from: "", to: "", publication: "all", email: "all", sort: "newest",
};

function dateStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Ngày đăng không hợp lệ.");
  const day = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value) throw new Error("Ngày đăng không hợp lệ.");
  return new Date(`${value}T00:00:00+07:00`);
}

export function publicationDateBounds(from, to) {
  const start = from ? dateStart(from) : null;
  const end = to ? dateStart(to) : null;
  if (start && end && start > end) throw new Error("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  return {
    from: start?.toISOString(),
    to: end ? new Date(end.getTime() + 86400000).toISOString() : undefined,
  };
}

export function insightKeywordFilter(keyword) {
  // Escape LIKE wildcards, then quote the value for PostgREST's OR grammar.
  // Commas, parentheses and quotes in a user's phrase remain literal text.
  const literal = keyword.trim().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
  if (!literal) return "";
  const quoted = `"%${literal.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}%"`;
  return ["title_vi", "title_en", "excerpt_vi", "excerpt_en", "content_vi", "content_en"]
    .map((column) => `${column}.ilike.${quoted}`).join(",");
}

export function searchInsightPosts(client, filters = EMPTY_POST_FILTERS, page = 0, now = new Date()) {
  const bounds = publicationDateBounds(filters.from, filters.to);
  const phrase = insightKeywordFilter(filters.keyword);
  let query = client.from("posts").select(INSIGHT_POST_COLUMNS, { count: "exact" });
  if (phrase) query = query.or(phrase);
  if (bounds.from) query = query.gte("published_at", bounds.from);
  if (bounds.to) query = query.lt("published_at", bounds.to);
  if (filters.publication === "draft") query = query.eq("status", "draft");
  if (filters.publication === "published") query = query.eq("status", "published").lte("published_at", now.toISOString());
  if (filters.publication === "scheduled") query = query.eq("status", "published").gt("published_at", now.toISOString());
  if (filters.email !== "all") query = query.eq("email_notification_status", filters.email);
  const ascending = filters.sort === "oldest";
  const start = Math.max(0, Math.floor(page)) * INSIGHT_POST_PAGE_SIZE;
  return query.order("published_at", { ascending, nullsFirst: false })
    .order("updated_at", { ascending }).order("id", { ascending: true })
    .range(start, start + INSIGHT_POST_PAGE_SIZE - 1);
}
