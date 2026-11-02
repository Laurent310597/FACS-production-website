import assert from "node:assert/strict";
import test from "node:test";
import { buildFormReceiptTestMail } from "../supabase/functions/_shared/form-email-test.ts";
import { buildEditableReceipt } from "../supabase/functions/_shared/form-email-templates.ts";
import { buildInsightEmail } from "../supabase/functions/_shared/email-template.ts";
import { createClient } from "@supabase/supabase-js";
import { EMPTY_POST_FILTERS, publicationDateBounds, searchInsightPosts } from "../src/lib/insightPostSearch.js";
import { emailReviewState, workflowTime } from "../src/lib/insightEmailWorkflow.js";
import { deliverInsightClaim } from "../supabase/functions/_shared/insight-delivery.ts";
import { selectedAudienceIds, selectedAudienceSnapshot } from "../supabase/functions/_shared/insight-selection.ts";
import { canSelectContact, loadEmailAudience } from "../src/lib/emailAudience.js";
import { countEmailHistory, listEmailHistory, vietnamToday } from "../src/lib/emailHistory.js";

const now = new Date("2026-10-31T12:00:00Z");
const siteUrl = "https://facs.vn";

test("selected recipients require a nonempty bounded list of IDs and every contact must still be subscribed", () => {
  const first = "00000000-0000-4000-8000-000000000001";
  const second = "00000000-0000-4000-8000-000000000002";
  assert.deepEqual(selectedAudienceIds([second, first, first]), [first, second]);
  for (const value of [null, [], ["bad"], Array(498).fill(first)]) assert.throws(() => selectedAudienceIds(value));
  const rows = [{ id: first, email: " FIRST@example.com ", status: "subscribed" }, { id: second, email: "second@example.com", status: "subscribed" }];
  assert.deepEqual(selectedAudienceSnapshot([first, second], rows).bcc, ["first@example.com", "second@example.com"]);
  assert.throws(() => selectedAudienceSnapshot([first, second], rows.slice(1)));
  assert.throws(() => selectedAudienceSnapshot([first, second], [{ ...rows[0], status: "unsubscribed" }, rows[1]]));
  assert.throws(() => selectedAudienceSnapshot([first], [{ ...rows[0], email: "tunguyen@facs.vn" }]));
  assert.equal(canSelectContact(rows[0]), true);
  assert.equal(canSelectContact({ ...rows[0], status: "unsubscribed" }), false);
  assert.equal(canSelectContact({ ...rows[0], email: "infor@facs.vn" }), false);
});

test("selected group transport never expands the snapshot to the full audience", async () => {
  let recipients;
  await deliverInsightClaim({ post: {}, log_id: "log", status: "processing", request_id: "selected", audience_id: null,
    bcc: ["chosen1@example.com", "chosen2@example.com"], cc: ["yendoan@facs.vn", "thanhhuynh@facs.vn"] }, {
    send: async (value) => { recipients = value; return {}; }, finalize: async () => {}, fail: async () => assert.fail(),
  });
  assert.deepEqual(recipients.bcc.map((row) => row.mail_address), ["chosen1@example.com", "chosen2@example.com"]);
  assert.equal(recipients.cc.length, 2);
});

test("Vietnam history day remains correct around midnight regardless of the PC timezone", () => {
  assert.equal(vietnamToday(new Date("2026-11-02T16:59:59Z")), "2026-11-02");
  assert.equal(vietnamToday(new Date("2026-11-02T17:00:00Z")), "2026-11-03");
});

test("history filters and exact counts run on the entire requested range, with bounded detail pages", async () => {
  const requests = [];
  const client = createClient("https://test.invalid", "fixture-public-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (url, init) => {
    const parsed = new URL(url); requests.push({ url: parsed, method: init.method });
    const count = ({ "eq.sent": 24, "eq.failed": 2, "eq.processing": 1 })[parsed.searchParams.get("status")] ?? 27;
    return new Response(init.method === "HEAD" ? null : JSON.stringify([{ id: "page-entry" }]), { status: 200, headers: { "Content-Type": "application/json", "Content-Range": `0-0/${count}` } });
  } } });
  const filters = { from: "2026-11-01", to: "2026-11-02" };
  assert.deepEqual(await countEmailHistory(client, filters), { total: 27, sent: 24, failed: 2, processing: 1 });
  const rows = await listEmailHistory(client, filters, 2, 5);
  assert.equal(rows.count, 27);
  assert.equal(requests.length, 5);
  assert.ok(requests.slice(0, 4).every((request) => request.method === "HEAD"));
  for (const request of requests) assert.deepEqual(request.url.searchParams.getAll("created_at"), ["gte.2026-10-31T17:00:00.000Z", "lt.2026-11-02T17:00:00.000Z"]);
  assert.equal(requests[4].url.searchParams.get("offset"), "10");
  assert.equal(requests[4].url.searchParams.get("limit"), "5");
});

