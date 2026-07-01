# FACS Website v20.3 — Insight Email Notifications

## New capabilities

- Per-article switch: send or do not send an email notification.
- Default is OFF for every new article.
- Immediate articles trigger email processing immediately, with Cron as fallback.
- Scheduled articles send only after the public publication time arrives.
- Separate **Cancel email** action that does not cancel the article publication schedule.
- Test email to `tunguyen@facs.vn` before sending customers.
- Fixed routing:
  - From: `info@facs.vn`
  - To: `tunguyen@facs.vn`
  - Cc: `yendoan@facs.vn`, `thanhhuynh@facs.vn`
  - Bcc: all active customer audience records only
- Customer addresses are never copied into To or Cc.
- Lark Mail OAuth connection and automatic token refresh.
- Audience management page with add, subscribe/unsubscribe, delete, CSV import/export.
- Delivery logs and article-level status: disabled, pending, cancelled, processing, sent, failed.
- Lark `dedupe_key` prevents duplicate sends for the same article.
- Full bilingual email template and the approved `info@facs.vn` signature.

## Database additions

- Additional email-control fields on `public.posts`.
- `public.insight_email_audience`.
- `public.insight_email_delivery_logs`.
- Server-only Lark OAuth credential/state tables protected by RLS and revoked browser grants.
- Atomic `claim_due_insight_emails()` RPC to prevent concurrent duplicate processing.

## Edge Functions

- `insight-email`: OAuth status/start, test email, immediate processing and Cron processing.
- `lark-oauth-callback`: exchanges the authorization code, stores and rotates Lark OAuth tokens.

## Important

This package contains no App Secret, access token, refresh token, Supabase secret key, customer list or password.
