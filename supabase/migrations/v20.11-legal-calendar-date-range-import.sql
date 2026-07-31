-- FACS Website v20.11 - Date-range scanning, prepared drafts and Excel/CSV imports
-- Run once after v20.10-legal-calendar-service-role-permissions.sql.
-- Additive only: existing events and public visibility rules are preserved.

alter table public.legal_calendar_events
  add column if not exists origin_type text not null default 'manual',
  add column if not exists preparation_status text not null default 'ready',
  add column if not exists dedup_key text,
  add column if not exists ai_model text,
  add column if not exists import_batch_id uuid,
  add column if not exists import_file_name text;

alter table public.legal_calendar_sources
  add column if not exists last_ai_content_hash text,
  add column if not exists last_scan_start_date date,
  add column if not exists last_scan_end_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'legal_calendar_events_origin_type_check'
      and conrelid = 'public.legal_calendar_events'::regclass
  ) then
    alter table public.legal_calendar_events
      add constraint legal_calendar_events_origin_type_check
      check (origin_type in ('manual', 'scan', 'import'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'legal_calendar_events_preparation_status_check'
      and conrelid = 'public.legal_calendar_events'::regclass
  ) then
    alter table public.legal_calendar_events
      add constraint legal_calendar_events_preparation_status_check
      check (preparation_status in ('ready', 'needs_data', 'ai_unavailable'));
  end if;
end;
$$;

create unique index if not exists legal_calendar_events_dedup_key_uidx
  on public.legal_calendar_events (dedup_key);

create index if not exists legal_calendar_events_origin_idx
  on public.legal_calendar_events (origin_type, preparation_status, created_at desc);

create index if not exists legal_calendar_events_import_batch_idx
  on public.legal_calendar_events (import_batch_id)
  where import_batch_id is not null;

-- The Edge Function creates prepared drafts and checks duplicate keys.
-- Public users receive no additional write permission.
grant select, insert, update
on table public.legal_calendar_events
to service_role;

comment on column public.legal_calendar_events.origin_type is
  'Creation channel: manual CMS entry, date-range source scan, or Excel/CSV import.';

comment on column public.legal_calendar_events.preparation_status is
  'Whether bilingual content and minimum publication fields are ready, incomplete, or could not be AI-completed.';

comment on column public.legal_calendar_events.dedup_key is
  'Server-generated hash used to prevent duplicate calendar cards across repeated scans and imports.';

comment on column public.legal_calendar_sources.last_ai_content_hash is
  'Content fingerprint of the most recent successful AI preparation, used with the date range to avoid repeat processing.';
