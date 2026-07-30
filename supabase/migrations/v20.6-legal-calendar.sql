-- FACS Website v20.6 - Legal Calendar CMS and controlled source monitoring
-- Run once in Supabase SQL Editor before deploying the website branch.
-- This migration is additive and does not modify or delete existing website data.

create extension if not exists pgcrypto;

create table if not exists public.legal_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  homepage_url text,
  sync_url text not null unique,
  source_tier text not null default 'P2' check (source_tier in ('P1', 'P2', 'P3')),
  source_kind text not null default 'guidance' check (source_kind in ('official', 'guidance', 'discovery')),
  sync_mode text not null default 'manual' check (sync_mode in ('manual', 'rss', 'link_scan', 'page_watch')),
  legal_citation_allowed boolean not null default false,
  is_active boolean not null default true,
  sync_enabled boolean not null default false,
  last_content_hash text,
  last_checked_at timestamptz,
  last_sync_status text check (last_sync_status is null or last_sync_status in ('ok', 'unchanged', 'error', 'manual')),
  last_error text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_calendar_sources_https check (
    homepage_url is null or homepage_url ~* '^https://'
  ),
  constraint legal_calendar_sources_sync_https check (sync_url ~* '^https://')
);

create index if not exists legal_calendar_sources_sync_idx
  on public.legal_calendar_sources (is_active, sync_enabled, source_tier);

create table if not exists public.legal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  category text not null default 'other' check (category in ('tax', 'accounting', 'labor', 'insurance', 'hse', 'corporate', 'other')),
  title_vi text,
  title_en text,
  summary_vi text,
  summary_en text,
  target_audience_vi text,
  target_audience_en text,
  period_label_vi text,
  period_label_en text,
  legal_basis_vi text,
  legal_basis_en text,
  official_source_url text,
  source_id uuid references public.legal_calendar_sources(id) on delete set null,
  source_name text,
  source_url text,
  source_tier text not null default 'P2' check (source_tier in ('P1', 'P2', 'P3')),
  source_published_at timestamptz,
  verification_status text not null default 'needs_review' check (verification_status in ('needs_review', 'verified', 'rejected')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_recurring boolean not null default false,
  recurrence_rule text,
  notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint legal_calendar_events_has_title check (
    nullif(trim(title_vi), '') is not null or nullif(trim(title_en), '') is not null
  ),
  constraint legal_calendar_events_official_https check (
    official_source_url is null or official_source_url ~* '^https://'
  ),
  constraint legal_calendar_events_source_https check (
    source_url is null or source_url ~* '^https://'
  ),
  constraint legal_calendar_verified_publication check (
    status <> 'published'
    or (
      verification_status = 'verified'
      and published_at is not null
      and (nullif(trim(legal_basis_vi), '') is not null or nullif(trim(legal_basis_en), '') is not null)
      and official_source_url is not null
    )
  )
);

create index if not exists legal_calendar_events_public_idx
  on public.legal_calendar_events (status, verification_status, event_date);
create index if not exists legal_calendar_events_category_idx
  on public.legal_calendar_events (category, event_date);
create index if not exists legal_calendar_events_source_idx
  on public.legal_calendar_events (source_id);

create table if not exists public.legal_calendar_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.legal_calendar_sources(id) on delete cascade,
  title text not null,
  summary text,
  source_url text not null,
  source_published_at timestamptz,
  content_hash text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'mapped', 'dismissed')),
  mapped_event_id uuid references public.legal_calendar_events(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (source_id, content_hash)
);

create index if not exists legal_calendar_candidates_queue_idx
  on public.legal_calendar_candidates (status, first_seen_at desc);

create or replace function public.set_legal_calendar_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_legal_calendar_sources_updated_at on public.legal_calendar_sources;
create trigger set_legal_calendar_sources_updated_at
before update on public.legal_calendar_sources
for each row execute function public.set_legal_calendar_updated_at();

drop trigger if exists set_legal_calendar_events_updated_at on public.legal_calendar_events;
create trigger set_legal_calendar_events_updated_at
before update on public.legal_calendar_events
for each row execute function public.set_legal_calendar_updated_at();

alter table public.legal_calendar_sources enable row level security;
alter table public.legal_calendar_events enable row level security;
alter table public.legal_calendar_candidates enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.legal_calendar_events to anon;
grant select, insert, update, delete on public.legal_calendar_events to authenticated;
grant select, insert, update, delete on public.legal_calendar_sources to authenticated;
grant select, insert, update, delete on public.legal_calendar_candidates to authenticated;

drop policy if exists "Public can read verified legal calendar events" on public.legal_calendar_events;
create policy "Public can read verified legal calendar events"
on public.legal_calendar_events
for select
to anon
using (
  status = 'published'
  and verification_status = 'verified'
  and published_at is not null
  and published_at <= now()
);

