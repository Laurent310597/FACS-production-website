-- FACS Website v20.19 - split public Groq sources from the private CMS library.
-- Additive migration: v20.18 tables remain available for audit/rollback, but
-- the v20.19 public assistant reads the registry below and the CMS assistant
-- reads only cms_knowledge_* content plus non-content operational metadata.

create extension if not exists pgcrypto;

create table if not exists public.public_ai_source_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  source_tier text not null default 'P2' check (source_tier in ('P1', 'P2')),
  source_kind text not null default 'reputable_legal_database'
    check (source_kind in ('official', 'reputable_legal_database', 'professional_reference')),
  legal_authority boolean not null default false,
  citation_allowed boolean not null default true,
  is_active boolean not null default true,
  coverage text[] not null default array[]::text[],
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_ai_source_registry_domain_unique unique (domain),
  constraint public_ai_source_registry_domain_format check (
    domain = lower(domain)
    and domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?([.][a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
    and domain like '%.%'
    and domain not like '%.local'
  ),
  constraint public_ai_source_registry_tier_governance check (
    (source_tier = 'P1' and source_kind = 'official' and legal_authority = true)
    or (source_tier = 'P2' and legal_authority = false)
  )
);

create index if not exists public_ai_source_registry_active_idx
  on public.public_ai_source_registry (is_active, citation_allowed, source_tier, source_kind);

create table if not exists public.cms_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('url', 'file')),
  source_url text,
  storage_bucket text,
  storage_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  status text not null default 'processing'
    check (status in ('processing', 'active', 'error', 'archived')),
  extraction_error text,
  content_hash text,
  tags text[] not null default array[]::text[],
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_knowledge_documents_source_location check (
    (
      source_type = 'url'
      and source_url ~* '^https://'
      and storage_path is null
    )
    or (
      source_type = 'file'
      and source_url is null
      and storage_bucket = 'cms-private-library'
      and nullif(trim(storage_path), '') is not null
    )
  ),
  constraint cms_knowledge_documents_file_size check (
    file_size_bytes is null or (file_size_bytes >= 0 and file_size_bytes <= 15728640)
  ),
  constraint cms_knowledge_documents_hash_format check (
    content_hash is null or content_hash ~ '^[a-f0-9]{64}$'
  )
);

create index if not exists cms_knowledge_documents_status_idx
  on public.cms_knowledge_documents (status, updated_at desc);
create index if not exists cms_knowledge_documents_tags_idx
  on public.cms_knowledge_documents using gin (tags);

create table if not exists public.cms_knowledge_chunks (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.cms_knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) between 1 and 8000),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists cms_knowledge_chunks_document_idx
  on public.cms_knowledge_chunks (document_id, chunk_index);

create or replace function public.set_v20_19_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_public_ai_source_registry_updated_at on public.public_ai_source_registry;
create trigger set_public_ai_source_registry_updated_at
before update on public.public_ai_source_registry
for each row execute function public.set_v20_19_updated_at();

drop trigger if exists set_cms_knowledge_documents_updated_at on public.cms_knowledge_documents;
create trigger set_cms_knowledge_documents_updated_at
before update on public.cms_knowledge_documents
for each row execute function public.set_v20_19_updated_at();

create or replace function public.search_cms_knowledge(
  p_query text,
  p_limit integer default 8
)
returns table (
  document_id uuid,
  title text,
  source_type text,
  source_url text,
  storage_bucket text,
  storage_path text,
  file_name text,
  mime_type text,
  tags text[],
  chunk_index integer,
  content text,
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
        'tôi', 'hãy', 'giúp', 'what', 'does', 'the', 'and', 'for', 'from', 'with',
        'this', 'that', 'how', 'please', 'could', 'would'
      )
    limit 16
  ), scored as (
    select
      document.id as document_id,
      document.title,
      document.source_type,
      document.source_url,
      document.storage_bucket,
      document.storage_path,
      document.file_name,
      document.mime_type,
      document.tags,
      chunk.chunk_index,
      chunk.content,
      (
        select coalesce(sum(
          case
            when lower(document.title) like '%' || tokens.token || '%' then 4
            when lower(array_to_string(document.tags, ' ')) like '%' || tokens.token || '%' then 3
            when lower(chunk.content) like '%' || tokens.token || '%' then 1
            else 0
          end
        ), 0)
        from tokens
      )::bigint as relevance
    from public.cms_knowledge_documents as document
    join public.cms_knowledge_chunks as chunk on chunk.document_id = document.id
    where document.status = 'active'
  )
  select
    scored.document_id,
    scored.title,
    scored.source_type,
    scored.source_url,
    scored.storage_bucket,
    scored.storage_path,
    scored.file_name,
    scored.mime_type,
    scored.tags,
    scored.chunk_index,
    scored.content,
    scored.relevance
  from scored
  where scored.relevance > 0
  order by scored.relevance desc, scored.document_id, scored.chunk_index
  limit least(greatest(coalesce(p_limit, 8), 1), 16);
$$;

