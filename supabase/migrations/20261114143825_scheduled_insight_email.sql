-- Explicit approval of an article and a fixed Audience snapshot for future delivery.
create table public.insight_email_schedules (
  id uuid primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  scheduled_at timestamptz not null,
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid not null,
  content_hash text not null,
  audience_ids uuid[] not null,
  bcc_addresses text[] not null,
  status text not null default 'scheduled' check (status in ('scheduled','processing','sent','failed','cancelled','invalidated')),
  updated_at timestamptz not null default now(),
  error_message text,
  check (cardinality(bcc_addresses) between 1 and 497),
  check (cardinality(audience_ids) = cardinality(bcc_addresses))
);
create unique index insight_email_one_active_schedule on public.insight_email_schedules(post_id) where status in ('scheduled','processing');
create index insight_email_schedules_due on public.insight_email_schedules(scheduled_at) where status='scheduled';
alter table public.insight_email_schedules enable row level security;
revoke all on public.insight_email_schedules from public, anon, authenticated;
grant select,insert,update on public.insight_email_schedules to service_role;

create or replace function public.confirm_insight_email_schedule(
  p_post_id uuid, p_confirmed_by uuid, p_request_id uuid, p_expected_hash text,
  p_expected_updated_at timestamptz, p_scheduled_at timestamptz,
  p_audience_ids uuid[], p_expected_bcc text[]
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare article public.posts%rowtype; saved public.insight_email_schedules%rowtype;
  recipients text[]; contacts uuid[];
begin
  select * into article from public.posts where id=p_post_id for update;
  if not found then raise exception 'Không tìm thấy bài viết.'; end if;
  select * into saved from public.insight_email_schedules where id=p_request_id;
  if found then
    if saved.post_id<>p_post_id or saved.confirmed_by<>p_confirmed_by then raise exception 'Mã xác nhận không khớp.'; end if;
    return to_jsonb(saved);
  end if;
  if p_confirmed_by is null or p_request_id is null or nullif(p_expected_hash,'') is null then raise exception 'Thiếu thông tin xác nhận.'; end if;
  if article.status<>'published' or article.published_at is null or article.published_at<=now()
    or article.published_at is distinct from p_scheduled_at then raise exception 'Giờ đăng đã thay đổi hoặc đã đến hạn. Vui lòng chọn lại bài viết.'; end if;
  if article.email_delivery_mode='disabled' or article.email_notification_status='processing' then raise exception 'Bài viết chưa sẵn sàng đặt lịch gửi.'; end if;
  if article.updated_at is distinct from p_expected_updated_at
    or article.email_notification_preview_hash is distinct from p_expected_hash
    or article.email_notification_test_hash is distinct from p_expected_hash
    or article.email_notification_tested_at is null
    or article.email_notification_tested_at<now()-interval '24 hours'
    or article.email_notification_tested_at>now() then raise exception 'Cần xem trước và gửi thử đúng nội dung trong 24 giờ trước khi xác nhận lịch.'; end if;
  select array_agg(a.id order by lower(trim(a.email::text))),array_agg(lower(trim(a.email::text)) order by lower(trim(a.email::text)))
    into contacts,recipients from public.insight_email_audience a
    where a.id=any(p_audience_ids) and a.status='subscribed'
    and lower(trim(a.email::text)) not in ('infor@facs.vn','tunguyen@facs.vn','yendoan@facs.vn','thanhhuynh@facs.vn')
    and trim(a.email::text) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
  if coalesce(cardinality(recipients),0)=0 or cardinality(recipients)>497
    or cardinality(contacts)<>cardinality(p_audience_ids) or recipients is distinct from p_expected_bcc then
    raise exception 'Danh sách Bcc đã thay đổi. Hãy kiểm tra lại xác nhận.';
  end if;
  insert into public.insight_email_schedules(id,post_id,scheduled_at,confirmed_by,content_hash,audience_ids,bcc_addresses)
    values(p_request_id,p_post_id,p_scheduled_at,p_confirmed_by,p_expected_hash,contacts,recipients) returning * into saved;
  return to_jsonb(saved);
end; $$;

create or replace function public.cancel_insight_email_schedule(p_post_id uuid,p_schedule_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.posts where id=p_post_id for update;
  update public.insight_email_schedules set status='cancelled',updated_at=now()
    where id=p_schedule_id and post_id=p_post_id and status='scheduled';
  if not found then raise exception 'Lịch đã thay đổi hoặc đang gửi. Vui lòng tải lại.'; end if;
end; $$;

create or replace function public.claim_scheduled_insight_email(p_schedule_id uuid,p_current_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare article public.posts%rowtype; item public.insight_email_schedules%rowtype;
  post_key uuid; recipients text[]; delivery_id uuid;
begin
  select post_id into post_key from public.insight_email_schedules where id=p_schedule_id;
  select * into article from public.posts where id=post_key for update;
  select * into item from public.insight_email_schedules where id=p_schedule_id for update;
  if not found or item.status<>'scheduled' or item.scheduled_at>now() then return null; end if;
  if article.status<>'published' or article.published_at is distinct from item.scheduled_at
    or article.email_delivery_mode='disabled' or item.content_hash is distinct from p_current_hash
    or article.email_notification_preview_hash is distinct from item.content_hash
    or article.email_notification_test_hash is distinct from item.content_hash then
    update public.insight_email_schedules set status='invalidated',updated_at=now(),error_message='Nội dung hoặc giờ đăng đã thay đổi. Cần xác nhận lịch lại.' where id=item.id;
    return null;
  end if;
  if article.email_notification_status='processing' then return null; end if;
  -- Only previously approved addresses that still belong to the same subscribed contact.
  select array_agg(snapshot.email order by snapshot.email) into recipients
    from unnest(item.audience_ids,item.bcc_addresses) as snapshot(id,email)
    join public.insight_email_audience a on a.id=snapshot.id
    where a.status='subscribed' and lower(trim(a.email::text))=snapshot.email;
  if coalesce(cardinality(recipients),0)=0 then
    update public.insight_email_schedules set status='failed',updated_at=now(),error_message='Không còn người nhận hợp lệ trong danh sách đã xác nhận.' where id=item.id;
    return null;
  end if;
  update public.insight_email_schedules set status='processing',updated_at=now() where id=item.id;
  insert into public.insight_email_delivery_logs(post_id,delivery_type,status,sender_email,to_addresses,cc_addresses,bcc_count,bcc_addresses,send_request_id,delivery_scope)
    values(article.id,'notification','processing','infor@facs.vn',array['tunguyen@facs.vn'],array['yendoan@facs.vn','thanhhuynh@facs.vn'],cardinality(recipients),recipients,item.id,'audience') returning id into delivery_id;
  update public.posts set email_notification_status='processing',email_notification_enabled=false,email_notification_processing_at=now(),email_notification_confirmed_at=item.confirmed_at,email_notification_confirmed_by=item.confirmed_by,email_notification_requested_at=now(),email_notification_next_attempt_at=null,email_notification_attempts=email_notification_attempts+1 where id=article.id;
  return jsonb_build_object('post',to_jsonb(article),'log_id',delivery_id,'request_id',item.id,'status','processing','audience_id',null,'bcc',recipients,'cc',array['yendoan@facs.vn','thanhhuynh@facs.vn']);
end; $$;

-- Internal triggers must invalidate approvals even when an editor has no queue permissions.
create schema if not exists facs_internal;
revoke all on schema facs_internal from public,anon,authenticated;
create or replace function facs_internal.invalidate_insight_schedule()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (to_jsonb(new) - array['updated_at','email_notification_status','email_notification_enabled','email_notification_processing_at','email_notification_confirmed_at','email_notification_confirmed_by','email_notification_requested_at','email_notification_next_attempt_at','email_notification_attempts','email_notification_last_error','email_notification_previewed_at','email_notification_preview_hash','email_notification_tested_at','email_notification_test_hash','email_notification_sent_at','email_notification_message_id','email_notification_thread_id','email_notification_cancelled_at'])
    is distinct from
    (to_jsonb(old) - array['updated_at','email_notification_status','email_notification_enabled','email_notification_processing_at','email_notification_confirmed_at','email_notification_confirmed_by','email_notification_requested_at','email_notification_next_attempt_at','email_notification_attempts','email_notification_last_error','email_notification_previewed_at','email_notification_preview_hash','email_notification_tested_at','email_notification_test_hash','email_notification_sent_at','email_notification_message_id','email_notification_thread_id','email_notification_cancelled_at']) then
    if exists(select 1 from public.insight_email_schedules where post_id=new.id and status='processing') then raise exception 'Email hẹn giờ đang gửi. Vui lòng chờ hoàn tất.'; end if;
    update public.insight_email_schedules set status='invalidated',updated_at=now(),error_message='Bài viết hoặc giờ đăng đã thay đổi. Cần kiểm thử và xác nhận lịch lại.' where post_id=new.id and status='scheduled';
  end if;
  return new;
end; $$;
revoke all on function facs_internal.invalidate_insight_schedule() from public,anon,authenticated;
create trigger invalidate_insight_schedule after update on public.posts for each row execute function facs_internal.invalidate_insight_schedule();

create or replace function facs_internal.finish_insight_schedule()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status in ('sent','failed') then
    update public.insight_email_schedules set status=new.status,updated_at=now(),error_message=new.error_message
      where id=new.send_request_id and status='processing';
  end if;
  return new;
end; $$;
revoke all on function facs_internal.finish_insight_schedule() from public,anon,authenticated;
create trigger finish_insight_schedule after update of status on public.insight_email_delivery_logs for each row execute function facs_internal.finish_insight_schedule();

revoke all on function public.confirm_insight_email_schedule(uuid,uuid,uuid,text,timestamptz,timestamptz,uuid[],text[]) from public,anon,authenticated;
revoke all on function public.cancel_insight_email_schedule(uuid,uuid) from public,anon,authenticated;
revoke all on function public.claim_scheduled_insight_email(uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_insight_email_schedule(uuid,uuid,uuid,text,timestamptz,timestamptz,uuid[],text[]),public.cancel_insight_email_schedule(uuid,uuid),public.claim_scheduled_insight_email(uuid,text) to service_role;

create table public.insight_email_scheduler_config (
  singleton boolean primary key default true check(singleton),
  secret_hash text not null
);
alter table public.insight_email_scheduler_config enable row level security;
revoke all on public.insight_email_scheduler_config from public,anon,authenticated;
grant select on public.insight_email_scheduler_config to service_role;
create function public.verify_insight_schedule_token(p_token text)
returns boolean language sql security invoker set search_path='' as $$
  select length(coalesce(p_token,''))>=32 and exists(
    select 1 from public.insight_email_scheduler_config
    where secret_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex'));
$$;
revoke all on function public.verify_insight_schedule_token(text) from public,anon,authenticated;
grant execute on function public.verify_insight_schedule_token(text) to service_role;
