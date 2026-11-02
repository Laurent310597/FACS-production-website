const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INTERNAL = new Set(["infor@facs.vn", "tunguyen@facs.vn", "yendoan@facs.vn", "thanhhuynh@facs.vn"]);

export function selectedAudienceIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 497 || value.some((id) => typeof id !== "string" || !UUID.test(id))) {
    throw new Error("Vui lòng chọn từ 1 đến 497 khách hàng hợp lệ.");
  }
  return [...new Set(value.map((id: string) => id.toLowerCase()))].sort();
}

export function selectedAudienceSnapshot(ids: string[], contacts: Array<{ id: string; email: string; status: string; display_name?: string | null }>) {
  const rows = contacts.map((contact) => ({ ...contact, email: String(contact.email || "").trim().toLowerCase() }));
  if (rows.length !== ids.length || ids.some((id) => !rows.some((row) => row.id === id))
    || rows.some((row) => row.status !== "subscribed" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || INTERNAL.has(row.email))) {
    throw new Error("Một khách đã chọn không còn được phép nhận email. Hãy tải lại danh sách và chọn lại.");
  }
  return { contacts: rows, bcc: [...new Set(rows.map((row) => row.email))].sort() };
}
