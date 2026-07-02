-- FACS Website v20.4
-- Add bilingual Insight authors and localized article slugs.
-- Safe to run more than once. Existing articles and legacy links are preserved.

alter table public.posts
  add column if not exists slug_vi text,
  add column if not exists slug_en text,
  add column if not exists author_name_vi text,
  add column if not exists author_name_en text;

update public.posts
set
  slug_vi = coalesce(nullif(trim(slug_vi), ''), slug),
  slug_en = coalesce(nullif(trim(slug_en), ''), slug),
  author_name_vi = coalesce(nullif(trim(author_name_vi), ''), nullif(trim(author_name), ''), 'FACS'),
  author_name_en = coalesce(nullif(trim(author_name_en), ''), nullif(trim(author_name), ''), 'FACS')
where
  slug_vi is null or trim(slug_vi) = '' or
  slug_en is null or trim(slug_en) = '' or
  author_name_vi is null or trim(author_name_vi) = '' or
  author_name_en is null or trim(author_name_en) = '';

create unique index if not exists posts_slug_vi_unique_idx
  on public.posts (slug_vi)
  where slug_vi is not null and trim(slug_vi) <> '';

create unique index if not exists posts_slug_en_unique_idx
  on public.posts (slug_en)
  where slug_en is not null and trim(slug_en) <> '';

create or replace function public.validate_post_localized_slugs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.slug_vi := coalesce(nullif(trim(new.slug_vi), ''), nullif(trim(new.slug_en), ''), new.slug);
  new.slug_en := coalesce(nullif(trim(new.slug_en), ''), nullif(trim(new.slug_vi), ''), new.slug);
  new.author_name_vi := coalesce(nullif(trim(new.author_name_vi), ''), nullif(trim(new.author_name_en), ''), nullif(trim(new.author_name), ''), 'FACS');
  new.author_name_en := coalesce(nullif(trim(new.author_name_en), ''), nullif(trim(new.author_name_vi), ''), nullif(trim(new.author_name), ''), 'FACS');

  if exists (
    select 1
    from public.posts p
    where p.id is distinct from new.id
      and (
        (new.slug is not null and (new.slug = p.slug or new.slug = p.slug_vi or new.slug = p.slug_en)) or
        (new.slug_vi is not null and (new.slug_vi = p.slug or new.slug_vi = p.slug_vi or new.slug_vi = p.slug_en)) or
        (new.slug_en is not null and (new.slug_en = p.slug or new.slug_en = p.slug_vi or new.slug_en = p.slug_en))
      )
  ) then
    raise exception using
      errcode = '23505',
      message = 'Insight slug already exists in another language.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_post_localized_slugs on public.posts;
create trigger validate_post_localized_slugs
before insert or update of slug, slug_vi, slug_en, author_name, author_name_vi, author_name_en
on public.posts
for each row execute function public.validate_post_localized_slugs();
