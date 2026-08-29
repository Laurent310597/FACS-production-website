# FACS Website v20.19 — AR Tracker Phase 1

## Scope

Viettel S-Invoice remains the authoritative source for invoice creation and issuance. This release adds a focused CMS module for:

- Customer Master management and one-time Excel/CSV import.
- Native Excel `.xlsx` templates for Customer Master and Viettel invoice imports, preserving Vietnamese text and separate columns in Windows Excel.
- Viettel invoice-list import with client-side preview and validation.
- Duplicate prevention by invoice series, number and invoice date.
- Safe re-import of Viettel cancellation/replacement/adjustment status.
- Manual `Đã thu` confirmation with payment date and optional note.
- Mandatory reason when reopening a paid invoice.
- Outstanding-balance and aging dashboard.
- Import history and immutable before/after audit events.

This phase does not include Viettel API, bank integration, Google Sheet two-way sync, payment allocation, email reminders or automatic sending.

## CMS routes

- `/admin/ar`
- `/admin/ar/customers`

## Database migration

Apply `supabase/migrations/v20.19-ar-tracker-phase-1.sql` to the Preview project before testing the Vercel Preview.

The migration creates:

- `ar_customers`
- `ar_invoices`
- `ar_import_runs`
- `ar_audit_events`
- `import_ar_customer_master(...)`
- `import_ar_viettel_invoices(...)`
- `set_ar_invoice_paid(...)`

All AR tables have RLS enabled. Authenticated CMS users can read AR data; invoice creation and payment-state changes are performed through governed database functions. Imported Viettel financial fields are read-only in the browser.

## Import safeguards

- Maximum 10 MB per file and 2,000 records per import.
- Supports `.xlsx` and `.csv`.
- Detects the header within the first 25 rows.
- Requires invoice number, invoice date, total amount and customer name or tax code.
- Rejects duplicate invoice rows within the same file.
- Skips unchanged invoices already stored.
- Re-import only updates Viettel status, due date or a previously blank description; it never overwrites manual collection status.
- Saves SHA-256 of the imported file and an import summary.

## QA commands

```bash
npm run qa:ar
npm run lint
npm run build
git diff --check
```

## Preview acceptance checklist

1. Apply the migration to Supabase Preview only.
2. Deploy the branch to Vercel Preview using the Preview Supabase environment variables.
3. Import a redacted Customer Master sample.
4. Import a redacted Viettel report with at least one new invoice, one duplicate and one cancelled/adjusted invoice.
5. Confirm dashboard totals against the source file.
6. Mark one invoice paid and verify outstanding balance becomes zero.
7. Reopen it with a reason and verify the audit log.
8. Confirm Production remains unchanged.

Do not merge or apply the migration to Production until the above checks are accepted.