drop policy if exists "Admins can manage legal calendar events" on public.legal_calendar_events;
create policy "Admins can manage legal calendar events"
on public.legal_calendar_events
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can manage legal calendar sources" on public.legal_calendar_sources;
create policy "Admins can manage legal calendar sources"
on public.legal_calendar_sources
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Admins can manage legal calendar candidates" on public.legal_calendar_candidates;
create policy "Admins can manage legal calendar candidates"
on public.legal_calendar_candidates
for all
to authenticated
using (true)
with check (true);

-- P1 sources are the legal-basis layer. They are intentionally manual until a
-- stable public feed or page-specific monitoring URL is approved by FACS.
insert into public.legal_calendar_sources (
  name, domain, homepage_url, sync_url, source_tier, source_kind,
  sync_mode, legal_citation_allowed, is_active, sync_enabled, notes
)
values
  (
    'Cơ sở dữ liệu quốc gia về văn bản pháp luật',
    'vbpl.vn',
    'https://vbpl.vn/',
    'https://vbpl.vn/',
    'P1',
    'official',
    'manual',
    true,
    true,
    false,
    'Nguồn chính thức dùng để đối chiếu hiệu lực, điều khoản và căn cứ pháp lý.'
  ),
  (
    'Cổng thông tin điện tử Cục Thuế',
    'gdt.gov.vn',
    'https://www.gdt.gov.vn/',
    'https://www.gdt.gov.vn/',
    'P1',
    'official',
    'manual',
    true,
    true,
    false,
    'Nguồn chính thức về quản lý thuế và hướng dẫn của cơ quan thuế.'
  ),
  (
    'Bảo hiểm xã hội Việt Nam',
    'baohiemxahoi.gov.vn',
    'https://baohiemxahoi.gov.vn/',
    'https://baohiemxahoi.gov.vn/',
    'P1',
    'official',
    'manual',
    true,
    true,
    false,
    'Nguồn chính thức về bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp.'
  ),
  (
    'MISA AMIS - Lịch pháp lý',
    'amis.misa.vn',
    'https://amis.misa.vn/lich-phap-ly/',
    'https://amis.misa.vn/lich-phap-ly/',
    'P2',
    'guidance',
    'page_watch',
    false,
    true,
    true,
    'Nguồn phát hiện và đối chiếu chuyên môn; không dùng độc lập làm căn cứ pháp lý.'
  ),
  (
    'Thư Viện Pháp Luật - Lịch pháp lý doanh nghiệp',
    'thuvienphapluat.vn',
    'https://thuvienphapluat.vn/',
    'https://thuvienphapluat.vn/ma-so-thue/phap-luat-thue/tim-kiem?q=L%E1%BB%8Bch+ph%C3%A1p+l%C3%BD+doanh+nghi%E1%BB%87p&searchType=1',
    'P2',
    'guidance',
    'link_scan',
    false,
    true,
    true,
    'Nguồn phát hiện P2; nội dung phải được đối chiếu lại với nguồn P1.'
  ),
  (
    'Luật Việt Nam - Tin pháp luật',
    'luatvietnam.vn',
    'https://luatvietnam.vn/',
    'https://luatvietnam.vn/tin-phap-luat.html',
    'P2',
    'guidance',
    'link_scan',
    false,
    true,
    true,
    'Nguồn phát hiện P2; nội dung phải được đối chiếu lại với nguồn P1.'
  )
on conflict (sync_url) do update set
  name = excluded.name,
  domain = excluded.domain,
  homepage_url = excluded.homepage_url,
  source_tier = excluded.source_tier,
  source_kind = excluded.source_kind,
  sync_mode = excluded.sync_mode,
  legal_citation_allowed = excluded.legal_citation_allowed,
  notes = excluded.notes;

-- Initial review queue. These records deliberately remain draft/needs_review
-- until a FACS administrator checks the current P1 instrument and publishes.
insert into public.legal_calendar_events (
  event_date, category, title_vi, title_en, summary_vi, summary_en,
  target_audience_vi, target_audience_en, legal_basis_vi, legal_basis_en,
  source_id, source_name, source_url, source_tier,
  verification_status, status, notes
)
select
  seed.event_date::date,
  seed.category,
  seed.title_vi,
  seed.title_en,
  seed.summary_vi,
  seed.summary_en,
  seed.target_audience_vi,
  seed.target_audience_en,
  seed.legal_basis_vi,
  seed.legal_basis_en,
  source.id,
  source.name,
  source.sync_url,
  source.source_tier,
  'needs_review',
  'draft',
  'Dữ liệu khởi tạo từ lịch công khai tháng 7/2026. Phải đối chiếu nguồn P1 và xác định đối tượng áp dụng trước khi xuất bản.'
