-- FACS Careers CMS v20.3.0
-- Run this script once in Supabase SQL Editor before deploying the frontend patch.

create extension if not exists pgcrypto;

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_vi text,
  title_en text,
  summary_vi text,
  summary_en text,
  content_vi text,
  content_en text,
  department_vi text,
  department_en text,
  location_vi text,
  location_en text,
  employment_type text not null default 'full-time',
  workplace_type text not null default 'onsite',
  application_deadline date,
  status text not null default 'draft',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_posts_title_required check (
    nullif(btrim(coalesce(title_vi, '')), '') is not null
    or nullif(btrim(coalesce(title_en, '')), '') is not null
  ),
  constraint job_posts_content_required check (
    nullif(btrim(coalesce(content_vi, '')), '') is not null
    or nullif(btrim(coalesce(content_en, '')), '') is not null
  ),
  constraint job_posts_employment_type_valid check (
    employment_type in ('full-time', 'part-time', 'contract', 'internship')
  ),
  constraint job_posts_workplace_type_valid check (
    workplace_type in ('onsite', 'hybrid', 'remote')
  ),
  constraint job_posts_status_valid check (
    status in ('draft', 'published')
  )
);

create index if not exists job_posts_publication_idx
  on public.job_posts (status, published_at desc);

create index if not exists job_posts_updated_at_idx
  on public.job_posts (updated_at desc);

create or replace function public.set_job_posts_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_job_posts_updated_at on public.job_posts;
create trigger set_job_posts_updated_at
before update on public.job_posts
for each row execute function public.set_job_posts_updated_at();

alter table public.job_posts enable row level security;

drop policy if exists "Public can read published job posts" on public.job_posts;
create policy "Public can read published job posts"
on public.job_posts
for select
to anon, authenticated
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "Authenticated users can read all job posts" on public.job_posts;
create policy "Authenticated users can read all job posts"
on public.job_posts
for select
to authenticated
using (auth.uid() is not null);

drop policy if exists "Authenticated users can create job posts" on public.job_posts;
create policy "Authenticated users can create job posts"
on public.job_posts
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update job posts" on public.job_posts;
create policy "Authenticated users can update job posts"
on public.job_posts
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

drop policy if exists "Authenticated users can delete job posts" on public.job_posts;
create policy "Authenticated users can delete job posts"
on public.job_posts
for delete
to authenticated
using (auth.uid() is not null);

grant select on public.job_posts to anon;
grant select, insert, update, delete on public.job_posts to authenticated;
