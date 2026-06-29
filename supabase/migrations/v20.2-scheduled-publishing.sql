-- FACS Website v20.2 - Scheduled Publishing
-- Run once in Supabase: SQL Editor > New query > paste this file > Run.
-- This migration does not delete or rewrite existing articles.

create index if not exists posts_public_listing_idx
  on public.posts (status, published_at desc);

alter table public.posts enable row level security;

grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

-- A scheduled article is stored as status='published' with published_at in the future.
-- Visitors can only read it when the scheduled time has arrived.
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