alter table public.public_ai_source_registry enable row level security;
alter table public.cms_knowledge_documents enable row level security;
alter table public.cms_knowledge_chunks enable row level security;

revoke all on public.public_ai_source_registry from anon;
revoke all on public.cms_knowledge_documents from anon;
revoke all on public.cms_knowledge_chunks from anon;

grant select, insert, update on public.public_ai_source_registry to authenticated;
grant select, update on public.cms_knowledge_documents to authenticated;
grant select on public.cms_knowledge_chunks to authenticated;
grant all on public.public_ai_source_registry to service_role;
grant all on public.cms_knowledge_documents to service_role;
grant all on public.cms_knowledge_chunks to service_role;

revoke all on function public.search_cms_knowledge(text, integer) from public, anon;
grant execute on function public.search_cms_knowledge(text, integer) to authenticated, service_role;

drop policy if exists "CMS admins manage public AI source registry" on public.public_ai_source_registry;
create policy "CMS admins manage public AI source registry"
on public.public_ai_source_registry
for all
to authenticated
using (true)
with check (true);

drop policy if exists "CMS admins read private knowledge documents" on public.cms_knowledge_documents;
create policy "CMS admins read private knowledge documents"
on public.cms_knowledge_documents
for select
to authenticated
using (true);

drop policy if exists "CMS admins archive private knowledge documents" on public.cms_knowledge_documents;
create policy "CMS admins archive private knowledge documents"
on public.cms_knowledge_documents
for update
to authenticated
using (true)
with check (true);

drop policy if exists "CMS admins read private knowledge chunks" on public.cms_knowledge_chunks;
create policy "CMS admins read private knowledge chunks"
on public.cms_knowledge_chunks
for select
to authenticated
using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-private-library',
  'cms-private-library',
  false,
  15728640,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'application/json'
  ]::text[]
)
on conflict (id) do nothing;

drop policy if exists "CMS admins upload private knowledge files" on storage.objects;
create policy "CMS admins upload private knowledge files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cms-private-library'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "CMS admins read private knowledge files" on storage.objects;
create policy "CMS admins read private knowledge files"
on storage.objects
for select
to authenticated
using (bucket_id = 'cms-private-library');

insert into public.public_ai_source_registry (
  name,
  domain,
  source_tier,
  source_kind,
  legal_authority,
  citation_allowed,
  is_active,
  coverage,
  notes
)
values
  ('Cơ sở dữ liệu quốc gia về văn bản pháp luật', 'vbpl.vn', 'P1', 'official', true, true, true, array['legal', 'corporate', 'tax', 'accounting', 'labour'], 'Nguồn văn bản pháp luật chính thức.'),
  ('Cổng thông tin điện tử Chính phủ', 'chinhphu.vn', 'P1', 'official', true, true, true, array['legal', 'policy', 'corporate', 'compliance'], 'Ưu tiên văn bản, thông cáo và thông tin của cơ quan nhà nước.'),
  ('Cổng văn bản Chính phủ', 'vanban.chinhphu.vn', 'P1', 'official', true, true, true, array['legal', 'policy', 'corporate', 'compliance'], 'Nguồn văn bản và dữ liệu hiệu lực chính thức.'),
  ('Bộ Tài chính', 'mof.gov.vn', 'P1', 'official', true, true, true, array['tax', 'accounting', 'finance'], 'Nguồn chính thức của Bộ Tài chính.'),
  ('Cơ quan Thuế', 'gdt.gov.vn', 'P1', 'official', true, true, true, array['tax', 'invoice', 'administration'], 'Nguồn chính thức về quản lý thuế và hóa đơn.'),
  ('Bảo hiểm xã hội Việt Nam', 'baohiemxahoi.gov.vn', 'P1', 'official', true, true, true, array['social_insurance', 'health_insurance', 'labour'], 'Nguồn chính thức về BHXH, BHYT và BHTN.'),
  ('Ngân hàng Nhà nước Việt Nam', 'sbv.gov.vn', 'P1', 'official', true, true, true, array['banking', 'foreign_exchange', 'finance'], 'Nguồn chính thức về ngân hàng và ngoại hối.'),
  ('Thư Viện Pháp Luật', 'thuvienphapluat.vn', 'P2', 'reputable_legal_database', false, true, true, array['legal', 'tax', 'accounting', 'labour', 'compliance'], 'Nguồn dữ liệu pháp luật thứ cấp uy tín; không phải cơ quan ban hành.'),
  ('LuatVietnam', 'luatvietnam.vn', 'P2', 'reputable_legal_database', false, true, true, array['legal', 'tax', 'accounting', 'labour', 'compliance'], 'Nguồn dữ liệu pháp luật thứ cấp uy tín; không phải cơ quan ban hành.')
on conflict (domain) do nothing;

comment on table public.public_ai_source_registry is
  'Domain allowlist used only by public Groq web search. P1 is official; P2 is reputable secondary material.';
comment on table public.cms_knowledge_documents is
  'Private administrator-curated URL/file library used only by the authenticated OpenAI CMS assistant.';
comment on table public.cms_knowledge_chunks is
  'Extracted private library text. Never supplied to public Groq assistants.';
