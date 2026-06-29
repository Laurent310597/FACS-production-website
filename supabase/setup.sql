-- FACS Insights CMS database setup
-- Run this entire file once in Supabase: SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'business',
  title_en text,
  title_vi text,
  excerpt_en text,
  excerpt_vi text,
  content_en text,
  content_vi text,
  cover_image_url text,
  cover_image_alt_en text,
  cover_image_alt_vi text,
  author_name text not null default 'FACS',
  status text not null default 'draft' check (status in ('draft', 'published')),
  featured boolean not null default false,
  seo_title_en text,
  seo_title_vi text,
  seo_description_en text,
  seo_description_vi text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint posts_has_title check (nullif(trim(title_en), '') is not null or nullif(trim(title_vi), '') is not null),
  constraint posts_has_content check (nullif(trim(content_en), '') is not null or nullif(trim(content_vi), '') is not null)
);

create index if not exists posts_public_listing_idx
  on public.posts (status, published_at desc);
create index if not exists posts_category_idx
  on public.posts (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

-- Visitors can only read articles whose publication time has arrived.
-- Scheduled articles use status = 'published' with published_at in the future.
drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
on public.posts
for select
to anon
using (status = 'published' and published_at is not null and published_at <= now());

-- Authenticated users are the manually-created FACS administrators.
-- Keep public sign-up disabled in Authentication settings.
drop policy if exists "Admins can read all posts" on public.posts;
create policy "Admins can read all posts"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts"
on public.posts
for insert
to authenticated
with check (created_by is null or created_by = auth.uid());

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
on public.posts
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
on public.posts
for delete
to authenticated
using (true);

-- Public image bucket for article cover images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'insight-images',
  'insight-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view insight images" on storage.objects;
create policy "Public can view insight images"
on storage.objects
for select
to public
using (bucket_id = 'insight-images');

drop policy if exists "Admins can upload insight images" on storage.objects;
create policy "Admins can upload insight images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'insight-images');

drop policy if exists "Admins can update insight images" on storage.objects;
create policy "Admins can update insight images"
on storage.objects
for update
to authenticated
using (bucket_id = 'insight-images')
with check (bucket_id = 'insight-images');

drop policy if exists "Admins can delete insight images" on storage.objects;
create policy "Admins can delete insight images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'insight-images');
