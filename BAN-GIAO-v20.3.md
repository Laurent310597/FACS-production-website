# BÀN GIAO FACS WEBSITE v20.3

## Baseline

- Based on FACS Website v20.2 Scheduled Publishing.
- Intended as a combined upgrade from the current v20.1 production baseline as well.
- Repository: `Laurent310597/FACS-production-website`.
- Vercel project: `facs-production-website`.
- Supabase project: `facs-website`.

## Locked email rules

- Sender: `info@facs.vn`.
- To: `tunguyen@facs.vn`.
- Cc: `yendoan@facs.vn`, `thanhhuynh@facs.vn`.
- Customers: Bcc only.
- No batching is implemented while total recipients remain within Lark's 500-recipient limit.
- Each article opts in separately; default is no email.
- Cancelling email does not cancel publication.

## Files to use

- Existing production v20.1: run `supabase/migrations/v20.1-to-v20.3-combined.sql`.
- Already upgraded to v20.2: run `supabase/migrations/v20.3-insight-email-notifications.sql`.
- Fresh project: run the full `supabase/setup.sql`.
- Scheduled processing: configure `supabase/cron-v20.3-template.sql` after functions are deployed.

## Validation completed

- `npm ci`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Edge Function TypeScript syntax bundled successfully with esbuild.

## Validation not possible offline

A live end-to-end Lark send was not performed because App ID, App Secret, OAuth authorization and production Supabase deployment are intentionally not included in the package. Complete one test email after activation before enabling any customer audience.