from (
  values
    (
      '2026-07-04', 'labor',
      'Báo cáo sử dụng lao động nước ngoài 6 tháng đầu năm 2026',
      'First-half 2026 foreign labour utilisation report',
      'Mốc phát hiện cần rà soát đối tượng áp dụng, mẫu biểu và cơ quan tiếp nhận.',
      'Discovery deadline requiring review of applicability, filing form and receiving authority.',
      'Doanh nghiệp có sử dụng lao động nước ngoài',
      'Enterprises employing foreign workers',
      'Khoản 1 Điều 6 Nghị định 152/2020/NĐ-CP',
      'Clause 1 Article 6 of Decree 152/2020/ND-CP'
    ),
    (
      '2026-07-04', 'hse',
      'Báo cáo tai nạn lao động và y tế lao động 6 tháng đầu năm 2026',
      'First-half 2026 occupational accident and occupational health reports',
      'Cần rà soát riêng từng nghĩa vụ, đối tượng và cơ quan tiếp nhận.',
      'Each obligation, applicable entity and receiving authority requires separate review.',
      'Doanh nghiệp thuộc đối tượng lập báo cáo',
      'Enterprises subject to the reporting requirement',
      'Khoản 1 Điều 24 Nghị định 39/2016/NĐ-CP; Điều 10 Thông tư 19/2016/TT-BYT',
      'Clause 1 Article 24 of Decree 39/2016/ND-CP; Article 10 of Circular 19/2016/TT-BYT'
    ),
    (
      '2026-07-20', 'tax',
      'Hồ sơ khai thuế theo tháng của kỳ tháng 6/2026',
      'Monthly tax filings for the June 2026 period',
      'Có thể bao gồm thuế GTGT và thuế nhà thầu tùy phương pháp khai và giao dịch thực tế.',
      'May include VAT and foreign contractor tax depending on the filing method and actual transactions.',
      'Doanh nghiệp thuộc diện khai thuế theo tháng',
      'Enterprises subject to monthly tax filing',
      'Khoản 1 Điều 44 Luật Quản lý thuế 2019; điểm n khoản 4 Điều 8 Nghị định 126/2020/NĐ-CP',
      'Clause 1 Article 44 of the 2019 Law on Tax Administration; Point n Clause 4 Article 8 of Decree 126/2020/ND-CP'
    ),
    (
      '2026-07-30', 'tax',
      'Nộp thuế TNDN tạm tính Quý 2/2026',
      'Provisional corporate income tax payment for Q2 2026',
      'Cần đối chiếu số thuế tạm nộp lũy kế và quy định có hiệu lực tại ngày thực hiện.',
      'Cumulative provisional payments and rules effective on the action date should be checked.',
      'Doanh nghiệp phát sinh nghĩa vụ thuế TNDN',
      'Enterprises with corporate income tax obligations',
      'Khoản 1 Điều 55 Luật Quản lý thuế 2019',
      'Clause 1 Article 55 of the 2019 Law on Tax Administration'
    ),
    (
      '2026-07-31', 'insurance',
      'Trích nộp BHXH, BHYT, BHTN và kinh phí công đoàn',
      'Payment of social, health and unemployment insurance and trade union funding',
      'Cần kiểm tra kỳ đóng, phương thức đóng và nghĩa vụ áp dụng theo tình trạng lao động thực tế.',
      'The contribution period, payment method and applicability should be confirmed against the actual workforce.',
      'Doanh nghiệp có người lao động thuộc diện tham gia',
      'Enterprises with employees subject to compulsory participation',
      'Khoản 4 Điều 34 Luật Bảo hiểm xã hội 2024 và các văn bản hướng dẫn liên quan',
      'Clause 4 Article 34 of the 2024 Law on Social Insurance and relevant guidance'
    ),
    (
      '2026-07-31', 'tax',
      'Hồ sơ khai thuế theo quý của Quý 2/2026',
      'Quarterly tax filings for Q2 2026',
      'Có thể bao gồm thuế GTGT và thuế TNCN tùy đối tượng, kỳ khai và tình hình phát sinh.',
      'May include VAT and personal income tax depending on the taxpayer, filing cycle and actual liabilities.',
      'Doanh nghiệp thuộc diện khai thuế theo quý',
      'Enterprises subject to quarterly tax filing',
      'Khoản 1 Điều 44 Luật Quản lý thuế 2019',
      'Clause 1 Article 44 of the 2019 Law on Tax Administration'
    )
) as seed (
  event_date, category, title_vi, title_en, summary_vi, summary_en,
  target_audience_vi, target_audience_en, legal_basis_vi, legal_basis_en
)
join public.legal_calendar_sources source
  on source.sync_url = 'https://amis.misa.vn/lich-phap-ly/'
where not exists (
  select 1
  from public.legal_calendar_events existing
  where existing.event_date = seed.event_date::date
    and existing.title_vi = seed.title_vi
);

comment on table public.legal_calendar_candidates is
  'Automated discovery queue only. Candidate records are never publicly readable and never auto-published.';
comment on column public.legal_calendar_sources.legal_citation_allowed is
  'True only when FACS permits the source to be used as a primary legal citation. P2/P3 sources should remain false.';
