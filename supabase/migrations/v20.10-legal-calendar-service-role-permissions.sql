-- FACS Website v20.10 - Legal Calendar Edge Function database permissions
-- Run once in Supabase SQL Editor after v20.6-legal-calendar.sql.
-- This migration is additive: it does not change data, disable RLS, or grant
-- access to anon/authenticated users beyond the existing v20.6 policies.

grant usage on schema public to service_role;

-- legal-calendar-sync reads enabled sources and records sync results.
grant select, update
on table public.legal_calendar_sources
to service_role;

-- legal-calendar-sync checks, inserts, and refreshes discovered candidates.
grant select, insert, update
on table public.legal_calendar_candidates
to service_role;
