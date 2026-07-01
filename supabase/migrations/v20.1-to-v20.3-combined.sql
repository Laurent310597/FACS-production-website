-- FACS Website combined migration: v20.1 -> v20.3
-- Run once in Supabase SQL Editor.
-- Includes scheduled publishing (v20.2) and Lark email notifications (v20.3).
-- Does not delete existing posts, users or images.

-- v20.2: scheduled publishing
create index if not exists posts_public_listing_idx
  on public.posts (status, published_at desc);

alter table public.posts enable row level security;
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts
for select
to anon
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);

comment on column public.posts.published_at is
  'Publication timestamp in UTC. A future value represents a scheduled article; public access begins when published_at <= now().';

-- v20.3: email notifications
create extension if not exists citext;

alter table public.posts
  add column if not exists email_notification_enabled boolean not null default false,
  add column if not exists email_notification_status text not null default 'disabled',
  add column if not exists email_notification_requested_at timestamptz,
  add column if not exists email_notification_cancelled_at timestamptz,
  add column if not exists email_notification_processing_at timestamptz,
  add column if not exists email_notification_sent_at timestamptz,
  add column if not exists email_notification_next_attempt_at timestamptz,
  add column if not exists email_notification_attempts integer not null default 0,
  add column if not exists email_notification_last_error text,
  add column if not exists email_notification_message_id text,
  add column if not exists email_notification_thread_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_email_notification_status_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_email_notification_status_check
      check (email_notification_status in ('disabled','pending','cancelled','processing','sent','failed'));
  end if;
end $$;

create index if not exists posts_due_email_notification_idx
  on public.posts (email_notification_status, published_at)
  where email_notification_enabled = true;

create table if not exists public.insight_email_audience (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  display_name text,
  company_name text,
  language text not null default 'both' check (language in ('vi','en','both')),
  status text not null default 'subscribed' check (status in ('subscribed','unsubscribed')),
  consent_source text,
  consent_at timestamptz,
  unsubscribed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists insight_email_audience_status_idx
  on public.insight_email_audience (status, email);

create table if not exists public.insight_email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete set null,
  delivery_type text not null default 'notification' check (delivery_type in ('notification','test')),
  status text not null check (status in ('processing','sent','failed','skipped')),
  sender_email text not null default 'info@facs.vn',
  to_addresses text[] not null default array[]::text[],
  cc_addresses text[] not null default array[]::text[],
  bcc_count integer not null default 0,
  lark_message_id text,
  lark_thread_id text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists insight_email_delivery_logs_post_idx
  on public.insight_email_delivery_logs (post_id, created_at desc);

create table if not exists public.lark_oauth_credentials (
  id boolean primary key default true check (id = true),
  mailbox_email citext not null default 'info@facs.vn',
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  granted_scopes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.lark_oauth_states (
  state_hash text primary key,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.insight_email_audience enable row level security;
alter table public.insight_email_delivery_logs enable row level security;
alter table public.lark_oauth_credentials enable row level security;
alter table public.lark_oauth_states enable row level security;

grant select, insert, update, delete on public.insight_email_audience to authenticated;
grant select on public.insight_email_delivery_logs to authenticated;
revoke all on public.lark_oauth_credentials from anon, authenticated;
revoke all on public.lark_oauth_states from anon, authenticated;

drop policy if exists "Admins can manage insight email audience" on public.insight_email_audience;
create policy "Admins can manage insight email audience"
on public.insight_email_audience
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can read insight email logs" on public.insight_email_delivery_logs;
create policy "Admins can read insight email logs"
on public.insight_email_delivery_logs
for select
to authenticated
using (true);

create or replace function public.set_email_audience_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'unsubscribed' and new.unsubscribed_at is null then
    new.unsubscribed_at = now();
  elsif new.status = 'subscribed' then
    new.unsubscribed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_email_audience_updated_at on public.insight_email_audience;
create trigger set_email_audience_updated_at
before update on public.insight_email_audience
for each row execute function public.set_email_audience_updated_at();

create or replace function public.claim_due_insight_emails(
  p_post_id uuid default null,
  p_limit integer default 10
)
returns setof public.posts
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select p.id
    from public.posts p
    where p.status = 'published'
      and p.published_at is not null
      and p.published_at <= now()
      and p.email_notification_enabled = true
      and p.email_notification_status in ('pending','failed')
      and coalesce(p.email_notification_next_attempt_at, '-infinity'::timestamptz) <= now()
      and p.email_notification_attempts < 5
      and (p_post_id is null or p.id = p_post_id)
    order by p.published_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ), claimed as (
    update public.posts p
    set email_notification_status = 'processing',
        email_notification_processing_at = now(),
        email_notification_attempts = p.email_notification_attempts + 1,
        email_notification_last_error = null,
        updated_at = now()
    from candidates c
    where p.id = c.id
    returning p.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_due_insight_emails(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_due_insight_emails(uuid, integer) to service_role;

-- Bilingual author names (v20.3.1)
alter table public.posts
  add column if not exists author_name_vi text,
  add column if not exists author_name_en text;

update public.posts
set
  author_name_vi = coalesce(nullif(trim(author_name_vi), ''), nullif(trim(author_name), ''), 'FACS'),
  author_name_en = coalesce(nullif(trim(author_name_en), ''), nullif(trim(author_name), ''), 'FACS')
where
  author_name_vi is null or trim(author_name_vi) = ''
  or author_name_en is null or trim(author_name_en) = '';

alter table public.posts
  alter column author_name_vi set default 'FACS',
  alter column author_name_en set default 'FACS',
  alter column author_name_vi set not null,
  alter column author_name_en set not null;
