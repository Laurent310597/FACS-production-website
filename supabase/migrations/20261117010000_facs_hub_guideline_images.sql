-- FACS Hub – Thư viện: ảnh mẫu (infographic đã làm) đính kèm hướng dẫn. Chỉ thêm mới.
alter table public.hub_guidelines
  add column if not exists images jsonb not null default '[]'::jsonb;

create policy "Admins upload hub guideline images"
on storage.objects for insert to authenticated
with check (bucket_id = 'hub-library' and (storage.foldername(name))[1] = 'guidelines');
