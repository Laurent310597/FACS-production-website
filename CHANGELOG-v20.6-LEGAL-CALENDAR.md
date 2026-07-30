# FACS Website v20.6 — Legal Calendar

## Scope

- Replaces the unmerged AI Assistant initiative with a Legal Calendar feature
  developed from the v20.5 production `main` baseline.
- Adds the bilingual public route `/legal-calendar`.
- Adds the top-level `Tiện ích / Resources` navigation tab. The first dropdown
  item is `Lịch pháp lý doanh nghiệp / Corporate Legal Calendar`.
- Adds month, year and compliance-area filters.
- Adds day and monthly deadline views, legal basis, applicability, source
  traceability and `.ics` calendar export.
- Adds protected CMS screens for creating, editing, reviewing, publishing,
  hiding and duplicating deadlines.
- Adds protected source governance and discovery-candidate screens.

## Controlled update workflow

1. The Edge Function checks active public sources at 10:00 and 16:00 Vietnam
   time.
2. It stores source-change or relevant-link candidates in a private review
   queue.
3. A FACS administrator reviews the candidate, confirms applicability and
   cross-checks an official P1 source.
4. The database blocks public publication unless the record is verified, has a
   legal basis, an official-source URL and a publication timestamp.

The monitor does not bypass logins, paywalls or access controls. It does not
copy article bodies and does not auto-publish third-party content.

## Database and Edge Function

- Migration: `supabase/migrations/v20.6-legal-calendar.sql`
- Edge Function: `supabase/functions/legal-calendar-sync/index.ts`
- Cron template: `supabase/cron-v20.6-legal-calendar-template.sql`

## Verification

- `npm run lint`
- `npm run build`
