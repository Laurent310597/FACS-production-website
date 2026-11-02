// Exercise the deployed handler's request routing and Microsoft Graph payload.
// Every fetch is intercepted; this test has no network permission and sends no mail.
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("Insights handler: targeted sends, repeat campaigns and request idempotency", async (test) => {
  const originalFetch = globalThis.fetch;
  const originalServe = Deno.serve;
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MICROSOFT_TENANT_ID", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"];
  const prior = keys.map((key) => Deno.env.get(key));
  keys.forEach((key) => Deno.env.set(key, key === "SUPABASE_URL" ? "https://qa.invalid" : "local-test-fixture"));
  let handler: (request: Request) => Promise<Response>;
  Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
  const post: Record<string, any> = { id: crypto.randomUUID(), title_vi: "Bài đã gửi", title_en: "Sent article", excerpt_vi: "Mô tả", slug: "sent-article",
    status: "published", published_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-02T01:00:00Z", email_delivery_mode: "review_after_publish", email_notification_status: "sent" };
  const contacts = [{ id: crypto.randomUUID(), email: "first@example.com", status: "subscribed" }, { id: crypto.randomUUID(), email: "second@example.com", status: "subscribed" }, { id: crypto.randomUUID(), email: "optout@example.com", status: "unsubscribed" }];
  const messages: any[] = [];
  const claims = new Map<string, any>();
  const claimedArguments: any[] = [];
  const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    if (url.hostname === "login.microsoftonline.com") return response({ access_token: "local-test-token" });
    const body = init.body ? JSON.parse(String(init.body)) : {};
    if (url.pathname === "/auth/v1/user") return response({ id: "00000000-0000-4000-8000-000000000010", aud: "authenticated", email: "qa@example.invalid" });
    if (url.pathname === "/rest/v1/posts") {
      if (init.method === "PATCH") Object.assign(post, body);
      return response(post);
    }
    if (url.pathname === "/rest/v1/insight_email_audience") {
      const id = url.searchParams.get("id");
      if (id?.startsWith("eq.")) return response(contacts.find((contact) => id === `eq.${contact.id}`));
      return response(contacts.filter((contact) => (!id || id.includes(contact.id)) && (!url.searchParams.has("status") || url.searchParams.get("status") === `eq.${contact.status}`)));
    }
    if (url.pathname === "/rest/v1/insight_email_delivery_logs") return response({ id: crypto.randomUUID() });
    if (url.pathname.endsWith("/rpc/claim_insight_email_delivery") || url.pathname.endsWith("/rpc/claim_insight_email_selected_delivery")) {
      claimedArguments.push(body);
      const saved = claims.get(body.p_request_id);
      if (saved) return response({ ...saved, duplicate: true, status: "sent" });
      const target = contacts.find((contact) => contact.id === body.p_audience_id);
      const selection = body.p_audience_ids ? contacts.filter((contact) => body.p_audience_ids.includes(contact.id)) : null;
      if (body.p_audience_id && target?.status !== "subscribed") return response({ message: "Khách hàng không còn trong danh sách đang nhận." }, 400);
      const claim = { post: { ...post }, log_id: crypto.randomUUID(), request_id: body.p_request_id, status: "processing",
        audience_id: body.p_audience_id, bcc: selection ? selection.map((contact) => contact.email).sort() : target ? [target.email] : contacts.filter((contact) => contact.status === "subscribed").map((contact) => contact.email),
        cc: target ? [] : ["yendoan@facs.vn", "thanhhuynh@facs.vn"] };
      claims.set(body.p_request_id, claim);
      return response(claim);
    }
    if (url.pathname.endsWith("/rpc/finalize_insight_email_delivery")) { post.email_notification_status = "sent"; return response(null); }
    if (url.hostname === "graph.microsoft.com" && url.pathname.endsWith("/sendMail")) { messages.push(body.message); return new Response(null, { status: 202 }); }
    throw new Error(`Unexpected outbound request: ${url.pathname}`);
  };
  const invoke = async (action: string, payload: Record<string, unknown> = {}, auth = true) => {
    const res = await handler(new Request("https://qa.invalid/functions/v1/insight-email", { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer local-test-user" } : {}) }, body: JSON.stringify({ action, ...payload }) }));
    return { status: res.status, data: await res.json() };
  };
  try {
    await import("../supabase/functions/insight-email/index.ts");
    await test.step("unauthenticated callers cannot send", async () => {
      check((await invoke("confirm_single", {}, false)).status === 401, "Expected 401");
      check(messages.length === 0, "No provider call before authentication");
    });
    const preview = await invoke("preview_single", { post_id: post.id, audience_id: contacts[1].id });
    check(preview.status === 200 && preview.data.recipients.bcc[0] === contacts[1].email, "Preview must show selected customer");
    const singlePayload = { post_id: post.id, audience_id: contacts[1].id, preview_hash: preview.data.preview_hash, request_id: crypto.randomUUID(), confirmation_text: "SEND-SINGLE" };
    await test.step("actual Graph payload has just the selected customer in Bcc", async () => {
      const sent = await invoke("confirm_single", singlePayload);
      check(sent.status === 200, JSON.stringify(sent.data));
      check(messages.length === 1 && messages[0].bccRecipients.length === 1, "Expected exactly one Bcc");
      check(messages[0].bccRecipients[0].emailAddress.address === contacts[1].email, "Wrong customer");
      check(messages[0].ccRecipients.length === 0, "Individual emails must not add Cc recipients");
      check(messages[0].toRecipients[0].emailAddress.address === "tunguyen@facs.vn", "Owner To address must remain fixed");
      check(claimedArguments[0].p_audience_id === contacts[1].id, "Claim must target the selected audience row");
    });
    await test.step("repeating the same request does not submit another email", async () => {
      const again = await invoke("confirm_single", singlePayload);
      check(again.status === 200 && again.data.result.already_processed, "Expected idempotent result");
      check(messages.length === 1, "Duplicate provider submission");
    });
    await test.step("changed content requires a new individual preview", async () => {
      post.title_vi = "Updated content";
      check((await invoke("confirm_single", { ...singlePayload, request_id: crypto.randomUUID() })).status !== 200, "Must reject stale preview");
      check(messages.length === 1, "Stale preview must not send");
      post.title_vi = "Bài đã gửi";
    });
    await test.step("unsubscribed contacts cannot be selected for individual delivery", async () => {
      check((await invoke("preview_single", { post_id: post.id, audience_id: contacts[2].id })).status !== 200, "Must reject unsubscribed recipient");
    });
    await test.step("a previously sent article can be reviewed and deliberately sent again", async () => {
      const reviewed = await invoke("preview", { post_id: post.id });
      check(reviewed.status === 200, "Preview failed");
      const tested = await invoke("test", { post_id: post.id });
      check(tested.status === 200 && tested.data.post.email_notification_test_hash, "Test must return saved workflow state");
      check(tested.data.server_now && tested.data.post.email_notification_tested_at, "Server clock and test timestamp are required");
      const sent = await invoke("confirm_send", { post_id: post.id, request_id: crypto.randomUUID(), confirmation_text: "SEND-AUDIENCE" });
      check(sent.status === 200 && sent.data.recipients.bcc_count === 2, "Full resend failed");
      const last = messages.at(-1);
      check(last.bccRecipients.length === 2 && last.ccRecipients.length === 2, "Bulk recipient scope is wrong");
      const repeated = await invoke("confirm_send", { post_id: post.id, request_id: crypto.randomUUID(), confirmation_text: "SEND-AUDIENCE" });
      check(repeated.status === 200, "A new deliberate request must remain possible");
      check(last.internetMessageHeaders[0].value !== messages.at(-1).internetMessageHeaders[0].value, "Distinct sends must have distinct delivery keys");
    });
    await test.step("selected-group preview and Graph payload include exactly the chosen Bcc contacts", async () => {
      contacts.push({ id: crypto.randomUUID(), email: "not-selected@example.com", status: "subscribed" });
      const ids = [contacts[0].id, contacts[1].id];
      const preview = await invoke("preview_selected", { post_id: post.id, audience_ids: ids });
      check(preview.status === 200 && preview.data.contacts.length === 2, "Selection preview failed");
      const payload = { post_id: post.id, audience_ids: ids, expected_bcc: preview.data.recipients.bcc,
        preview_hash: preview.data.preview_hash, confirmation_text: "SEND-SELECTED", request_id: crypto.randomUUID() };
      const before = messages.length;
      const sent = await invoke("confirm_selected", payload);
      check(sent.status === 200 && sent.data.recipients.bcc_count === 2, "Selected send failed");
      const addresses = messages.at(-1).bccRecipients.map((recipient: any) => recipient.emailAddress.address).sort();
      check(JSON.stringify(addresses) === JSON.stringify([contacts[0].email, contacts[1].email].sort()), "Selected Bcc expanded beyond selection");
      check(messages.at(-1).ccRecipients.length === 2, "Selected groups preserve the Audience Cc");
      check(messages.at(-1).toRecipients[0].emailAddress.address === "tunguyen@facs.vn", "To must remain internal");
      check(claimedArguments.at(-1).p_audience_ids.length === 2 && !claimedArguments.at(-1).p_audience_id, "Must use the selected-group claim");
      await invoke("confirm_selected", payload);
      check(messages.length === before + 1, "Repeated selected request submitted a duplicate email");
      check((await invoke("confirm_selected", { ...payload, audience_ids: [], request_id: crypto.randomUUID() })).status !== 200, "Empty selection must be rejected");
      check((await invoke("preview_selected", { post_id: post.id, audience_ids: [contacts[2].id] })).status !== 200, "Opt-out selection must be rejected");
      check(messages.length === before + 1, "Invalid selection must not send");
    });
  } finally {
    globalThis.fetch = originalFetch;
    Deno.serve = originalServe;
    keys.forEach((key, index) => prior[index] === undefined ? Deno.env.delete(key) : Deno.env.set(key, prior[index]!));
  }
});
