-- FACS Hub phần 3: kết nối mạng xã hội + lịch đăng.
-- Chỉ THÊM bảng/hàm mới; không sửa bảng posts, insight email hay lịch hiện có.

-- 1) Tài khoản đã kết nối (không chứa token; admin đọc được để hiển thị trạng thái).
create table if not exists public.hub_social_accounts (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin')),
  external_id text not null,                -- Page ID / IG user ID / LinkedIn person id
  display_name text not null default '',
  status text not null default 'connected' check (status in ('connected', 'expired', 'error', 'disconnected')),
  token_expires_at timestamptz,
  last_error text,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_id)
);

-- 2) Token: chỉ service_role (Edge Function) đọc được.
create table if not exists public.hub_social_credentials (
  account_id uuid primary key references public.hub_social_accounts(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  updated_at timestamptz not null default now()
);

-- 3) State OAuth dùng một lần.
create table if not exists public.hub_social_oauth_states (
  state_hash text primary key,
  platform text not null check (platform in ('facebook', 'linkedin')),
  user_id uuid references auth.users(id) on delete cascade,
  return_to text,
  expires_at timestamptz not null default (now() + interval '15 minutes')
);

-- 4) Bài đăng / lịch đăng. Chỉ chạy khi admin bấm "Duyệt & hẹn giờ" hoặc "Đăng ngay".
create table if not exists public.hub_social_posts (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.hub_content_items(id) on delete set null,
  account_id uuid not null references public.hub_social_accounts(id) on delete restrict,
  platform text not null check (platform in ('facebook', 'instagram', 'linkedin')),
  caption text not null check (char_length(caption) between 1 and 63000),
  image_path text,                          -- storage path trong bucket hub-library (social/...)
  link_url text,
  scheduled_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  external_post_id text,
  external_url text,
  error text,
  claimed_at timestamptz,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Instagram bắt buộc có ảnh.
  constraint hub_social_instagram_needs_image check (platform <> 'instagram' or image_path is not null)
);

create index if not exists hub_social_posts_due_idx
  on public.hub_social_posts (scheduled_at) where status = 'scheduled';
create index if not exists hub_social_posts_item_idx on public.hub_social_posts (content_item_id);

alter table public.hub_social_accounts enable row level security;
alter table public.hub_social_credentials enable row level security;
alter table public.hub_social_oauth_states enable row level security;
alter table public.hub_social_posts enable row level security;

revoke all on public.hub_social_credentials from anon, authenticated;
revoke all on public.hub_social_oauth_states from anon, authenticated;
revoke all on public.hub_social_accounts from anon;
revoke all on public.hub_social_posts from anon;
grant all on public.hub_social_credentials to service_role;
grant all on public.hub_social_oauth_states to service_role;
grant all on public.hub_social_accounts to service_role;
grant all on public.hub_social_posts to service_role;

-- Admin (authenticated) chỉ ĐỌC tài khoản; thêm/sửa/xoá do Edge Function làm.
grant select on public.hub_social_accounts to authenticated;
grant select, insert, update, delete on public.hub_social_posts to authenticated;

drop policy if exists "hub_social_accounts_read" on public.hub_social_accounts;
create policy "hub_social_accounts_read" on public.hub_social_accounts
  for select to authenticated using (true);

drop policy if exists "hub_social_posts_admin" on public.hub_social_posts;
create policy "hub_social_posts_admin" on public.hub_social_posts
  for all to authenticated using (true) with check (true);

-- 5) Nhận các bài đến hạn một cách nguyên tử: không bao giờ đăng trùng.
create or replace function public.hub_social_claim_due(p_limit int default 5)
returns setof public.hub_social_posts
language sql
security definer
set search_path = public
as $$
  update public.hub_social_posts p
     set status = 'publishing', claimed_at = now(), updated_at = now()
   where p.id in (
     select id from public.hub_social_posts
      where status = 'scheduled' and scheduled_at <= now()
      order by scheduled_at
      limit greatest(1, least(p_limit, 10))
      for update skip locked
   )
  returning p.*;
$$;
revoke all on function public.hub_social_claim_due(int) from public, anon, authenticated;
grant execute on function public.hub_social_claim_due(int) to service_role;

-- 6) Bài kẹt "publishing" quá 10 phút: KHÔNG tự đăng lại (tránh đăng trùng), chuyển sang failed để người kiểm tra tay.
create or replace function public.hub_social_release_stuck()
returns int
language sql
security definer
set search_path = public
as $$
  with s as (
    update public.hub_social_posts
       set status = 'failed',
           error = 'Quá 10 phút không có phản hồi. Hãy kiểm tra trên mạng xã hội xem bài đã lên chưa trước khi đăng lại.',
           updated_at = now()
     where status = 'publishing' and claimed_at < now() - interval '10 minutes'
    returning 1
  ) select count(*)::int from s;
$$;
revoke all on function public.hub_social_release_stuck() from public, anon, authenticated;
grant execute on function public.hub_social_release_stuck() to service_role;

-- 7) Cho phép admin tải ảnh bài đăng lên thư mục social/ của bucket riêng hub-library.
drop policy if exists "hub_library_social_insert" on storage.objects;
create policy "hub_library_social_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hub-library' and (storage.foldername(name))[1] = 'social');
-- Quyền đọc cả bucket hub-library cho admin đã có từ migration thư viện.
