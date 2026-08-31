import assert from "node:assert/strict";
import { normalizeRecipients, renderArReminder } from "../supabase/functions/_shared/ar-reminder.mjs";
import {
  deliveryRecipients,
  prepareReminder,
  verifyConfirmation,
} from "../supabase/functions/ar-reminders/handler.mjs";
import { assertDeliveryAllowed, resolveEmailMode } from "../supabase/functions/ar-reminders/transport.mjs";

const source = {
  customer: {
    id: "12345678-1234-1234-1234-123456789abc",
    legal_name: "Công ty <FACS Test>",
    tax_code: "0312345678",
    contact_name: "Ms. An",
    primary_email: "accounting@example.com",
    cc_emails: ["CFO@example.com", "accounting@example.com", "cfo@example.com"],
    preferred_language: "bilingual",
  },
  invoices: [
    { id: "1", invoice_series: "C26TFA", invoice_number: "00000001", invoice_date: "2026-08-01", due_date: "2026-08-30", outstanding_amount: 11_000_000 },
    { id: "2", invoice_series: "C26TFA", invoice_number: "00000002", invoice_date: "2026-08-15", due_date: "2026-09-14", outstanding_amount: 5_500_000 },
  ],
};
const template = {
  subject_template: "AR - {{customer_name}} - {{total_outstanding}}",
  body_vi_template: "Kính gửi {{contact_name}}. Số dư {{total_outstanding}}.",
  body_en_template: "Dear {{contact_name}}. Balance {{total_outstanding}}.",
  updated_at: "2026-08-31T00:00:00Z",
};

let checks = 0;
function check(name, fn) {
  fn(); checks += 1; console.log(`✓ ${name}`);
}
async function checkAsync(name, fn) {
  await fn(); checks += 1; console.log(`✓ ${name}`);
}

const rendered = renderArReminder({ source, template, statementDate: "2026-08-31" });
check("renders the customer name in subject", () => assert.match(rendered.subject, /Công ty <FACS Test>/));
check("escapes customer HTML in body", () => { assert.match(rendered.html, /Công ty &lt;FACS Test&gt;/); assert.doesNotMatch(rendered.html, /Công ty <FACS Test>/); });
check("renders both languages", () => { assert.match(rendered.html, /Kính gửi/); assert.match(rendered.html, /Dear/); });
check("renders every invoice", () => { assert.match(rendered.html, /00000001/); assert.match(rendered.html, /00000002/); });
check("totals outstanding invoices", () => assert.equal(rendered.total_outstanding, 16_500_000));
check("adds an internal test banner", () => assert.match(renderArReminder({ source, template, statementDate: "2026-08-31", test: true }).html, /INTERNAL TEST/));
check("deduplicates and excludes recipients", () => assert.deepEqual(normalizeRecipients(source.customer.cc_emails, [source.customer.primary_email]), ["cfo@example.com"]));
check("uses internal recipient for tests", () => assert.deepEqual(deliveryRecipients(source, "test"), { to: ["tunguyen@facs.vn"], cc: [] }));
check("uses customer and clean CC for live", () => assert.deepEqual(deliveryRecipients(source, "live"), { to: ["accounting@example.com"], cc: ["cfo@example.com"] }));
check("fails live recipient selection without email", () => assert.throws(() => deliveryRecipients({ customer: { cc_emails: [] } }, "live"), /missing/));
check("defaults unknown mode to disabled", () => assert.equal(resolveEmailMode("oops"), "disabled"));
check("blocks all delivery while disabled", () => assert.throws(() => assertDeliveryAllowed({ mode: "disabled", deliveryType: "test", supabaseUrl: "https://zpbdsfkihjwfhasbadmn.supabase.co", requestOrigin: "https://preview.example" }), /disabled/));
check("allows test in test mode", () => assert.doesNotThrow(() => assertDeliveryAllowed({ mode: "test", deliveryType: "test", supabaseUrl: "https://zpbdsfkihjwfhasbadmn.supabase.co", requestOrigin: "https://preview.example" })));
check("blocks live in test mode", () => assert.throws(() => assertDeliveryAllowed({ mode: "test", deliveryType: "live", supabaseUrl: "https://bnfzbhgkkxzjrvdtrhyt.supabase.co", requestOrigin: "https://facs.vn" }), /not enabled/));
check("blocks live outside production project", () => assert.throws(() => assertDeliveryAllowed({ mode: "live", deliveryType: "live", supabaseUrl: "https://zpbdsfkihjwfhasbadmn.supabase.co", requestOrigin: "https://facs.vn" }), /Production/));
check("blocks live outside canonical origin", () => assert.throws(() => assertDeliveryAllowed({ mode: "live", deliveryType: "live", supabaseUrl: "https://bnfzbhgkkxzjrvdtrhyt.supabase.co", requestOrigin: "https://preview.vercel.app" }), /canonical/));
check("allows live only on production origin and ref", () => assert.doesNotThrow(() => assertDeliveryAllowed({ mode: "live", deliveryType: "live", supabaseUrl: "https://bnfzbhgkkxzjrvdtrhyt.supabase.co", requestOrigin: "https://facs.vn" })));
check("requires customer-specific confirmation", () => { assert.equal(verifyConfirmation("send-12345678", source.customer.id), "SEND-12345678"); assert.throws(() => verifyConfirmation("SEND-AR", source.customer.id), /must match/); });
await checkAsync("hash is stable for an unchanged snapshot", async () => {
  const first = await prepareReminder({ source, template, statementDate: "2026-08-31" });
  const second = await prepareReminder({ source, template, statementDate: "2026-08-31", test: true });
  assert.equal(first.source_hash, second.source_hash);
  assert.match(first.source_hash, /^[a-f0-9]{64}$/);
});
await checkAsync("hash changes when AR data changes", async () => {
  const first = await prepareReminder({ source, template, statementDate: "2026-08-31" });
  const changed = structuredClone(source); changed.invoices[0].outstanding_amount += 1;
  const second = await prepareReminder({ source: changed, template, statementDate: "2026-08-31" });
  assert.notEqual(first.source_hash, second.source_hash);
});

console.log(`AR reminder QA passed: ${checks} checks.`);

