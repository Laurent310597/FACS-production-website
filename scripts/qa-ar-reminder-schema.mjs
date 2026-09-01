import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../supabase/migrations/v20.20-ar-reminders-phase-2.sql", import.meta.url), "utf8");
const contracts = [
  ["template table", /create table if not exists public\.ar_reminder_template/i],
  ["review table", /create table if not exists public\.ar_reminder_reviews/i],
  ["delivery table", /create table if not exists public\.ar_reminder_deliveries/i],
  ["single template seed", /on conflict \(template_key\) do nothing/i],
  ["customer list RPC", /function public\.list_ar_reminder_customers\(\)/i],
  ["source snapshot RPC", /function public\.ar_reminder_source\(p_customer_id uuid\)/i],
  ["save template RPC", /function public\.save_ar_reminder_template/i],
  ["atomic claim RPC", /function public\.claim_ar_reminder/i],
  ["finalization RPC", /function public\.finish_ar_reminder/i],
  ["duplicate send lock", /ar_reminder_deliveries_no_duplicate_idx/i],
  ["24-hour expiry field", /expires_at timestamptz not null/i],
  ["source invalidation trigger", /guard_ar_invoice_reminder_source/i],
  ["authenticated read policies", /Authenticated users can read AR reminder deliveries/i],
  ["PostgREST reload", /notify pgrst, 'reload schema'/i],
];

for (const [name, pattern] of contracts) {
  assert.match(sql, pattern, `Missing schema contract: ${name}`);
  console.log(`✓ ${name}`);
}
assert.doesNotMatch(sql, /insert\s+into\s+public\.ar_(customers|invoices)/i, "Phase 2 must not import customer or invoice data");
console.log(`AR reminder schema QA passed: ${contracts.length + 1} checks.`);

