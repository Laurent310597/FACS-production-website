-- FACS AR: email nhắc công nợ gửi từ accounting@facs.vn.
-- Thay cho AR Tracker cũ (import hóa đơn Viettel) chưa từng có dữ liệu.
-- Không đụng tới bảng posts, insight email, form email hay lịch gửi hiện có.

-- 1) Cài đặt mẫu email + tài khoản ngân hàng (một dòng duy nhất).
create table if not exists public.ar_reminder_settings (
  id smallint primary key default 1 check (id = 1),
  subject text not null check (char_length(subject) between 1 and 300),
  body_vi text not null check (char_length(body_vi) between 1 and 12000),
  body_en text not null check (char_length(body_en) between 1 and 12000),
  bank_name text check (char_length(bank_name) <= 200),
  bank_branch text check (char_length(bank_branch) <= 200),
  account_number text check (char_length(account_number) <= 60),
  account_holder text check (char_length(account_holder) <= 200),
  swift_code text check (char_length(swift_code) <= 20),
  transfer_note text check (char_length(transfer_note) <= 300),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 2) Từng email nhắc nợ (mỗi dòng = một khách hàng).
create table if not exists public.ar_reminders (
  id uuid primary key default gen_random_uuid(),
  batch_label text check (char_length(batch_label) <= 200),
  recipient_name text not null check (char_length(trim(recipient_name)) between 1 and 200),
  recipient_emails text[] not null check (cardinality(recipient_emails) between 1 and 10),
  cc_emails text[] not null default '{}' check (cardinality(cc_emails) <= 10),
  company_name text not null check (char_length(trim(company_name)) between 1 and 300),
  tax_code text check (char_length(tax_code) <= 30),
  amount numeric(20, 2) not null check (amount > 0 and amount < 1e15),
  period text not null check (char_length(trim(period)) between 1 and 200),
  note text check (char_length(note) <= 4000),
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  sent_at timestamptz,
  sent_subject text,
  message_id text,
  last_error text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ar_reminders_status_idx on public.ar_reminders (status, created_at desc);
create index if not exists ar_reminders_created_idx on public.ar_reminders (created_at desc);

create or replace function public.ar_reminders_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists ar_reminders_touch on public.ar_reminders;
create trigger ar_reminders_touch before update on public.ar_reminders
for each row execute function public.ar_reminders_touch();

alter table public.ar_reminder_settings enable row level security;
alter table public.ar_reminders enable row level security;

grant all on public.ar_reminder_settings, public.ar_reminders to service_role;
-- Quản trị viên đăng nhập: xem; thêm/sửa/xóa dòng CHƯA gửi. Trạng thái gửi chỉ Edge Function (service_role) đổi được.
grant select on public.ar_reminder_settings to authenticated;
grant select, delete on public.ar_reminders to authenticated;
grant insert (batch_label, recipient_name, recipient_emails, cc_emails, company_name, tax_code, amount, period, note)
  on public.ar_reminders to authenticated;
grant update (batch_label, recipient_name, recipient_emails, cc_emails, company_name, tax_code, amount, period, note)
  on public.ar_reminders to authenticated;

drop policy if exists "ar_reminder_settings_read" on public.ar_reminder_settings;
create policy "ar_reminder_settings_read" on public.ar_reminder_settings for select to authenticated using (true);
drop policy if exists "ar_reminders_read" on public.ar_reminders;
create policy "ar_reminders_read" on public.ar_reminders for select to authenticated using (true);
drop policy if exists "ar_reminders_insert" on public.ar_reminders;
create policy "ar_reminders_insert" on public.ar_reminders for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "ar_reminders_update_unsent" on public.ar_reminders;
create policy "ar_reminders_update_unsent" on public.ar_reminders for update to authenticated
  using (status in ('draft', 'failed')) with check (status in ('draft', 'failed'));
drop policy if exists "ar_reminders_delete_unsent" on public.ar_reminders;
create policy "ar_reminders_delete_unsent" on public.ar_reminders for delete to authenticated
  using (status in ('draft', 'failed'));

-- 3) Nhận khóa các dòng để gửi (chống gửi trùng khi bấm 2 lần / 2 tab).
--    Dòng đã gửi chỉ được gửi lại khi p_resend = true (người dùng xác nhận "Gửi lại").
create or replace function public.ar_claim_reminders(p_ids uuid[], p_resend boolean default false)
returns setof public.ar_reminders
language plpgsql security definer set search_path = public as $$
begin
  -- Dòng kẹt ở "đang gửi" quá 10 phút: chuyển sang lỗi, KHÔNG tự gửi lại (có thể email đã đi).
  update public.ar_reminders
     set status = 'failed',
         last_error = 'Gửi bị gián đoạn, không rõ email đã đi hay chưa. Kiểm tra mục Sent Items của accounting@facs.vn trước khi gửi lại.'
   where status = 'sending' and claimed_at < now() - interval '10 minutes';

  return query
  update public.ar_reminders r
     set status = 'sending', claimed_at = now(), attempts = r.attempts + 1, last_error = null
   where r.id in (
     select x.id from public.ar_reminders x
      where x.id = any(p_ids)
        and (x.status in ('draft', 'failed') or (p_resend and x.status = 'sent'))
      order by x.created_at
      limit 25
      for update skip locked
   )
  returning r.*;
end;
$$;
revoke all on function public.ar_claim_reminders(uuid[], boolean) from public, anon, authenticated;
grant execute on function public.ar_claim_reminders(uuid[], boolean) to service_role;

comment on table public.ar_reminders is 'Email nhắc công nợ gửi từ accounting@facs.vn (CMS > AR).';
notify pgrst, 'reload schema';
