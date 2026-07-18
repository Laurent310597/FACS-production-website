-- FACS Website v20.5 - Careers and Contact form automation
-- Additive migration: preserves all existing posts, jobs, users, images and Insight email data.

create extension if not exists citext;

create table if not exists public.career_applications (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  job_post_id uuid references public.job_posts(id) on delete set null,
  position text,
  full_name text not null,
  email citext not null,
  phone text not null,
  message text,
  language text not null default 'vi' check (language in ('vi','en')),
  source_url text,
  cv_bucket text not null default 'career-cvs',
  cv_path text not null unique,
  cv_original_name text not null,
  cv_mime_type text not null,
  cv_size_bytes bigint not null check (cv_size_bytes > 0 and cv_size_bytes <= 5242880),
  status text not null default 'new' check (status in ('new','reviewing','contacted','interview','rejected','hired','closed')),
  internal_email_status text not null default 'pending' check (internal_email_status in ('pending','processing','sent','failed')),
  receipt_email_status text not null default 'pending' check (receipt_email_status in ('pending','processing','sent','failed')),
  internal_email_attempts integer not null default 0,
  receipt_email_attempts integer not null default 0,
  internal_email_sent_at timestamptz,
  receipt_email_sent_at timestamptz,
  internal_email_message_id text,
  receipt_email_message_id text,
  last_email_error text,
  admin_notes text,
  contacted_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists career_applications_submitted_idx
  on public.career_applications (submitted_at desc);
create index if not exists career_applications_status_idx
  on public.career_applications (status, submitted_at desc);
create index if not exists career_applications_email_idx
  on public.career_applications (email, submitted_at desc);

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  submission_key uuid not null unique,
  full_name text not null,
  email citext not null,
  phone text,
  company_name text,
  service_interest text,
  message text not null,
  language text not null default 'vi' check (language in ('vi','en')),
  source_url text,
  status text not null default 'new' check (status in ('new','in_progress','replied','closed','spam')),
  internal_email_status text not null default 'pending' check (internal_email_status in ('pending','processing','sent','failed')),
  receipt_email_status text not null default 'pending' check (receipt_email_status in ('pending','processing','sent','failed')),
  internal_email_attempts integer not null default 0,
  receipt_email_attempts integer not null default 0,
  internal_email_sent_at timestamptz,
  receipt_email_sent_at timestamptz,
  internal_email_message_id text,
  receipt_email_message_id text,
  last_email_error text,
  admin_notes text,
  replied_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_inquiries_submitted_idx
  on public.contact_inquiries (submitted_at desc);
create index if not exists contact_inquiries_status_idx
  on public.contact_inquiries (status, submitted_at desc);
create index if not exists contact_inquiries_email_idx
  on public.contact_inquiries (email, submitted_at desc);

create table if not exists public.submission_email_logs (
  id uuid primary key default gen_random_uuid(),
  career_application_id uuid references public.career_applications(id) on delete cascade,
  contact_inquiry_id uuid references public.contact_inquiries(id) on delete cascade,
  delivery_type text not null check (delivery_type in ('internal','receipt','test')),
  status text not null check (status in ('processing','sent','failed')),
  authenticated_mailbox text not null default 'tunguyen@facs.vn',
  sender_email text not null,
  to_addresses text[] not null default array[]::text[],
  lark_message_id text,
  lark_thread_id text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint submission_email_logs_parent_check check (
    delivery_type = 'test'
    or ((career_application_id is not null)::integer + (contact_inquiry_id is not null)::integer = 1)
  )
);

create index if not exists submission_email_logs_application_idx
  on public.submission_email_logs (career_application_id, created_at desc);
create index if not exists submission_email_logs_inquiry_idx
  on public.submission_email_logs (contact_inquiry_id, created_at desc);

-- Kept separate from the existing info@facs.vn Insight OAuth record.
create table if not exists public.form_lark_oauth_credentials (
  id boolean primary key default true check (id = true),
  mailbox_email citext not null default 'tunguyen@facs.vn',
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  granted_scopes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.form_lark_oauth_states (
  state_hash text primary key,
  code_verifier text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.form_submission_rate_limits (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1,
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'career-cvs',
  'career-cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.career_applications enable row level security;
alter table public.contact_inquiries enable row level security;
alter table public.submission_email_logs enable row level security;
alter table public.form_lark_oauth_credentials enable row level security;
alter table public.form_lark_oauth_states enable row level security;
alter table public.form_submission_rate_limits enable row level security;

revoke all on public.career_applications from anon;
revoke all on public.contact_inquiries from anon;
revoke all on public.submission_email_logs from anon;
revoke all on public.form_lark_oauth_credentials from anon, authenticated;
revoke all on public.form_lark_oauth_states from anon, authenticated;
revoke all on public.form_submission_rate_limits from anon, authenticated;

grant select, update on public.career_applications to authenticated;
grant select, update on public.contact_inquiries to authenticated;
grant select on public.submission_email_logs to authenticated;
grant all on public.career_applications to service_role;
grant all on public.contact_inquiries to service_role;
grant all on public.submission_email_logs to service_role;
grant all on public.form_lark_oauth_credentials to service_role;
grant all on public.form_lark_oauth_states to service_role;
grant all on public.form_submission_rate_limits to service_role;

drop policy if exists "Admins can read career applications" on public.career_applications;
create policy "Admins can read career applications"
on public.career_applications for select to authenticated using (true);

drop policy if exists "Admins can update career applications" on public.career_applications;
create policy "Admins can update career applications"
on public.career_applications for update to authenticated using (true) with check (true);

drop policy if exists "Admins can read contact inquiries" on public.contact_inquiries;
create policy "Admins can read contact inquiries"
on public.contact_inquiries for select to authenticated using (true);

drop policy if exists "Admins can update contact inquiries" on public.contact_inquiries;
create policy "Admins can update contact inquiries"
on public.contact_inquiries for update to authenticated using (true) with check (true);

drop policy if exists "Admins can read submission email logs" on public.submission_email_logs;
create policy "Admins can read submission email logs"
on public.submission_email_logs for select to authenticated using (true);

drop policy if exists "Admins can download career CVs" on storage.objects;
create policy "Admins can download career CVs"
on storage.objects for select to authenticated
using (bucket_id = 'career-cvs');

create or replace function public.set_form_submission_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_career_applications_updated_at on public.career_applications;
create trigger set_career_applications_updated_at
before update on public.career_applications
for each row execute function public.set_form_submission_updated_at();

drop trigger if exists set_contact_inquiries_updated_at on public.contact_inquiries;
create trigger set_contact_inquiries_updated_at
before update on public.contact_inquiries
for each row execute function public.set_form_submission_updated_at();

create or replace function public.check_form_submission_rate_limit(
  p_ip_hash text,
  p_limit integer default 5,
  p_window_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.form_submission_rate_limits as limits (ip_hash, window_started_at, request_count, updated_at)
  values (p_ip_hash, now(), 1, now())
  on conflict (ip_hash) do update set
    request_count = case
      when limits.window_started_at < now() - make_interval(mins => greatest(1, p_window_minutes)) then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at < now() - make_interval(mins => greatest(1, p_window_minutes)) then now()
      else limits.window_started_at
    end,
    updated_at = now()
  returning request_count into current_count;

  return current_count <= greatest(1, p_limit);
end;
$$;

revoke all on function public.check_form_submission_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_form_submission_rate_limit(text, integer, integer) to service_role;

comment on table public.career_applications is 'Career applications submitted through facs.vn; writes are server-only.';
comment on table public.contact_inquiries is 'Contact inquiries submitted through facs.vn; writes are server-only.';
comment on table public.form_lark_oauth_credentials is 'Server-only OAuth credential for tunguyen@facs.vn form email automation.';
