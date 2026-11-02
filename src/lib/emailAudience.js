const INTERNAL_ADDRESSES = new Set(["infor@facs.vn", "tunguyen@facs.vn", "yendoan@facs.vn", "thanhhuynh@facs.vn"]);

export function canSelectContact(contact) {
  const email = String(contact.email || "").trim().toLowerCase();
  return contact.status === "subscribed" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !INTERNAL_ADDRESSES.has(email);
}

// Read every page for search/CSV/selection; Supabase caps individual requests.
export async function loadEmailAudience(client) {
  const contacts = [];
  const size = 1000;
  for (let start = 0; ; start += size) {
    const { data, error } = await client.from("insight_email_audience").select("*")
      .order("created_at", { ascending: false }).order("id").range(start, start + size - 1);
    if (error) throw new Error(error.message);
    contacts.push(...(data || []));
    if (!data || data.length < size) return contacts;
  }
}
