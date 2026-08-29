-- FACS Website v20.19 - AR Tracker Phase 1
-- Viettel S-Invoice remains the authoritative invoice source.
-- CMS stores customer master data, collection status, outstanding balances and audit history.

create extension if not exists pgcrypto;

create table if not exists public.ar_customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text,
  legal_name text not null,
  tax_code text,
  tax_code_normalized text generated always as (
    regexp_replace(lower(coalesce(tax_code, '')), '[^a-z0-9]', '', 'g')
  ) stored,
  address text,
  contact_name text,
  primary_email text,
  cc_emails text[] not null default '{}',
  payment_terms_days integer not null default 30,
  preferred_language text not null default 'bilingual',
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_customers_legal_name_check check (length(trim(legal_name)) between 2 and 300),
  constraint ar_customers_payment_terms_check check (payment_terms_days between 0 and 365),
  constraint ar_customers_language_check check (preferred_language in ('vi', 'en', 'bilingual'))
);

create unique index if not exists ar_customers_customer_code_unique
  on public.ar_customers (lower(customer_code))
  where customer_code is not null and trim(customer_code) <> '';

create unique index if not exists ar_customers_tax_code_unique
  on public.ar_customers (tax_code_normalized)
  where tax_code_normalized <> '';

create index if not exists ar_customers_name_search_idx
  on public.ar_customers (lower(legal_name));

create table if not exists public.ar_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  file_name text not null,
  file_sha256 text,
  rows_received integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  duplicates_skipped integer not null default 0,
  customers_created integer not null default 0,
  total_amount numeric(20, 2) not null default 0,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint ar_import_runs_source_check check (source_type in ('customer_master', 'viettel_invoices')),
  constraint ar_import_runs_rows_check check (
    rows_received >= 0 and records_created >= 0 and records_updated >= 0
    and duplicates_skipped >= 0 and customers_created >= 0
  )
);

create index if not exists ar_import_runs_imported_at_idx
  on public.ar_import_runs (imported_at desc);

create table if not exists public.ar_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ar_customers(id) on delete restrict,
  import_run_id uuid references public.ar_import_runs(id) on delete set null,
  source_system text not null default 'viettel',
  invoice_series text not null default '',
  invoice_number text not null,
  invoice_date date not null,
  due_date date not null,
  description text,
  subtotal numeric(20, 2) not null default 0,
  vat_amount numeric(20, 2) not null default 0,
  total_amount numeric(20, 2) not null,
  paid_amount numeric(20, 2) not null default 0,
  is_paid boolean not null default false,
  paid_at date,
  collection_notes text,
  source_status text not null default 'issued',
  outstanding_amount numeric(20, 2) generated always as (
    case
      when source_status = 'cancelled' or is_paid then 0
      else total_amount - paid_amount
    end
  ) stored,
  source_row_number integer,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ar_invoices_source_check check (source_system = 'viettel'),
  constraint ar_invoices_number_check check (length(trim(invoice_number)) between 1 and 100),
  constraint ar_invoices_dates_check check (due_date >= invoice_date),
  constraint ar_invoices_status_check check (source_status in ('issued', 'adjusted', 'replaced', 'cancelled')),
  constraint ar_invoices_paid_consistency_check check (
    (is_paid = false and paid_at is null)
    or (is_paid = true and paid_at is not null and paid_amount = total_amount)
  )
);

create unique index if not exists ar_invoices_viettel_document_unique
  on public.ar_invoices (source_system, invoice_series, invoice_number, invoice_date);

create index if not exists ar_invoices_customer_idx on public.ar_invoices (customer_id);
create index if not exists ar_invoices_due_date_idx on public.ar_invoices (due_date) where is_paid = false;
create index if not exists ar_invoices_invoice_date_idx on public.ar_invoices (invoice_date desc);

create table if not exists public.ar_audit_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  occurred_at timestamptz not null default now(),
  constraint ar_audit_events_entity_check check (entity_type in ('customer', 'invoice')),
  constraint ar_audit_events_action_check check (action in ('insert', 'update', 'delete'))
);

create index if not exists ar_audit_events_entity_idx
  on public.ar_audit_events (entity_type, entity_id, occurred_at desc);
