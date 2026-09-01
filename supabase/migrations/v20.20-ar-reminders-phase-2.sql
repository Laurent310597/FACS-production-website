-- FACS Website v20.20 - AR reminders phase 2
-- The CMS remains a collection tracker. Viettel remains the invoice source of truth.
-- No reminder is sent by this migration; sending is only performed by the ar-reminders Edge Function.

begin;

create table if not exists public.ar_reminder_template (
  template_key text primary key default 'default',
  subject_template text not null,
  body_vi_template text not null,
  body_en_template text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_reminder_template_singleton_check check (template_key = 'default'),
  constraint ar_reminder_template_subject_check check (length(trim(subject_template)) between 5 and 300),
  constraint ar_reminder_template_body_vi_check check (length(trim(body_vi_template)) between 10 and 12000),
  constraint ar_reminder_template_body_en_check check (length(trim(body_en_template)) between 10 and 12000)
);

insert into public.ar_reminder_template (template_key, subject_template, body_vi_template, body_en_template)
values (
  'default',
  '[FACS] Đối chiếu công nợ / Accounts receivable statement - {{customer_name}}',
  E'Kính gửi Quý Khách hàng,\n\nTheo dữ liệu theo dõi của FACS tại ngày {{statement_date}}, các hóa đơn dưới đây hiện còn số dư chưa thanh toán. Kính nhờ Quý Khách hàng kiểm tra và phản hồi kế hoạch thanh toán.\n\nNếu khoản tiền đã được chuyển, vui lòng bỏ qua email này và gửi giúp FACS chứng từ thanh toán để chúng tôi đối chiếu.',
  E'Dear Valued Client,\n\nAccording to FACS records as of {{statement_date}}, the invoices below remain outstanding. Please review and advise the expected payment date.\n\nIf payment has already been made, please disregard this message and share the payment evidence so that we can reconcile our records.'
)
on conflict (template_key) do nothing;

create table if not exists public.ar_reminder_reviews (
  customer_id uuid primary key references public.ar_customers(id) on delete cascade,
  source_hash text not null,
  previewed_at timestamptz not null,
  previewed_by uuid references auth.users(id) on delete set null,
  tested_at timestamptz,
  tested_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_reminder_reviews_hash_check check (source_hash ~ '^[a-f0-9]{64}$'),
  constraint ar_reminder_reviews_test_check check (tested_at is null or tested_at >= previewed_at)
);

create table if not exists public.ar_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ar_customers(id) on delete restrict,
  delivery_type text not null,
  status text not null default 'processing',
  source_hash text not null,
  sender_email text not null default 'accounting@facs.vn',
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null,
  body_html text not null,
  source_snapshot jsonb not null,
  provider_message_id text,
  error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ar_reminder_deliveries_type_check check (delivery_type in ('test', 'live')),
  constraint ar_reminder_deliveries_status_check check (status in ('processing', 'sent', 'failed', 'manual_review')),
  constraint ar_reminder_deliveries_hash_check check (source_hash ~ '^[a-f0-9]{64}$'),
  constraint ar_reminder_deliveries_sender_check check (lower(sender_email) = 'accounting@facs.vn'),
  constraint ar_reminder_deliveries_recipient_check check (cardinality(to_addresses) between 1 and 50)
);

create index if not exists ar_reminder_deliveries_customer_idx
  on public.ar_reminder_deliveries (customer_id, requested_at desc);
create index if not exists ar_reminder_deliveries_requested_idx
  on public.ar_reminder_deliveries (requested_at desc);
create unique index if not exists ar_reminder_deliveries_no_duplicate_idx
  on public.ar_reminder_deliveries (customer_id, delivery_type, source_hash)
  where status in ('processing', 'sent', 'manual_review');

