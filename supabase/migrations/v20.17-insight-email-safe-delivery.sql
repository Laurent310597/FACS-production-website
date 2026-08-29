-- FACS Website v20.17 - governed Insight email delivery
-- Safe default: publishing an article never sends email by itself.

alter table public.posts
  add column if not exists email_delivery_mode text not null default 'disabled',
  add column if not exists email_notification_previewed_at timestamptz,
  add column if not exists email_notification_preview_hash text,
  add column if not exists email_notification_tested_at timestamptz,
  add column if not exists email_notification_test_hash text,
  add column if not exists email_notification_confirmed_at timestamptz,
  add column if not exists email_notification_confirmed_by uuid;

alter table public.posts
  drop constraint if exists posts_email_delivery_mode_check;

alter table public.posts
  add constraint posts_email_delivery_mode_check
  check (email_delivery_mode in ('disabled', 'review_after_publish', 'manual_later'));

alter table public.posts
  drop constraint if exists posts_email_notification_status_check;

alter table public.posts
  add constraint posts_email_notification_status_check
  check (email_notification_status in (
    'disabled',
    'awaiting_review',
    'pending',
    'cancelled',
    'processing',
    'sent',
    'failed'
  ));

update public.posts
set email_delivery_mode = 'disabled',
    email_notification_enabled = false,
    email_notification_status = case
      when email_notification_status = 'sent' then 'sent'
      else 'disabled'
    end
where email_delivery_mode = 'disabled'
  and email_notification_status <> 'sent';

create or replace function public.guard_insight_email_review_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  email_content_changed boolean := false;
begin
  if tg_op = 'UPDATE' then
    email_content_changed :=
      old.title_vi is distinct from new.title_vi
      or old.title_en is distinct from new.title_en
      or old.excerpt_vi is distinct from new.excerpt_vi
      or old.excerpt_en is distinct from new.excerpt_en
      or old.slug_vi is distinct from new.slug_vi
      or old.slug_en is distinct from new.slug_en
      or old.slug is distinct from new.slug
      or old.status is distinct from new.status
      or old.published_at is distinct from new.published_at
      or old.email_delivery_mode is distinct from new.email_delivery_mode;
  end if;

  if new.email_delivery_mode = 'disabled' then
    new.email_notification_enabled := false;
    if coalesce(new.email_notification_status, 'disabled') <> 'sent' then
      new.email_notification_status := 'disabled';
      new.email_notification_previewed_at := null;
      new.email_notification_preview_hash := null;
      new.email_notification_tested_at := null;
      new.email_notification_test_hash := null;
      new.email_notification_confirmed_at := null;
      new.email_notification_confirmed_by := null;
      new.email_notification_requested_at := null;
      new.email_notification_next_attempt_at := null;
    end if;
    return new;
  end if;

  -- A previously sent campaign is immutable. Editing the article never sends it again.
  if tg_op = 'UPDATE' and old.email_notification_status = 'sent' then
    new.email_notification_enabled := false;
    new.email_notification_status := 'sent';
    return new;
  end if;

  if tg_op = 'INSERT' or email_content_changed then
    new.email_notification_enabled := false;
    new.email_notification_status := 'awaiting_review';
    new.email_notification_previewed_at := null;
    new.email_notification_preview_hash := null;
    new.email_notification_tested_at := null;
    new.email_notification_test_hash := null;
    new.email_notification_confirmed_at := null;
    new.email_notification_confirmed_by := null;
    new.email_notification_requested_at := null;
    new.email_notification_next_attempt_at := null;
    new.email_notification_last_error := null;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_insight_email_review_state on public.posts;
create trigger guard_insight_email_review_state
before insert or update on public.posts
for each row execute function public.guard_insight_email_review_state();

-- Validate the reviewed snapshot and claim the single Audience send in one
-- transaction. Two simultaneous confirmations cannot both obtain the post.
create or replace function public.confirm_and_claim_insight_email(
  p_post_id uuid,
  p_confirmed_by uuid,
  p_expected_hash text
)
returns setof public.posts
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.posts p
  set email_notification_enabled = true,
      email_notification_status = 'processing',
      email_notification_requested_at = now(),
      email_notification_confirmed_at = now(),
      email_notification_confirmed_by = p_confirmed_by,
      email_notification_processing_at = now(),
      email_notification_next_attempt_at = null,
      email_notification_attempts = p.email_notification_attempts + 1,
      email_notification_last_error = null,
      updated_at = now()
  where p.id = p_post_id
    and p.email_delivery_mode <> 'disabled'
    and p.email_notification_status in ('awaiting_review', 'failed', 'cancelled')
    and p.status = 'published'
    and p.published_at is not null
    and p.published_at <= now()
    and p.email_notification_preview_hash = p_expected_hash
    and p.email_notification_test_hash = p_expected_hash
    and p.email_notification_tested_at >= now() - interval '24 hours'
  returning p.*;
end;
$$;

revoke all on function public.confirm_and_claim_insight_email(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.confirm_and_claim_insight_email(uuid, uuid, text)
  to service_role;

-- Finish the database side of an accepted Microsoft Graph send atomically. If
-- this transaction fails, the post stays in processing and cannot be retried
-- automatically, avoiding a duplicate Audience email.
create or replace function public.finalize_insight_email_delivery(
  p_post_id uuid,
  p_log_id uuid,
  p_message_id text default null,
  p_thread_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts
  set email_notification_status = 'sent',
      email_notification_sent_at = now(),
      email_notification_processing_at = null,
      email_notification_next_attempt_at = null,
      email_notification_last_error = null,
      email_notification_message_id = coalesce(p_message_id, email_notification_message_id),
      email_notification_thread_id = coalesce(p_thread_id, email_notification_thread_id),
      updated_at = now()
  where id = p_post_id
    and email_notification_status = 'processing';

  if not found then
    raise exception 'Post is not in processing state';
  end if;

  update public.insight_email_delivery_logs
  set status = 'sent',
      lark_message_id = p_message_id,
      lark_thread_id = p_thread_id,
      completed_at = now()
  where id = p_log_id
    and post_id = p_post_id
    and status = 'processing';

  if not found then
    raise exception 'Delivery log is not in processing state';
  end if;
end;
$$;

revoke all on function public.finalize_insight_email_delivery(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_insight_email_delivery(uuid, uuid, text, text)
  to service_role;

comment on column public.posts.email_delivery_mode is
  'disabled: no email; review_after_publish: open governed review after publish; manual_later: send later from Email Insights.';
comment on column public.posts.email_notification_preview_hash is
  'SHA-256 of the exact email-relevant article content most recently previewed.';
comment on column public.posts.email_notification_test_hash is
  'SHA-256 of the exact email-relevant article content most recently test-sent.';
comment on column public.posts.email_notification_confirmed_at is
  'Explicit Audience confirmation timestamp. Confirmation is rejected if the article changed after testing.';