test("Audience loading reads past Supabase's first 1000 rows for selection and CSV", async () => {
  const ranges = [];
  const rows = Array.from({ length: 1001 }, (_, index) => ({ id: String(index) }));
  const client = { from: () => ({ select: () => ({ order() { return this; }, async range(from, to) { ranges.push([from, to]); return { data: rows.slice(from, to + 1) }; } }) }) };
  assert.equal((await loadEmailAudience(client)).length, 1001);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999]]);
});

test("Insights, HR and Contact justify body paragraphs while preserving readable signatures and actions", () => {
  const insight = buildInsightEmail({ id: "sample", slug: "sample", title_vi: "Tiêu đề", excerpt_vi: "Đoạn văn dài cần căn đều.", excerpt_en: "A paragraph to justify." }, siteUrl);
  assert.match(insight.html, /<p align="justify"[^>]*text-align:justify[^>]*>Đoạn văn dài/);
  assert.match(insight.html, /<h2 style="text-align:left/);
  for (const senderEmail of ["hr@facs.vn", "contact@facs.vn"]) {
    const mail = buildFormReceiptTestMail({ senderEmail, siteUrl, now, template: { body_vi: "Đoạn văn tiếng Việt.", body_en: "An English paragraph." } });
    assert.match(mail.bodyHtml, /<p align="justify"[^>]*text-align:justify[^>]*>Đoạn văn tiếng Việt/);
    assert.match(mail.bodyHtml, /text-align:left[^>]*>FACS \(VIETNAM\) TEAM/);
    assert.match(mail.bodyHtml, /font-family:Arial,Helvetica,sans-serif/);
  }
});

test("a sent article remains eligible for another deliberately reviewed Audience send", () => {
  const post = { id: "post", status: "published", published_at: "2026-10-30T12:00:00Z", email_notification_status: "sent",
    email_notification_preview_hash: "review", email_notification_test_hash: "review", email_notification_tested_at: now.toISOString() };
  const preview = { post_id: "post", preview_hash: "review" };
  assert.deepEqual(emailReviewState(post, preview, now.getTime()), { previewReady: true, testReady: true, isPublic: true });
  assert.equal(emailReviewState(post, preview, now.getTime() + 86400001).testReady, false);
  assert.equal(emailReviewState({ ...post, email_notification_test_hash: "old-content" }, preview, now.getTime()).testReady, false);
  assert.equal(emailReviewState(post, { ...preview, post_id: "different" }, now.getTime()).previewReady, false);
});

test("workflow uses server time immediately even when the customer's PC clock is hours behind", () => {
  const anchor = { serverMs: now.getTime(), monotonicMs: 5000 };
  const post = { id: "post", status: "published", published_at: "2026-10-30T12:00:00Z",
    email_notification_preview_hash: "review", email_notification_test_hash: "review", email_notification_tested_at: now.toISOString() };
  assert.equal(emailReviewState(post, { post_id: "post", preview_hash: "review" }, workflowTime(anchor, 5001)).testReady, true);
  assert.equal(workflowTime(anchor, 6500), now.getTime() + 1500);
});

const singleClaim = { post: { id: "post" }, log_id: "log", status: "processing", request_id: "intent-1", audience_id: "customer-2", bcc: ["second@example.com"], cc: [] };

test("individual delivery gives the transport exactly the selected customer in Bcc", async () => {
  let sent;
  let finalized = false;
  const result = await deliverInsightClaim(singleClaim, {
    send: async (recipients) => { sent = recipients; return { message_id: "accepted" }; },
    finalize: async () => { finalized = true; }, fail: async () => { assert.fail("must not fail"); },
  });
  assert.deepEqual(sent.bcc, [{ mail_address: "second@example.com" }]);
  assert.deepEqual(sent.cc, []);
  assert.equal(result.bcc_count, 1);
  assert.equal(finalized, true);
});

test("an idempotent retry never invokes the mail transport again", async () => {
  const result = await deliverInsightClaim({ ...singleClaim, duplicate: true, status: "sent" }, {
    send: async () => { assert.fail("duplicate send"); }, finalize: async () => { assert.fail("duplicate finalize"); }, fail: async () => { assert.fail("duplicate failure"); },
  });
  assert.equal(result.already_processed, true);
});

test("separate intentional resend requests have distinct delivery identifiers", async () => {
  const identifiers = [];
  for (const request_id of ["first-intent", "second-intent"]) {
    await deliverInsightClaim({ ...singleClaim, audience_id: null, request_id, bcc: ["first@example.com", "second@example.com"], cc: ["staff@facs.vn"] }, {
      send: async (recipients) => { identifiers.push(recipients.dedupeKey); return {}; }, finalize: async () => {}, fail: async () => {},
    });
  }
  assert.notEqual(identifiers[0], identifiers[1]);
});

test("an individual claim cannot accidentally fan out to several Bcc recipients", async () => {
  await assert.rejects(deliverInsightClaim({ ...singleClaim, bcc: ["first@example.com", "second@example.com"] }, {
    send: async () => { assert.fail("must not send"); }, finalize: async () => {}, fail: async () => {},
  }), /phạm vi gửi/);
});

test("a provider-accepted email with a database failure stays locked for reconciliation", async () => {
  let failed = false;
  await assert.rejects(deliverInsightClaim(singleClaim, {
    send: async () => ({ message_id: "accepted" }), finalize: async () => { throw new Error("database offline"); },
    fail: async () => { failed = true; },
  }), /Sent Items/);
  assert.equal(failed, false);
});

test("a failure before provider acceptance records a failure and does not retry", async () => {
  let attempts = 0;
  let message;
  await assert.rejects(deliverInsightClaim(singleClaim, {
    send: async () => { attempts += 1; throw new Error("token rejected"); }, finalize: async () => { assert.fail("must not finalize"); },
    fail: async (error) => { message = error; },
  }), /token rejected/);
  assert.equal(attempts, 1);
  assert.equal(message, "token rejected");
});

for (const senderEmail of ["contact@facs.vn", "hr@facs.vn"]) {
  test(`${senderEmail}: receipt test is internal-only and clearly marked`, () => {
    const mail = buildFormReceiptTestMail({ senderEmail, siteUrl, now });
    assert.deepEqual(mail.to, [{ mail_address: "tunguyen@facs.vn", name: "Tu Nguyen" }]);
    assert.deepEqual(mail.cc, []);
    assert.deepEqual(mail.bcc, []);
    assert.deepEqual(mail.replyTo, [{ mail_address: senderEmail }]);
    assert.match(mail.subject, /^\[TEST\] /);
    assert.match(mail.bodyHtml, /INTERNAL TEST/);
    assert.match(mail.bodyHtml, /Nguyễn Văn A/);
    assert.match(mail.bodyHtml, /Dear/);
    assert.doesNotMatch(mail.bodyHtml, /\{\{(?:full_name|position|company_name|service_interest)\}\}/);
  });
}

test("custom saved receipt uses the actual production renderer", () => {
  const template = { template_key: "contact_receipt", subject: "Xác nhận {{full_name}}", body_vi: "Xin chào {{full_name}} tại {{company_name}}.", body_en: "Dear {{full_name}}, service: {{service_interest}}." };
  const mail = buildFormReceiptTestMail({ senderEmail: "contact@facs.vn", siteUrl, template, now });
  const actual = buildEditableReceipt("contact", { id: "sample", full_name: "Nguyễn Văn A", email: "tunguyen@facs.vn", company_name: "ABC Company", service_interest: "Tax Advisory", message: "sample", submitted_at: now.toISOString(), internal_email_attempts: 0, receipt_email_attempts: 0 }, siteUrl, template);
  assert.equal(mail.subject, `[TEST] ${actual.subject}`);
  assert.equal(mail.bodyHtml.replace(/<div style="padding:12px 16px;[^]*?<\/div>/, ""), actual.html);
  assert.match(mail.bodyHtml, /ABC Company/);
  assert.match(mail.bodyHtml, /Tax Advisory/);
});

test("custom career template resolves the position and preserves both languages", () => {
  const mail = buildFormReceiptTestMail({ senderEmail: "hr@facs.vn", siteUrl, now, template: { template_key: "career_receipt", subject: "Ứng tuyển {{position}}", body_vi: "Vị trí {{position}}", body_en: "Position {{position}}" } });
  assert.equal(mail.subject, "[TEST] Ứng tuyển Tax Consultant");
  assert.match(mail.bodyHtml, /Vị trí Tax Consultant/);
  assert.match(mail.bodyHtml, /Position Tax Consultant/);
});

test("template text is escaped instead of becoming active email HTML", () => {
  const mail = buildFormReceiptTestMail({ senderEmail: "contact@facs.vn", siteUrl, now, template: { body_vi: '<img src=x onerror="alert(1)">', body_en: '<script>alert(1)</script>' } });
  assert.match(mail.bodyHtml, /&lt;img/);
  assert.match(mail.bodyHtml, /&lt;script&gt;/);
  assert.doesNotMatch(mail.bodyHtml, /<script>/);
});

test("unapproved senders and mismatched mailbox templates are rejected", () => {
  assert.throws(() => buildFormReceiptTestMail({ senderEmail: "external@example.com", siteUrl, now }));
  assert.throws(() => buildFormReceiptTestMail({ senderEmail: "contact@facs.vn", siteUrl, now, template: { template_key: "career_receipt" } }));
});

test("Insight email remains bilingual, preserves article URLs, and marks tests", () => {
  const post = { id: "sample", slug: "sample", slug_vi: "bai-viet", slug_en: "article", title_vi: "Tiêu đề mẫu", title_en: "Sample title", excerpt_vi: "Nội dung mẫu", excerpt_en: "Sample description", published_at: now.toISOString() };
  const mail = buildInsightEmail(post, siteUrl, true);
  assert.match(mail.subject, /^\[TEST\]/);
  assert.match(mail.html, /Tiêu đề mẫu/);
  assert.match(mail.html, /Sample title/);
  assert.equal(mail.articleUrlVi, `${siteUrl}/insights/bai-viet`);
  assert.equal(mail.articleUrlEn, `${siteUrl}/insights/article`);
});

test("Insight titles, excerpts and slugs cannot insert active email markup", () => {
  const mail = buildInsightEmail({ id: "sample", slug: '\"><script>alert(1)</script>', title_vi: '<img src=x onerror="alert(1)">', excerpt_en: '<script>alert(1)</script>' }, siteUrl);
  assert.doesNotMatch(mail.html, /<script|<img src=x/i);
  assert.match(mail.html, /&lt;img/);
  assert.match(mail.html, /&lt;script&gt;/);
  assert.ok(mail.articleUrl.includes("%3Cscript%3E"));
});

test("date filters include the entire Vietnam calendar day at both boundaries", () => {
  assert.deepEqual(publicationDateBounds("2026-10-31", "2026-10-31"), { from: "2026-10-30T17:00:00.000Z", to: "2026-10-31T17:00:00.000Z" });
  assert.deepEqual(publicationDateBounds("2028-02-29", "2028-02-29"), { from: "2028-02-28T17:00:00.000Z", to: "2028-02-29T17:00:00.000Z" });
});

test("date filters reject impossible or reversed dates and accept open ranges", () => {
  assert.throws(() => publicationDateBounds("2026-02-29", ""), /không hợp lệ/);
  assert.throws(() => publicationDateBounds("2026-11-02", "2026-11-01"), /bắt đầu/);
  assert.deepEqual(publicationDateBounds("", ""), { from: undefined, to: undefined });
});

test("article search combines filters with bounded pagination through the Supabase client", async () => {
  let request;
  const client = createClient("https://test.invalid", "public-test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (url, init) => {
    request = { url: new URL(url), headers: new Headers(init.headers) };
    return new Response(JSON.stringify([{ id: "matched" }]), { status: 206, headers: { "content-type": "application/json", "content-range": "8-8/42" } });
  } } });
  const { data, count, error } = await searchInsightPosts(client, { ...EMPTY_POST_FILTERS, keyword: 'tax, "law" (100%)', publication: "scheduled", email: "awaiting_review", from: "2026-11-01", sort: "oldest" }, 1, new Date("2026-11-01T00:00:00Z"));
  assert.equal(error, null);
  assert.equal(count, 42);
  assert.equal(data[0].id, "matched");
  assert.equal(request.url.searchParams.get("offset"), "8");
  assert.equal(request.url.searchParams.get("limit"), "8");
  assert.equal(request.url.searchParams.get("status"), "eq.published");
  assert.equal(request.url.searchParams.get("email_notification_status"), "eq.awaiting_review");
  assert.deepEqual(request.url.searchParams.getAll("published_at"), ["gte.2026-10-31T17:00:00.000Z", "gt.2026-11-01T00:00:00.000Z"]);
  assert.match(request.url.searchParams.get("or"), /content_vi\.ilike/);
  assert.match(request.url.searchParams.get("or"), /content_en\.ilike/);
  assert.ok(!request.url.searchParams.get("select").includes("content_vi"));
  assert.match(request.headers.get("prefer"), /count=exact/);
});
