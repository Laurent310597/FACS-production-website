import { normalizeRecipients, renderArReminder } from "../_shared/ar-reminder.mjs";
import { assertDeliveryAllowed, resolveEmailMode } from "./transport.mjs";

export const AR_SENDER = "accounting@facs.vn";
export const AR_TEST_RECIPIENT = "tunguyen@facs.vn";
export const REVIEW_VALIDITY_MS = 24 * 60 * 60 * 1000;

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareReminder({ source, template, statementDate, test = false }) {
  const rendered = renderArReminder({ source, template, statementDate, test });
  const sourceHash = await sha256Hex(JSON.stringify({
    schema: "2026-08-31-v1",
    source,
    template: {
      subject_template: template.subject_template,
      body_vi_template: template.body_vi_template,
      body_en_template: template.body_en_template,
      updated_at: template.updated_at || null,
    },
    statement_date: statementDate,
  }));
  return { ...rendered, source_hash: sourceHash };
}

export function deliveryRecipients(source, deliveryType) {
  if (deliveryType === "test") return { to: [AR_TEST_RECIPIENT], cc: [] };
  const primary = String(source?.customer?.primary_email || "").trim().toLowerCase();
  if (!primary) throw new Error("Customer is missing an accounting email.");
  const cc = normalizeRecipients(source?.customer?.cc_emails || [], [AR_SENDER, primary]);
  return { to: [primary], cc };
}

export function verifyConfirmation(value, customerId) {
  const expected = `SEND-${String(customerId || "").slice(0, 8).toUpperCase()}`;
  if (String(value || "").trim().toUpperCase() !== expected) {
    throw new Error(`Confirmation must match ${expected}.`);
  }
  return expected;
}

export function currentMode(envValue) {
  return resolveEmailMode(envValue);
}

export { assertDeliveryAllowed };

