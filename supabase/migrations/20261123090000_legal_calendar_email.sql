-- Email lịch pháp lý theo tháng: nhật ký gửi riêng, không dùng chung bảng/luồng với Insights.
create table if not exists public.legal_calendar_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  month date not null check (extract(day from month) = 1),
  delivery_type text not null check (delivery_type in ('test', 'send')),
  request_id uuid not null unique,
  content_hash text not null,
  event_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  sender_email text not null,
  subject text,
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  bcc_addresses text[] not null default '{}',
  bcc_count integer not null default 0,
  message_id text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Mỗi tháng chỉ có tối đa một lượt gửi khách hàng đang xử lý (chặn bấm gửi hai lần / hai người cùng gửi).
create unique index if not exists legal_calendar_email_one_inflight_send
  on public.legal_calendar_email_deliveries (month)
  where delivery_type = 'send' and status = 'processing';

create index if not exists legal_calendar_email_deliveries_month_idx
  on public.legal_calendar_email_deliveries (month, delivery_type, created_at desc);

alter table public.legal_calendar_email_deliveries enable row level security;
revoke all on public.legal_calendar_email_deliveries from anon, authenticated;
grant select on public.legal_calendar_email_deliveries to authenticated;

drop policy if exists "Admins can read legal calendar email logs" on public.legal_calendar_email_deliveries;
create policy "Admins can read legal calendar email logs"
on public.legal_calendar_email_deliveries
for select
to authenticated
using (true);

-- Dự án này không tự cấp quyền cho service_role trên bảng mới (xem v20.10): Edge Function cần đọc/ghi nhật ký.
grant select, insert, update on table public.legal_calendar_email_deliveries to service_role;
