-- FACS Hub – Phần 2: Content Studio (tạo nội dung bằng AI).
-- CHỈ THÊM bảng mới. Không sửa bảng posts, không đụng luồng đăng bài / gửi email Insights hiện có.

create table if not exists public.hub_content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  source_urls text[] not null default '{}',
  source_text text not null default '',
  brief text not null default '',
  requested_outputs text[] not null default '{}',
  outputs jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  post_id uuid references public.posts(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_content_items_updated_idx
  on public.hub_content_items (updated_at desc);

drop trigger if exists set_hub_content_items_updated_at on public.hub_content_items;
create trigger set_hub_content_items_updated_at
before update on public.hub_content_items
for each row execute function public.set_updated_at();

alter table public.hub_content_items enable row level security;
grant select, insert, update, delete on public.hub_content_items to authenticated;

-- Người dùng đã đăng nhập là quản trị viên FACS (giống quy ước của bảng posts).
drop policy if exists "Admins manage hub content" on public.hub_content_items;
create policy "Admins manage hub content"
on public.hub_content_items
for all
to authenticated
using (true)
with check (true);

-- Nhật ký gọi AI: dùng để giới hạn số lượt/ngày và theo dõi chi phí. Chỉ Edge Function (service role) ghi.
create table if not exists public.hub_generation_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  model text,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hub_generation_log_user_time_idx
  on public.hub_generation_log (user_id, created_at desc);

alter table public.hub_generation_log enable row level security;
grant select on public.hub_generation_log to authenticated;
grant select, insert on public.hub_generation_log to service_role;
grant select, insert, update, delete on public.hub_content_items to service_role;

drop policy if exists "Admins read hub generation log" on public.hub_generation_log;
create policy "Admins read hub generation log"
on public.hub_generation_log
for select
to authenticated
using (true);
