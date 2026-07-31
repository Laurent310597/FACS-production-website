-- FACS Website v20.15 - Editable automated receipt email templates
-- Additive migration. Existing form submissions and email logs are preserved.

create table if not exists public.form_email_templates (
  template_key text primary key check (template_key in ('career_receipt', 'contact_receipt')),
  subject text not null check (char_length(subject) between 1 and 300),
  body_vi text not null check (char_length(body_vi) between 1 and 12000),
  body_en text not null check (char_length(body_en) between 1 and 12000),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.form_email_templates enable row level security;
revoke all on public.form_email_templates from anon, authenticated;
grant all on public.form_email_templates to service_role;

comment on table public.form_email_templates is
  'Admin-managed overrides for automated career and contact receipt emails. Missing rows fall back to code defaults.';