create or replace function public.ar_reminder_source(p_customer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id,
      'customer_code', c.customer_code,
      'legal_name', c.legal_name,
      'tax_code', c.tax_code,
      'contact_name', c.contact_name,
      'primary_email', lower(trim(coalesce(c.primary_email, ''))),
      'cc_emails', coalesce(to_jsonb(c.cc_emails), '[]'::jsonb),
      'preferred_language', c.preferred_language
    ),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invoice_series', i.invoice_series,
        'invoice_number', i.invoice_number,
        'invoice_date', i.invoice_date,
        'due_date', i.due_date,
        'description', i.description,
        'total_amount', i.total_amount,
        'paid_amount', i.paid_amount,
        'outstanding_amount', i.outstanding_amount
      ) order by i.due_date, i.invoice_date, i.invoice_number)
      from public.ar_invoices i
      where i.customer_id = c.id
        and i.source_status <> 'cancelled'
        and i.is_paid = false
        and i.outstanding_amount > 0
    ), '[]'::jsonb)
  )
  from public.ar_customers c
  where c.id = p_customer_id and c.is_active = true;
$$;

create or replace function public.list_ar_reminder_customers()
returns table (
  customer_id uuid,
  customer_code text,
  legal_name text,
  tax_code text,
  contact_name text,
  primary_email text,
  cc_emails text[],
  preferred_language text,
  invoice_count bigint,
  total_outstanding numeric,
  oldest_due_date date,
  overdue_days integer,
  last_sent_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  return query
  select
    c.id,
    c.customer_code,
    c.legal_name,
    c.tax_code,
    c.contact_name,
    c.primary_email,
    c.cc_emails,
    c.preferred_language,
    count(i.id),
    sum(i.outstanding_amount),
    min(i.due_date),
    greatest(0, ((now() at time zone 'Asia/Ho_Chi_Minh')::date - min(i.due_date)))::integer,
    (select max(d.completed_at) from public.ar_reminder_deliveries d
      where d.customer_id = c.id and d.delivery_type = 'live' and d.status = 'sent')
  from public.ar_customers c
  join public.ar_invoices i on i.customer_id = c.id
  where c.is_active = true
    and i.source_status <> 'cancelled'
    and i.is_paid = false
    and i.outstanding_amount > 0
  group by c.id
  order by min(i.due_date), c.legal_name;
end;
$$;

create or replace function public.save_ar_reminder_template(
  p_subject_template text,
  p_body_vi_template text,
  p_body_en_template text
)
returns public.ar_reminder_template
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_template public.ar_reminder_template;
begin
  if v_actor is null then raise exception 'Unauthorized'; end if;
  insert into public.ar_reminder_template (
    template_key, subject_template, body_vi_template, body_en_template, updated_by, updated_at
  ) values (
    'default', trim(p_subject_template), trim(p_body_vi_template), trim(p_body_en_template), v_actor, now()
  )
  on conflict (template_key) do update
  set subject_template = excluded.subject_template,
      body_vi_template = excluded.body_vi_template,
      body_en_template = excluded.body_en_template,
      updated_by = v_actor,
      updated_at = now()
  returning * into v_template;

  -- A template change invalidates every prior preview/test snapshot.
  delete from public.ar_reminder_reviews;
  return v_template;
end;
$$;

create or replace function public.claim_ar_reminder(
  p_customer_id uuid,
  p_delivery_type text,
  p_source_hash text,
  p_to_addresses text[],
  p_cc_addresses text[],
  p_subject text,
  p_body_html text,
  p_source_snapshot jsonb,
  p_requested_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.ar_reminder_reviews;
  v_delivery_id uuid;
begin
  if p_delivery_type not in ('test', 'live') then raise exception 'Invalid delivery type'; end if;
  if p_source_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid source hash'; end if;
  if cardinality(p_to_addresses) < 1 or cardinality(p_to_addresses) > 50 then raise exception 'Invalid recipient count'; end if;

  select * into v_review from public.ar_reminder_reviews
  where customer_id = p_customer_id for update;
  if not found or v_review.source_hash <> p_source_hash or v_review.expires_at <= now() then
    raise exception 'Preview is missing, expired, or the AR source has changed';
  end if;

  insert into public.ar_reminder_deliveries (
    customer_id, delivery_type, source_hash, to_addresses, cc_addresses,
    subject, body_html, source_snapshot, requested_by
  ) values (
    p_customer_id, p_delivery_type, p_source_hash, p_to_addresses, coalesce(p_cc_addresses, '{}'),
    p_subject, p_body_html, p_source_snapshot, p_requested_by
  )
  returning id into v_delivery_id;

  return v_delivery_id;
exception
  when unique_violation then
    raise exception 'An identical reminder is already processing or has already been sent';
end;
$$;

create or replace function public.finish_ar_reminder(
  p_delivery_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.ar_reminder_deliveries;
begin
  if p_status not in ('sent', 'failed', 'manual_review') then raise exception 'Invalid final status'; end if;
  select * into v_delivery from public.ar_reminder_deliveries where id = p_delivery_id for update;
  if not found then raise exception 'Delivery not found'; end if;
  if v_delivery.status <> 'processing' then raise exception 'Delivery is already final'; end if;

  update public.ar_reminder_deliveries
  set status = p_status,
      provider_message_id = nullif(trim(coalesce(p_provider_message_id, '')), ''),
      error_message = nullif(left(trim(coalesce(p_error_message, '')), 2000), ''),
      completed_at = now()
  where id = p_delivery_id;

  if p_status = 'sent' and v_delivery.delivery_type = 'test' then
    update public.ar_reminder_reviews
    set tested_at = now(), tested_by = v_delivery.requested_by, updated_at = now()
    where customer_id = v_delivery.customer_id and source_hash = v_delivery.source_hash;
  end if;
end;
$$;

create or replace function public.guard_ar_reminder_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if tg_table_name = 'ar_customers' then
    v_customer_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    v_customer_id := case when tg_op = 'DELETE' then old.customer_id else new.customer_id end;
  end if;
  delete from public.ar_reminder_reviews where customer_id = v_customer_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists guard_ar_customer_reminder_source on public.ar_customers;
create trigger guard_ar_customer_reminder_source
after update of legal_name, tax_code, contact_name, primary_email, cc_emails, preferred_language, is_active
on public.ar_customers for each row execute function public.guard_ar_reminder_source();

drop trigger if exists guard_ar_invoice_reminder_source on public.ar_invoices;
create trigger guard_ar_invoice_reminder_source
after insert or update of invoice_series, invoice_number, invoice_date, due_date, description, total_amount, paid_amount, is_paid, source_status or delete
on public.ar_invoices for each row execute function public.guard_ar_reminder_source();

alter table public.ar_reminder_template enable row level security;
alter table public.ar_reminder_reviews enable row level security;
alter table public.ar_reminder_deliveries enable row level security;

drop policy if exists "Authenticated users can read AR reminder template" on public.ar_reminder_template;
create policy "Authenticated users can read AR reminder template"
on public.ar_reminder_template for select to authenticated using (true);

drop policy if exists "Authenticated users can read AR reminder reviews" on public.ar_reminder_reviews;
create policy "Authenticated users can read AR reminder reviews"
on public.ar_reminder_reviews for select to authenticated using (true);

drop policy if exists "Authenticated users can read AR reminder deliveries" on public.ar_reminder_deliveries;
create policy "Authenticated users can read AR reminder deliveries"
on public.ar_reminder_deliveries for select to authenticated using (true);

grant select on public.ar_reminder_template, public.ar_reminder_reviews, public.ar_reminder_deliveries to authenticated;
grant all on public.ar_reminder_template, public.ar_reminder_reviews, public.ar_reminder_deliveries to service_role;

revoke all on function public.ar_reminder_source(uuid) from public, anon, authenticated;
revoke all on function public.claim_ar_reminder(uuid, text, text, text[], text[], text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.finish_ar_reminder(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.guard_ar_reminder_source() from public, anon, authenticated;
revoke all on function public.list_ar_reminder_customers() from public, anon;
revoke all on function public.save_ar_reminder_template(text, text, text) from public, anon;

grant execute on function public.ar_reminder_source(uuid) to service_role;
grant execute on function public.claim_ar_reminder(uuid, text, text, text[], text[], text, text, jsonb, uuid) to service_role;
grant execute on function public.finish_ar_reminder(uuid, text, text, text) to service_role;
grant execute on function public.list_ar_reminder_customers() to authenticated, service_role;
grant execute on function public.save_ar_reminder_template(text, text, text) to authenticated, service_role;

comment on table public.ar_reminder_template is 'Organization-level editable AR reminder copy. Template changes invalidate prior previews.';
comment on table public.ar_reminder_reviews is 'Twenty-four-hour review gate tied to an exact customer AR and template snapshot.';
comment on table public.ar_reminder_deliveries is 'Immutable reminder send attempts; live sends are claimed before Microsoft Graph is called.';

notify pgrst, 'reload schema';
commit;
