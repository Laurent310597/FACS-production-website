-- Explicit selected-customer sends retain a reviewable, immutable recipient snapshot.
alter table public.insight_email_delivery_logs add column if not exists audience_contact_ids uuid[];
alter table public.insight_email_delivery_logs drop constraint if exists insight_email_delivery_logs_delivery_scope_check;
alter table public.insight_email_delivery_logs add constraint insight_email_delivery_logs_delivery_scope_check
  check (delivery_scope in ('audience', 'single', 'selected'));
create index if not exists insight_email_delivery_history_idx
  on public.insight_email_delivery_logs(created_at desc, id);

create or replace function public.claim_insight_email_selected_delivery(
  p_post_id uuid, p_confirmed_by uuid, p_expected_hash text,
  p_expected_updated_at timestamptz, p_request_id uuid, p_audience_ids uuid[], p_expected_bcc text[]
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  article public.posts%rowtype;
  delivery public.insight_email_delivery_logs%rowtype;
  selected_ids uuid[];
  expected text[];
  recipients text[];
  eligible_count integer;
  copies text[] := array['yendoan@facs.vn','thanhhuynh@facs.vn'];
begin
  if p_request_id is null or p_confirmed_by is null or nullif(p_expected_hash, '') is null then
    raise exception 'Thiếu thông tin xác nhận lượt gửi.';
  end if;
  if coalesce(cardinality(p_audience_ids),0) not between 1 and 497
    or array_position(p_audience_ids,null) is not null
    or coalesce(cardinality(p_expected_bcc),0) not between 1 and 497
    or array_position(p_expected_bcc,null) is not null then
    raise exception 'Vui lòng chọn từ 1 đến 497 khách hàng và xem trước Bcc.';
  end if;
  select array_agg(id order by id) into selected_ids from (select distinct unnest(p_audience_ids) as id) ids;
  select array_agg(email order by email) into expected from (select distinct lower(trim(unnest(p_expected_bcc))) as email) emails;
  select * into article from public.posts where id = p_post_id for update;
  if not found then raise exception 'Không tìm thấy bài viết.'; end if;

  select * into delivery from public.insight_email_delivery_logs where send_request_id = p_request_id;
  if found then
    if delivery.post_id is distinct from p_post_id or delivery.delivery_scope <> 'selected'
      or delivery.audience_contact_ids is distinct from selected_ids or delivery.bcc_addresses is distinct from expected then
      raise exception 'Mã lượt gửi không khớp bài viết hoặc nhóm khách đã chọn.';
    end if;
    return jsonb_build_object('duplicate',true,'post',to_jsonb(article),'log_id',delivery.id,
      'status',delivery.status,'request_id',p_request_id,'audience_id',null,
      'bcc',to_jsonb(delivery.bcc_addresses),'cc',to_jsonb(delivery.cc_addresses));
  end if;
  if article.email_notification_status = 'processing' then
    raise exception 'Bài viết đang có một lượt gửi. Vui lòng chờ hoàn tất.';
  end if;
  if article.status <> 'published' or article.published_at is null or article.published_at > now() then
    raise exception 'Chỉ được gửi email khi bài viết đã xuất bản công khai.';
  end if;
  if article.email_delivery_mode = 'disabled' then raise exception 'Bài viết đang ở chế độ Không gửi email.'; end if;
  if article.updated_at is distinct from p_expected_updated_at then
    raise exception 'Bài viết vừa thay đổi. Vui lòng xem trước và xác nhận lại.';
  end if;
  if article.email_notification_preview_hash is distinct from p_expected_hash
    or article.email_notification_test_hash is distinct from p_expected_hash
    or article.email_notification_tested_at is null
    or article.email_notification_tested_at < now() - interval '24 hours' then
    raise exception 'Cần xem trước và gửi thử đúng nội dung trong 24 giờ trước khi gửi nhóm khách.';
  end if;
  -- SELECT only: Audience does not require UPDATE privileges or FOR SHARE locks.
  select count(*), array_agg(distinct lower(trim(email::text)) order by lower(trim(email::text)))
    into eligible_count, recipients from public.insight_email_audience
    where id = any(selected_ids) and status = 'subscribed'
      and lower(trim(email::text)) not in ('infor@facs.vn','tunguyen@facs.vn','yendoan@facs.vn','thanhhuynh@facs.vn')
      and trim(email::text) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
  if eligible_count <> cardinality(selected_ids) or recipients is distinct from expected then
    raise exception 'Nhóm khách hoặc địa chỉ email vừa thay đổi. Hãy tải lại và xem trước danh sách đã chọn.';
  end if;
  insert into public.insight_email_delivery_logs(post_id,delivery_type,status,sender_email,to_addresses,
    cc_addresses,bcc_count,bcc_addresses,send_request_id,delivery_scope,audience_contact_ids)
  values(p_post_id,'notification','processing','infor@facs.vn',array['tunguyen@facs.vn'],copies,
    cardinality(recipients),recipients,p_request_id,'selected',selected_ids) returning * into delivery;
  update public.posts set email_notification_enabled = false,
    email_notification_status = 'processing',email_notification_processing_at = now(),
    email_notification_requested_at = now(),email_notification_confirmed_at = now(),
    email_notification_confirmed_by = p_confirmed_by,email_notification_next_attempt_at = null,
    email_notification_attempts = email_notification_attempts + 1,email_notification_last_error = null
  where id = p_post_id returning * into article;
  return jsonb_build_object('duplicate',false,'post',to_jsonb(article),'log_id',delivery.id,
    'status',delivery.status,'request_id',p_request_id,'audience_id',null,
    'bcc',to_jsonb(recipients),'cc',to_jsonb(copies));
end;
$$;
revoke all on function public.claim_insight_email_selected_delivery(uuid,uuid,text,timestamptz,uuid,uuid[],text[]) from public, anon, authenticated;
grant execute on function public.claim_insight_email_selected_delivery(uuid,uuid,text,timestamptz,uuid,uuid[],text[]) to service_role;
