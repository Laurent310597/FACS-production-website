# FACS v20.17 — Insight Email Safe Delivery

## Outcome

Email Insights now follows a mandatory governed sequence:

1. Preview the exact email and recipient counts.
2. Send a test only to `tunguyen@facs.vn` (no Cc/Bcc).
3. Type `SEND-AUDIENCE` and confirm the Audience send.

Publishing or scheduling an article never sends email by itself.

## Article delivery modes

- `disabled`: publish without an email workflow (default).
- `review_after_publish`: open the email review screen after publishing.
- `manual_later`: publish first and start the workflow later from Email & Audience.

All non-disabled modes still require Preview → Test → Confirm. Articles that have
already sent an Audience email remain locked against repeat sending when edited.

## Safety controls

- The reviewed/tested content is protected by a SHA-256 snapshot hash.
- Content changes invalidate the previous preview and test.
- Tests expire after 24 hours.
- Only published, publicly due articles can be confirmed.
- Audience addresses remain Bcc-only and are deduplicated.
- Fixed sender/recipients remain:
  - From: `infor@facs.vn`
  - To: `tunguyen@facs.vn`
  - Cc: `yendoan@facs.vn`, `thanhhuynh@facs.vn`
- Concurrent confirmations are claimed atomically in PostgreSQL.
- If Microsoft Graph accepts the email but the final database transaction fails,
  the post remains locked in `processing` for manual Sent Items verification. It
  is not automatically retried.

## Preview deployment order

1. Apply `supabase/migrations/v20.17-insight-email-safe-delivery.sql` to the
   isolated Supabase Preview project.
2. Deploy the `insight-email` Edge Function to that Preview project.
3. Deploy the frontend branch with Vercel Preview variables pointing only to the
   Supabase Preview project.
4. Test with an internal-only Audience record before any broader Audience test.

## Required acceptance checks

- Saving a draft or publishing with `disabled` sends nothing.
- `review_after_publish` opens the workflow but does not send automatically.
- Step 2 is unavailable before Step 1.
- Step 3 is unavailable before Step 2, with an empty Audience, or before the
  article is public.
- Editing title, excerpt, slug, publication time, status, or delivery mode clears
  the previous preview/test approval.
- Test email has no Cc or Bcc.
- Audience email has fixed To/Cc and subscribed customers only in Bcc.
- A second confirmation for the same article cannot send again.
- `main`, Supabase Production, and Vercel Production remain unchanged until a
  separately approved cutover.

## Rollback

Revert the frontend and Edge Function commit. Keep the added database columns and
functions in place; they are backward-compatible and their defaults do not send
email. Do not drop audit columns during an emergency rollback.
