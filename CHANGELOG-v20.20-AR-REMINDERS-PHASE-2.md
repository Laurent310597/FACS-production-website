# FACS v20.20 — AR Reminders Phase 2

## Scope

- Adds a customer-level AR reminder workspace at `/admin/ar/reminders`.
- Keeps Viettel S-Invoice as the authoritative invoice source.
- Builds one statement from all open invoices for the selected customer.
- Uses the fixed shared mailbox `accounting@facs.vn`.
- Adds an editable bilingual organization template.
- Adds Preview → optional internal test → customer confirmation.

## Safety controls

- `FACS_AR_EMAIL_MODE=disabled` blocks test and live delivery (required on Preview).
- `FACS_AR_EMAIL_MODE=test` permits only the internal test recipient `tunguyen@facs.vn`.
- `FACS_AR_EMAIL_MODE=live` is additionally restricted to Supabase Production ref `bnfzbhgkkxzjrvdtrhyt` and origin `https://facs.vn` / `https://www.facs.vn`.
- Live send requires a customer-specific confirmation phrase.
- The preview is valid for 24 hours and is invalidated when the customer, invoice balance, payment status, or template changes.
- Database claim and a partial unique index prevent concurrent or repeated sends of the same snapshot.
- If Microsoft Graph accepts a message but final database logging fails, the attempt is locked for manual review instead of retried.

## Deployment order

1. Apply `supabase/migrations/v20.20-ar-reminders-phase-2.sql` to Supabase Preview.
2. Set Preview secret `FACS_AR_EMAIL_MODE=disabled`.
3. Deploy Edge Function `ar-reminders` with its shared modules.
4. Deploy the branch to Vercel Preview using Preview-only Supabase variables.
5. Confirm status shows `EMAIL LOCKED`; verify preview rendering. Do not send email.

## Rollback

Set `FACS_AR_EMAIL_MODE=disabled` first. The frontend route can then be reverted independently. Phase 2 is additive; existing AR invoices, customers, imports and payment status remain unchanged.
