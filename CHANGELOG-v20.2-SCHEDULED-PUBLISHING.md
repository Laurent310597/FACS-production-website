# FACS Website v20.2 — Scheduled Publishing

## New functions

- Added **Schedule publication** to the Insights article editor.
- Added a Vietnam date/time selector using **Asia/Ho_Chi_Minh (UTC+7)**.
- Added three operational actions: **Save draft**, **Schedule**, and **Publish now**.
- Added validation preventing invalid or past publication times.
- Added derived article states in Admin: **Draft**, **Scheduled**, and **Published**.
- Added status filtering for scheduled articles.
- Added the exact scheduled publication time to the Admin article list.
- Public Insights and article pages refresh every 60 seconds and when the browser regains focus.

## Technical approach

A scheduled article is stored with:

- `status = 'published'`
- `published_at` set to a future UTC timestamp

Supabase Row Level Security only allows public access when `published_at <= now()`. No Cron job is required for basic scheduled publication.

## Database migration

Run:

`supabase/migrations/v20.2-scheduled-publishing.sql`

The migration does not delete or rewrite existing posts.
