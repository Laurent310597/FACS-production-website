-- FACS Website v20.18 - controlled AI knowledge base and request audit
-- Additive migration. Existing website, CMS and Legal Calendar data are preserved.

create extension if not exists pgcrypto;

create table if not exists public.legal_ai_documents (
  id uuid primary key default gen_random_uuid(),
  title_vi text not null,
  title_en text,
  document_number text,
  document_type text,
  issuing_authority text,
  jurisdiction text not null default 'Vietnam',
  topic text,
  source_tier text not null default 'P1' check (source_tier in ('P1', 'P2', 'P3')),
  source_url text,
  legal_citation_allowed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'approved', 'expired', 'archived')),
  issued_at date,
  effective_from date,
  effective_to date,
  summary_vi text,
  summary_en text,
  citation_text text not null default '',
  content_notes text,
  tags text[] not null default array[]::text[],
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_ai_documents_source_https check (
    source_url is null or source_url ~* '^https://'
  ),
  constraint legal_ai_documents_dates check (
    effective_to is null or effective_from is null or effective_to >= effective_from
  ),
  constraint legal_ai_documents_content_length check (
    char_length(citation_text) <= 120000
    and char_length(coalesce(content_notes, '')) <= 120000
  ),
  constraint legal_ai_documents_approved_complete check (
    status <> 'approved'
    or (
      legal_citation_allowed = true
      and source_tier = 'P1'
      and source_url is not null
      and nullif(trim(document_number), '') is not null
      and nullif(trim(issuing_authority), '') is not null
      and char_length(trim(citation_text)) >= 40
      and reviewed_by is not null
      and reviewed_at is not null
    )
  )
);

create index if not exists legal_ai_documents_status_idx
  on public.legal_ai_documents (status, source_tier, effective_from, effective_to);
create index if not exists legal_ai_documents_tags_idx
  on public.legal_ai_documents using gin (tags);

create table if not exists public.legal_ai_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.legal_ai_documents(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create index if not exists legal_ai_document_versions_document_idx
  on public.legal_ai_document_versions (document_id, version_number desc);

create table if not exists public.legal_ai_request_logs (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('popup', 'legal_page', 'cms')),
  session_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  provider text,
  model text,
  status text not null check (status in ('ok', 'insufficient_sources', 'blocked', 'error')),
  source_ids uuid[] not null default array[]::uuid[],
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists legal_ai_request_logs_created_idx
  on public.legal_ai_request_logs (created_at desc, channel, status);

create or replace function public.set_legal_ai_document_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_legal_ai_documents_updated_at on public.legal_ai_documents;
create trigger set_legal_ai_documents_updated_at
before update on public.legal_ai_documents
for each row execute function public.set_legal_ai_document_updated_at();

create or replace function public.capture_legal_ai_document_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  select coalesce(max(version_number), 0) + 1
  into next_version
  from public.legal_ai_document_versions
  where document_id = new.id;

  insert into public.legal_ai_document_versions (
    document_id,
    version_number,
    snapshot,
    changed_by
  ) values (
    new.id,
    next_version,
    to_jsonb(new),
    new.updated_by
  );

  return new;
end;
$$;

drop trigger if exists capture_legal_ai_document_version on public.legal_ai_documents;
create trigger capture_legal_ai_document_version
after insert or update on public.legal_ai_documents
for each row execute function public.capture_legal_ai_document_version();

create or replace function public.search_legal_ai_documents(
  p_query text,
  p_limit integer default 6
)
returns table (
  id uuid,
  title_vi text,
  title_en text,
  document_number text,
  document_type text,
  issuing_authority text,
  jurisdiction text,
  topic text,
  source_tier text,
  source_url text,
  issued_at date,
  effective_from date,
  effective_to date,
  summary_vi text,
  summary_en text,
  citation_text text,
  tags text[],
  relevance bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with tokens as (
    select distinct token
    from regexp_split_to_table(lower(coalesce(p_query, '')), '[^[:alnum:]]+') as token
    where char_length(token) >= 3
      and token not in (
        'của', 'cho', 'với', 'theo', 'những', 'được', 'trong', 'một', 'các', 'nào',
        'what', 'does', 'the', 'and', 'for', 'from', 'with', 'this', 'that', 'how'
      )
    limit 12
  ), scored as (
    select
      document.*,
      (
        select count(*)
        from tokens
        where lower(concat_ws(
          ' ',
          document.title_vi,
          document.title_en,
          document.document_number,
          document.document_type,
          document.issuing_authority,
          document.topic,
          document.summary_vi,
          document.summary_en,
          document.citation_text,
          array_to_string(document.tags, ' ')
        )) like '%' || tokens.token || '%'
      )::bigint as relevance
    from public.legal_ai_documents as document
    where document.status = 'approved'
      and document.legal_citation_allowed = true
      and document.source_tier = 'P1'
  )
  select
    scored.id,
    scored.title_vi,
    scored.title_en,
    scored.document_number,
    scored.document_type,
    scored.issuing_authority,
    scored.jurisdiction,
    scored.topic,
    scored.source_tier,
    scored.source_url,
    scored.issued_at,
    scored.effective_from,
    scored.effective_to,
    scored.summary_vi,
    scored.summary_en,
    scored.citation_text,
    scored.tags,
    scored.relevance
  from scored
  where scored.relevance > 0
  order by
    scored.relevance desc,
    case
      when scored.effective_from is null or scored.effective_from <= current_date then 0
      else 1
    end,
    scored.updated_at desc
  limit least(greatest(coalesce(p_limit, 6), 1), 10);
$$;

alter table public.legal_ai_documents enable row level security;
alter table public.legal_ai_document_versions enable row level security;
alter table public.legal_ai_request_logs enable row level security;

revoke all on public.legal_ai_documents from anon;
revoke all on public.legal_ai_document_versions from anon;
revoke all on public.legal_ai_request_logs from anon;

grant select, insert, update on public.legal_ai_documents to authenticated;
grant select on public.legal_ai_document_versions to authenticated;
grant select on public.legal_ai_request_logs to authenticated;
grant all on public.legal_ai_documents to service_role;
grant all on public.legal_ai_document_versions to service_role;
grant all on public.legal_ai_request_logs to service_role;

revoke all on function public.search_legal_ai_documents(text, integer) from public, anon;
grant execute on function public.search_legal_ai_documents(text, integer) to authenticated, service_role;

drop policy if exists "Admins can manage legal AI documents" on public.legal_ai_documents;
create policy "Admins can manage legal AI documents"
on public.legal_ai_documents
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can read legal AI document versions" on public.legal_ai_document_versions;
create policy "Admins can read legal AI document versions"
on public.legal_ai_document_versions
for select
to authenticated
using (true);

drop policy if exists "Admins can read legal AI request logs" on public.legal_ai_request_logs;
create policy "Admins can read legal AI request logs"
on public.legal_ai_request_logs
for select
to authenticated
using (true);

comment on table public.legal_ai_documents is
  'FACS-controlled legal knowledge used by public Groq assistants only after P1 review and approval.';
comment on column public.legal_ai_documents.citation_text is
  'Verified clauses or extracts supplied to the model. Keep the official source URL and document number aligned with this text.';
comment on table public.legal_ai_document_versions is
  'Immutable snapshots created whenever a controlled legal knowledge item is inserted or updated.';
comment on table public.legal_ai_request_logs is
  'Metadata-only AI audit log. Raw public questions and model answers are intentionally not stored.';
