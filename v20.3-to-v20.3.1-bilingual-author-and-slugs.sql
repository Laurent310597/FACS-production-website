-- FACS Website v20.3.1 - bilingual author names

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


-- FACS Website v20.3.1 - bilingual article slugs
-- Run once after the bilingual-author migration. Existing links remain valid through the legacy slug column.

alter table public.posts
  add column if not exists slug_vi text,
  add column if not exists slug_en text;

update public.posts
set
  slug_vi = coalesce(nullif(trim(slug_vi), ''), nullif(trim(slug), '')),
  slug_en = coalesce(nullif(trim(slug_en), ''), nullif(trim(slug), ''))
where
  slug_vi is null or trim(slug_vi) = ''
  or slug_en is null or trim(slug_en) = '';

alter table public.posts
  alter column slug_vi set not null,
  alter column slug_en set not null;

create unique index if not exists posts_slug_vi_unique_idx
  on public.posts (lower(slug_vi));
create unique index if not exists posts_slug_en_unique_idx
  on public.posts (lower(slug_en));

create or replace function public.ensure_unique_post_slugs()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  candidate_slugs text[];
begin
  new.slug := lower(trim(new.slug));
  new.slug_vi := lower(trim(new.slug_vi));
  new.slug_en := lower(trim(new.slug_en));

  candidate_slugs := array(
    select distinct value
    from unnest(array[new.slug, new.slug_vi, new.slug_en]) as candidate(value)
    where nullif(value, '') is not null
  );

  if exists (
    select 1
    from public.posts p
    cross join lateral unnest(array[p.slug, p.slug_vi, p.slug_en]) as existing_slug(value)
    where p.id is distinct from new.id
      and lower(existing_slug.value) = any(candidate_slugs)
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'A Vietnamese, English or legacy article slug is already in use.';
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_unique_post_slugs on public.posts;
create trigger ensure_unique_post_slugs
before insert or update of slug, slug_vi, slug_en on public.posts
for each row execute function public.ensure_unique_post_slugs();

comment on column public.posts.slug is
  'Legacy slug retained as a permanent alias so existing article links do not break.';
comment on column public.posts.slug_vi is
  'Vietnamese article URL slug.';
comment on column public.posts.slug_en is
  'English article URL slug.';
