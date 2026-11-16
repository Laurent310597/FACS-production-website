-- FACS Hub – Thư viện (3 thư mục):
--   1. Hướng dẫn & quy tắc  → bảng hub_guidelines
--   2. Đầu vào đã gửi       → bảng hub_content_items (đã có) + ảnh trong bucket riêng tư hub-library/inputs/
--   3. Kết quả đã duyệt     → bảng hub_approved_examples
-- CHỈ THÊM MỚI. Không sửa bảng posts, không đụng luồng đăng bài / gửi email Insights.

-- 1. Hướng dẫn, quy tắc, kỹ năng do FACS soạn cho AI
create table if not exists public.hub_guidelines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'rule' check (kind in ('rule', 'style', 'skill', 'reference')),
  applies_to text[] not null default '{}',
  content text not null check (length(content) between 1 and 20000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_hub_guidelines_updated_at on public.hub_guidelines;
create trigger set_hub_guidelines_updated_at
before update on public.hub_guidelines
for each row execute function public.set_updated_at();

alter table public.hub_guidelines enable row level security;
grant select, insert, update, delete on public.hub_guidelines to authenticated;
grant select on public.hub_guidelines to service_role;

drop policy if exists "Admins manage hub guidelines" on public.hub_guidelines;
create policy "Admins manage hub guidelines"
on public.hub_guidelines
for all
to authenticated
using (true)
with check (true);

-- 2. Đầu vào: thêm danh sách ảnh đã tải lên cho mỗi bộ nội dung
alter table public.hub_content_items
  add column if not exists input_files jsonb not null default '[]'::jsonb;

-- 3. Kết quả cuối cùng đã duyệt (mỗi kênh một dòng), AI dùng làm mẫu tham khảo
create table if not exists public.hub_approved_examples (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.hub_content_items(id) on delete set null,
  channel text not null check (channel in ('website', 'facebook', 'linkedin', 'instagram', 'infographic')),
  title text not null default '',
  category text,
  content jsonb not null,
  is_reference boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now()
);

create index if not exists hub_approved_examples_channel_idx
  on public.hub_approved_examples (channel, approved_at desc);
create index if not exists hub_approved_examples_item_idx
  on public.hub_approved_examples (content_item_id);

alter table public.hub_approved_examples enable row level security;
grant select, insert, update, delete on public.hub_approved_examples to authenticated;
grant select on public.hub_approved_examples to service_role;

drop policy if exists "Admins manage hub approved examples" on public.hub_approved_examples;
create policy "Admins manage hub approved examples"
on public.hub_approved_examples
for all
to authenticated
using (true)
with check (true);

-- Bucket RIÊNG TƯ cho ảnh đầu vào (không ai ngoài quản trị viên xem được)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hub-library', 'hub-library', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins read hub library" on storage.objects;
create policy "Admins read hub library"
on storage.objects for select to authenticated
using (bucket_id = 'hub-library');

drop policy if exists "Admins upload hub library" on storage.objects;
create policy "Admins upload hub library"
on storage.objects for insert to authenticated
with check (bucket_id = 'hub-library' and (storage.foldername(name))[1] = 'inputs');

drop policy if exists "Admins delete hub library" on storage.objects;
create policy "Admins delete hub library"
on storage.objects for delete to authenticated
using (bucket_id = 'hub-library');
