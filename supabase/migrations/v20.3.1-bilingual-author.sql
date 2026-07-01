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