create index if not exists ar_audit_events_occurred_at_idx
  on public.ar_audit_events (occurred_at desc);

create or replace function public.touch_ar_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists touch_ar_customers on public.ar_customers;
create trigger touch_ar_customers
before insert or update on public.ar_customers
for each row execute function public.touch_ar_record();

drop trigger if exists touch_ar_invoices on public.ar_invoices;
create trigger touch_ar_invoices
before insert or update on public.ar_invoices
for each row execute function public.touch_ar_record();

create or replace function public.capture_ar_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text;
  v_entity_id uuid;
begin
  v_entity_type := case when tg_table_name = 'ar_customers' then 'customer' else 'invoice' end;
  v_entity_id := case when tg_op = 'DELETE' then old.id else new.id end;

  insert into public.ar_audit_events (
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    actor_id,
    actor_email
  ) values (
    v_entity_type,
    v_entity_id,
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    auth.uid(),
    auth.jwt() ->> 'email'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_ar_audit_event() from public, anon, authenticated;

drop trigger if exists audit_ar_customers on public.ar_customers;
create trigger audit_ar_customers
after insert or update or delete on public.ar_customers
for each row execute function public.capture_ar_audit_event();

drop trigger if exists audit_ar_invoices on public.ar_invoices;
create trigger audit_ar_invoices
after insert or update or delete on public.ar_invoices
for each row execute function public.capture_ar_audit_event();

create or replace function public.import_ar_customer_master(
  p_rows jsonb,
  p_file_name text,
  p_file_sha256 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb;
  v_customer_id uuid;
  v_tax_normalized text;
  v_name text;
  v_created integer := 0;
  v_updated integer := 0;
  v_received integer;
  v_run_id uuid;
begin
  if v_actor is null then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Rows must be a JSON array'; end if;
  v_received := jsonb_array_length(p_rows);
  if v_received < 1 or v_received > 2000 then raise exception 'Import must contain between 1 and 2000 rows'; end if;
  if length(trim(coalesce(p_file_name, ''))) < 1 then raise exception 'File name is required'; end if;

  insert into public.ar_import_runs (source_type, file_name, file_sha256, rows_received, imported_by)
  values ('customer_master', trim(p_file_name), nullif(trim(p_file_sha256), ''), v_received, v_actor)
  returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_name := trim(coalesce(v_row ->> 'legal_name', ''));
    v_tax_normalized := regexp_replace(lower(coalesce(v_row ->> 'tax_code', '')), '[^a-z0-9]', '', 'g');
    if length(v_name) < 2 then raise exception 'Customer name is required'; end if;

    v_customer_id := null;
    if v_tax_normalized <> '' then
      select id into v_customer_id
      from public.ar_customers
      where tax_code_normalized = v_tax_normalized
      limit 1;
    end if;
    if v_customer_id is null then
      select id into v_customer_id
      from public.ar_customers
      where lower(trim(legal_name)) = lower(v_name)
      limit 1;
    end if;

    if v_customer_id is null then
      insert into public.ar_customers (
        customer_code, legal_name, tax_code, address, contact_name, primary_email,
        cc_emails, payment_terms_days, preferred_language, is_active, notes,
        created_by, updated_by
      ) values (
        nullif(trim(v_row ->> 'customer_code'), ''),
        v_name,
        nullif(trim(v_row ->> 'tax_code'), ''),
        nullif(trim(v_row ->> 'address'), ''),
        nullif(trim(v_row ->> 'contact_name'), ''),
        nullif(lower(trim(v_row ->> 'primary_email')), ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_row -> 'cc_emails', '[]'::jsonb))), '{}'),
        coalesce(nullif(v_row ->> 'payment_terms_days', '')::integer, 30),
        coalesce(nullif(v_row ->> 'preferred_language', ''), 'bilingual'),
        coalesce((v_row ->> 'is_active')::boolean, true),
        nullif(trim(v_row ->> 'notes'), ''),
        v_actor,
        v_actor
      );
      v_created := v_created + 1;
    else
      update public.ar_customers
      set customer_code = coalesce(nullif(trim(v_row ->> 'customer_code'), ''), customer_code),
          legal_name = v_name,
          tax_code = coalesce(nullif(trim(v_row ->> 'tax_code'), ''), tax_code),
          address = coalesce(nullif(trim(v_row ->> 'address'), ''), address),
          contact_name = coalesce(nullif(trim(v_row ->> 'contact_name'), ''), contact_name),
          primary_email = coalesce(nullif(lower(trim(v_row ->> 'primary_email')), ''), primary_email),
          cc_emails = case
            when jsonb_array_length(coalesce(v_row -> 'cc_emails', '[]'::jsonb)) > 0
              then array(select jsonb_array_elements_text(v_row -> 'cc_emails'))
            else cc_emails
          end,
          payment_terms_days = coalesce(nullif(v_row ->> 'payment_terms_days', '')::integer, payment_terms_days),
          preferred_language = coalesce(nullif(v_row ->> 'preferred_language', ''), preferred_language),
          is_active = coalesce((v_row ->> 'is_active')::boolean, is_active),
          notes = coalesce(nullif(trim(v_row ->> 'notes'), ''), notes),
          updated_by = v_actor
      where id = v_customer_id;
      v_updated := v_updated + 1;
    end if;
  end loop;

  update public.ar_import_runs
  set records_created = v_created,
      records_updated = v_updated
  where id = v_run_id;

  return jsonb_build_object(
    'import_run_id', v_run_id,
    'rows_received', v_received,
    'records_created', v_created,
    'records_updated', v_updated
  );
