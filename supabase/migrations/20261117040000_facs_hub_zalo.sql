-- FACS Hub phần 4: giám sát và cấu hình AI Zalo (chạy trên laptop) từ trang quản trị.
-- AI Zalo chủ động ĐẨY dữ liệu tóm tắt lên đây và KÉO lệnh về; Supabase không bao giờ kết nối ngược vào laptop.
-- Chỉ THÊM bảng/hàm mới; không sửa bảng posts, insight email hay lịch hiện có.

-- 1) Thiết bị (mỗi laptop chạy AI Zalo một khóa riêng; chỉ lưu bản băm SHA-256 của khóa).
create table if not exists public.hub_zalo_devices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  key_hash text not null unique,
  heartbeat jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz,
  last_pruned_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2) Bản sao dữ liệu AI Zalo để xem trên web (hội thoại, tin nhắn, lead, nhóm, việc tồn, log, cấu hình hiện tại).
create table if not exists public.hub_zalo_mirror (
  device_id uuid not null references public.hub_zalo_devices(id) on delete cascade,
  kind text not null check (kind in ('conversation', 'message', 'lead', 'handover', 'group', 'item', 'security', 'team', 'config')),
  key text not null check (char_length(key) between 1 and 120),
  conv_key text,
  ts bigint not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (device_id, kind, key)
);
create index if not exists hub_zalo_mirror_kind_ts_idx on public.hub_zalo_mirror (kind, ts desc);
create index if not exists hub_zalo_mirror_conv_idx on public.hub_zalo_mirror (conv_key, ts) where conv_key is not null;

-- 3) Lệnh từ web gửi xuống AI Zalo (AI Zalo kéo về, tự kiểm tra lại rồi mới thực hiện).
create table if not exists public.hub_zalo_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.hub_zalo_devices(id) on delete cascade,
  type text not null check (type in ('set_config', 'mute_conversation', 'resolve_item', 'set_group')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'done', 'failed')),
  result text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  done_at timestamptz
);
create index if not exists hub_zalo_commands_pending_idx on public.hub_zalo_commands (device_id, created_at) where status = 'pending';

alter table public.hub_zalo_devices enable row level security;
alter table public.hub_zalo_mirror enable row level security;
alter table public.hub_zalo_commands enable row level security;

revoke all on public.hub_zalo_devices from anon, authenticated;
revoke all on public.hub_zalo_mirror from anon, authenticated;
revoke all on public.hub_zalo_commands from anon, authenticated;
grant all on public.hub_zalo_devices to service_role;
grant all on public.hub_zalo_mirror to service_role;
grant all on public.hub_zalo_commands to service_role;

-- Admin chỉ đọc; không đọc được key_hash.
grant select (id, name, heartbeat, last_seen_at, revoked_at, created_at) on public.hub_zalo_devices to authenticated;
grant select on public.hub_zalo_mirror to authenticated;
grant select on public.hub_zalo_commands to authenticated;
grant insert (device_id, type, payload) on public.hub_zalo_commands to authenticated;

create policy "hub_zalo_devices_read" on public.hub_zalo_devices for select to authenticated using (true);
create policy "hub_zalo_mirror_read" on public.hub_zalo_mirror for select to authenticated using (true);
create policy "hub_zalo_commands_read" on public.hub_zalo_commands for select to authenticated using (true);
create policy "hub_zalo_commands_insert" on public.hub_zalo_commands for insert to authenticated
  with check (
    exists (select 1 from public.hub_zalo_devices d where d.id = device_id and d.revoked_at is null)
    and octet_length(payload::text) <= 60000
  );

-- 4) Tạo thiết bị: trả khóa dạng chữ MỘT LẦN DUY NHẤT; DB chỉ giữ bản băm.
create or replace function public.hub_zalo_create_device(p_name text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập quản trị';
  end if;
  v_key := 'facsz_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.hub_zalo_devices (name, key_hash, created_by)
  values (left(trim(p_name), 80), encode(extensions.digest(v_key, 'sha256'), 'hex'), auth.uid());
  return v_key;
end;
$$;
revoke all on function public.hub_zalo_create_device(text) from public, anon;
grant execute on function public.hub_zalo_create_device(text) to authenticated;

create or replace function public.hub_zalo_revoke_device(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Cần đăng nhập quản trị';
  end if;
  update public.hub_zalo_devices set revoked_at = now() where id = p_id and revoked_at is null;
  update public.hub_zalo_commands set status = 'failed', result = 'Thiết bị đã bị thu hồi', done_at = now()
   where device_id = p_id and status in ('pending', 'delivered');
end;
$$;
revoke all on function public.hub_zalo_revoke_device(uuid) from public, anon;
grant execute on function public.hub_zalo_revoke_device(uuid) to authenticated;

-- 5) Hàm cho Edge Function (service_role): xác thực khóa thiết bị.
create or replace function public.hub_zalo_verify_device(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_key is null or length(p_key) < 20 then
    return null;
  end if;
  select id into v_id from public.hub_zalo_devices
   where key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex') and revoked_at is null;
  return v_id;
end;
$$;
revoke all on function public.hub_zalo_verify_device(text) from public, anon, authenticated;
grant execute on function public.hub_zalo_verify_device(text) to service_role;

-- Nhận lệnh đang chờ một cách nguyên tử (mỗi lệnh chỉ giao một lần).
create or replace function public.hub_zalo_claim_commands(p_device uuid, p_limit int default 20)
returns setof public.hub_zalo_commands
language sql
security definer
set search_path = public
as $$
  update public.hub_zalo_commands c
     set status = 'delivered', delivered_at = now()
   where c.id in (
     select id from public.hub_zalo_commands
      where device_id = p_device and status = 'pending'
      order by created_at
      limit greatest(1, least(p_limit, 50))
      for update skip locked
   )
  returning c.*;
$$;
revoke all on function public.hub_zalo_claim_commands(uuid, int) from public, anon, authenticated;
grant execute on function public.hub_zalo_claim_commands(uuid, int) to service_role;

-- Dọn tin nhắn cũ (giữ 60 ngày) và lệnh đã xong (giữ 30 ngày).
create or replace function public.hub_zalo_prune(p_device uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.hub_zalo_mirror
   where device_id = p_device and kind = 'message' and ts < (extract(epoch from now() - interval '60 days') * 1000)::bigint;
  delete from public.hub_zalo_commands
   where device_id = p_device and status in ('done', 'failed') and created_at < now() - interval '30 days';
  update public.hub_zalo_devices set last_pruned_at = now() where id = p_device;
$$;
revoke all on function public.hub_zalo_prune(uuid) from public, anon, authenticated;
grant execute on function public.hub_zalo_prune(uuid) to service_role;