end;
$$;

create or replace function public.import_ar_viettel_invoices(
  p_rows jsonb,
  p_file_name text,
  p_file_sha256 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb;
  v_received integer;
  v_created integer := 0;
  v_updated integer := 0;
  v_duplicates integer := 0;
  v_customers_created integer := 0;
  v_total numeric(20, 2) := 0;
  v_run_id uuid;
  v_customer_id uuid;
  v_invoice_id uuid;
  v_existing_invoice public.ar_invoices;
  v_customer_name text;
  v_tax_normalized text;
  v_invoice_series text;
  v_invoice_number text;
  v_invoice_date date;
  v_due_date date;
  v_terms integer;
  v_total_amount numeric(20, 2);
  v_status text;
begin
  if v_actor is null then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Rows must be a JSON array'; end if;
  v_received := jsonb_array_length(p_rows);
  if v_received < 1 or v_received > 2000 then raise exception 'Import must contain between 1 and 2000 rows'; end if;
  if length(trim(coalesce(p_file_name, ''))) < 1 then raise exception 'File name is required'; end if;

  insert into public.ar_import_runs (source_type, file_name, file_sha256, rows_received, imported_by)
  values ('viettel_invoices', trim(p_file_name), nullif(trim(p_file_sha256), ''), v_received, v_actor)
  returning id into v_run_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_customer_name := trim(coalesce(v_row ->> 'customer_name', ''));
    v_tax_normalized := regexp_replace(lower(coalesce(v_row ->> 'tax_code', '')), '[^a-z0-9]', '', 'g');
    v_invoice_series := upper(trim(coalesce(v_row ->> 'invoice_series', '')));
    v_invoice_number := upper(trim(coalesce(v_row ->> 'invoice_number', '')));
    v_invoice_date := (v_row ->> 'invoice_date')::date;
    v_total_amount := (v_row ->> 'total_amount')::numeric;
    v_status := coalesce(nullif(v_row ->> 'source_status', ''), 'issued');

    if v_invoice_number = '' then raise exception 'Invoice number is required'; end if;
    if v_customer_name = '' and v_tax_normalized = '' then raise exception 'Customer name or tax code is required'; end if;
    if v_status not in ('issued', 'adjusted', 'replaced', 'cancelled') then raise exception 'Invalid invoice status'; end if;

    v_customer_id := null;
    if v_tax_normalized <> '' then
      select id into v_customer_id
      from public.ar_customers
      where tax_code_normalized = v_tax_normalized
      limit 1;
    end if;
    if v_customer_id is null and v_customer_name <> '' then
      select id into v_customer_id
      from public.ar_customers
      where lower(trim(legal_name)) = lower(v_customer_name)
      limit 1;
    end if;

    if v_customer_id is null then
      insert into public.ar_customers (
        legal_name, tax_code, address, primary_email, payment_terms_days, created_by, updated_by
      ) values (
        case when v_customer_name <> '' then v_customer_name else 'Khách hàng ' || coalesce(nullif(v_row ->> 'tax_code', ''), 'chưa xác định') end,
        nullif(trim(v_row ->> 'tax_code'), ''),
        nullif(trim(v_row ->> 'address'), ''),
        nullif(lower(trim(v_row ->> 'customer_email')), ''),
        30,
        v_actor,
        v_actor
      ) returning id into v_customer_id;
      v_customers_created := v_customers_created + 1;
    else
      update public.ar_customers
      set tax_code = coalesce(tax_code, nullif(trim(v_row ->> 'tax_code'), '')),
          address = coalesce(address, nullif(trim(v_row ->> 'address'), '')),
          primary_email = coalesce(primary_email, nullif(lower(trim(v_row ->> 'customer_email')), '')),
          updated_by = v_actor
      where id = v_customer_id
        and (
          (tax_code is null and nullif(trim(v_row ->> 'tax_code'), '') is not null)
          or (address is null and nullif(trim(v_row ->> 'address'), '') is not null)
          or (primary_email is null and nullif(lower(trim(v_row ->> 'customer_email')), '') is not null)
        );
    end if;

    select payment_terms_days into v_terms from public.ar_customers where id = v_customer_id;
    v_due_date := coalesce(nullif(v_row ->> 'due_date', '')::date, v_invoice_date + v_terms);

    select * into v_existing_invoice
    from public.ar_invoices
    where source_system = 'viettel'
      and invoice_series = v_invoice_series
      and invoice_number = v_invoice_number
      and invoice_date = v_invoice_date
    limit 1;

    if found then
      update public.ar_invoices
      set source_status = v_status,
          due_date = v_due_date,
          description = coalesce(nullif(trim(v_row ->> 'description'), ''), description),
          import_run_id = v_run_id,
          updated_by = v_actor
      where id = v_existing_invoice.id
        and (
          source_status is distinct from v_status
          or due_date is distinct from v_due_date
          or (description is null and nullif(trim(v_row ->> 'description'), '') is not null)
        );

      if found then v_updated := v_updated + 1;
      else v_duplicates := v_duplicates + 1;
      end if;
      continue;
    end if;

    v_invoice_id := null;
    insert into public.ar_invoices (
      customer_id, import_run_id, invoice_series, invoice_number, invoice_date, due_date,
      description, subtotal, vat_amount, total_amount, source_status, source_row_number,
      created_by, updated_by
    ) values (
      v_customer_id,
      v_run_id,
      v_invoice_series,
      v_invoice_number,
      v_invoice_date,
      v_due_date,
      nullif(trim(v_row ->> 'description'), ''),
      coalesce(nullif(v_row ->> 'subtotal', '')::numeric, v_total_amount - coalesce(nullif(v_row ->> 'vat_amount', '')::numeric, 0)),
      coalesce(nullif(v_row ->> 'vat_amount', '')::numeric, 0),
      v_total_amount,
      v_status,
      nullif(v_row ->> 'row_number', '')::integer,
      v_actor,
      v_actor
    )
    on conflict (source_system, invoice_series, invoice_number, invoice_date) do nothing
    returning id into v_invoice_id;

    if v_invoice_id is null then
      v_duplicates := v_duplicates + 1;
    else
      v_created := v_created + 1;
      if v_status <> 'cancelled' then v_total := v_total + v_total_amount; end if;
    end if;
  end loop;

  update public.ar_import_runs
  set records_created = v_created,
      records_updated = v_updated,
      duplicates_skipped = v_duplicates,
      customers_created = v_customers_created,
      total_amount = v_total
  where id = v_run_id;

  return jsonb_build_object(
    'import_run_id', v_run_id,
    'rows_received', v_received,
    'records_created', v_created,
    'records_updated', v_updated,
    'duplicates_skipped', v_duplicates,
    'customers_created', v_customers_created,
    'total_amount', v_total
  );
end;
$$;

create or replace function public.set_ar_invoice_paid(
  p_invoice_id uuid,
  p_is_paid boolean,
  p_paid_at date default null,
  p_note text default null
)
returns public.ar_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_invoice public.ar_invoices;
begin
  if v_actor is null then raise exception 'Unauthorized'; end if;

  select * into v_invoice
  from public.ar_invoices
  where id = p_invoice_id
  for update;

  if not found then raise exception 'Invoice not found'; end if;
  if v_invoice.source_status = 'cancelled' then raise exception 'Cancelled invoice cannot be marked as paid'; end if;
  if p_is_paid = true and p_paid_at is not null and p_paid_at > (now() at time zone 'Asia/Ho_Chi_Minh')::date then
    raise exception 'Payment date cannot be in the future';
  end if;
  if p_is_paid = false and v_invoice.is_paid = true and length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'A reason is required when reopening a paid invoice';
  end if;

  update public.ar_invoices
  set is_paid = p_is_paid,
      paid_amount = case when p_is_paid then total_amount else 0 end,
      paid_at = case
        when p_is_paid then coalesce(p_paid_at, (now() at time zone 'Asia/Ho_Chi_Minh')::date)
        else null
      end,
      collection_notes = case
        when p_note is null or trim(p_note) = '' then collection_notes
        when collection_notes is null or trim(collection_notes) = '' then trim(p_note)
        else collection_notes || E'\n' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI') || ': ' || trim(p_note)
      end,
      updated_by = v_actor
  where id = p_invoice_id
  returning * into v_invoice;

  return v_invoice;
end;
$$;

alter table public.ar_customers enable row level security;
alter table public.ar_import_runs enable row level security;
alter table public.ar_invoices enable row level security;
alter table public.ar_audit_events enable row level security;

drop policy if exists "Authenticated users can read AR customers" on public.ar_customers;
create policy "Authenticated users can read AR customers"
on public.ar_customers for select to authenticated using (true);

drop policy if exists "Authenticated users can create AR customers" on public.ar_customers;
create policy "Authenticated users can create AR customers"
on public.ar_customers for insert to authenticated with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update AR customers" on public.ar_customers;
create policy "Authenticated users can update AR customers"
on public.ar_customers for update to authenticated using (true) with check (auth.uid() is not null);

drop policy if exists "Authenticated users can read AR imports" on public.ar_import_runs;
create policy "Authenticated users can read AR imports"
on public.ar_import_runs for select to authenticated using (true);

drop policy if exists "Authenticated users can read AR invoices" on public.ar_invoices;
create policy "Authenticated users can read AR invoices"
on public.ar_invoices for select to authenticated using (true);

drop policy if exists "Authenticated users can read AR audit events" on public.ar_audit_events;
create policy "Authenticated users can read AR audit events"
on public.ar_audit_events for select to authenticated using (true);

grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.ar_customers to authenticated;
grant select on public.ar_import_runs, public.ar_invoices, public.ar_audit_events to authenticated;
grant all on public.ar_customers, public.ar_import_runs, public.ar_invoices, public.ar_audit_events to service_role;

revoke all on function public.import_ar_customer_master(jsonb, text, text) from public, anon;
revoke all on function public.import_ar_viettel_invoices(jsonb, text, text) from public, anon;
revoke all on function public.set_ar_invoice_paid(uuid, boolean, date, text) from public, anon;
grant execute on function public.import_ar_customer_master(jsonb, text, text) to authenticated, service_role;
grant execute on function public.import_ar_viettel_invoices(jsonb, text, text) to authenticated, service_role;
grant execute on function public.set_ar_invoice_paid(uuid, boolean, date, text) to authenticated, service_role;

comment on table public.ar_customers is 'FACS AR customer master. CMS is the master for collection contacts and payment terms.';
comment on table public.ar_invoices is 'Read-only imported Viettel invoices with manual collection status.';
comment on column public.ar_invoices.outstanding_amount is 'Invoice balance used by the AR dashboard; cancelled or paid invoices have zero outstanding.';
comment on table public.ar_audit_events is 'Immutable before/after history for AR customers and invoices.';

-- Ensure PostgREST sees the new AR objects immediately after the migration.
notify pgrst, 'reload schema';
