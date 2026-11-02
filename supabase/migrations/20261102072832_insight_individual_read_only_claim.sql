-- The server only needs SELECT on Audience. FOR SHARE requires UPDATE privileges
-- and is unnecessary: the article claim already serializes concurrent sends.
create or replace function public.claim_insight_email_delivery(
  p_post_id uuid, p_confirmed_by uuid, p_expected_hash text,
  p_expected_updated_at timestamptz, p_request_id uuid, p_audience_id uuid default null
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  article public.posts%rowtype;
  delivery public.insight_email_delivery_logs%rowtype;
  recipients text[];
  copies text[] := array['yendoan@facs.vn','thanhhuynh@facs.vn'];
begin
  if p_request_id is null or p_confirmed_by is null or nullif(p_expected_hash, '') is null then
    raise exception 'Thiếu thông tin xác nhận lượt gửi.';
  end if;
  select * into article from public.posts where id = p_post_id for update;
  if not found then raise exception 'Không tìm thấy bài viết.'; end if;

  select * into delivery from public.insight_email_delivery_logs where send_request_id = p_request_id;
  if found then
    if delivery.post_id is distinct from p_post_id or delivery.audience_contact_id is distinct from p_audience_id then
      raise exception 'Mã lượt gửi không khớp bài viết hoặc người nhận.';
    end if;
    return jsonb_build_object('duplicate',true,'post',to_jsonb(article),'log_id',delivery.id,
      'status',delivery.status,'request_id',p_request_id,'audience_id',p_audience_id,
      'bcc',to_jsonb(delivery.bcc_addresses),'cc',to_jsonb(delivery.cc_addresses));
  end if;
  if article.email_notification_status = 'processing' then
    raise exception 'Bài viết đang có một lượt gửi. Vui lòng chờ hoàn tất.';
  end if;
  if article.status <> 'published' or article.published_at is null or article.published_at > now() then
    raise exception 'Chỉ được gửi email khi bài viết đã xuất bản công khai.';
  end if;
  if article.email_delivery_mode = 'disabled' then
    raise exception 'Bài viết đang ở chế độ Không gửi email.';
  end if;
  if article.updated_at is distinct from p_expected_updated_at then
    raise exception 'Bài viết vừa thay đổi. Vui lòng xem trước và xác nhận lại.';
  end if;

  if p_audience_id is null then
    if article.email_notification_preview_hash is distinct from p_expected_hash
      or article.email_notification_test_hash is distinct from p_expected_hash
      or article.email_notification_tested_at is null
      or article.email_notification_tested_at < now() - interval '24 hours' then
      raise exception 'Cần xem trước và gửi thử đúng nội dung trong 24 giờ trước khi gửi Audience.';
    end if;
    select array_agg(email order by email) into recipients from (
      select distinct lower(trim(email::text)) as email from public.insight_email_audience
      where status = 'subscribed'
        and lower(trim(email::text)) not in ('infor@facs.vn','tunguyen@facs.vn','yendoan@facs.vn','thanhhuynh@facs.vn')
        and trim(email::text) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) as eligible;
  else
    copies := array[]::text[];
    select array[lower(trim(email::text))] into recipients from public.insight_email_audience
    where id = p_audience_id and status = 'subscribed'
      and lower(trim(email::text)) not in ('infor@facs.vn','tunguyen@facs.vn','yendoan@facs.vn','thanhhuynh@facs.vn')
      and trim(email::text) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
    if not found then raise exception 'Khách hàng không còn trong danh sách đang nhận hoặc địa chỉ không hợp lệ.'; end if;
  end if;
  if coalesce(cardinality(recipients),0) = 0 then raise exception 'Chưa có khách hàng đang nhận bản tin.'; end if;
  if cardinality(recipients) + cardinality(copies) + 1 > 500 then raise exception 'Tổng số người nhận vượt giới hạn 500.'; end if;

  insert into public.insight_email_delivery_logs(post_id,delivery_type,status,sender_email,
    to_addresses,cc_addresses,bcc_count,bcc_addresses,send_request_id,audience_contact_id,delivery_scope)
  values(p_post_id,'notification','processing','infor@facs.vn',array['tunguyen@facs.vn'],copies,
    cardinality(recipients),recipients,p_request_id,p_audience_id,case when p_audience_id is null then 'audience' else 'single' end) returning * into delivery;

  update public.posts set email_notification_enabled = false,
    email_notification_status = 'processing',email_notification_processing_at = now(),
    email_notification_requested_at = now(),email_notification_confirmed_at = now(),
    email_notification_confirmed_by = p_confirmed_by,email_notification_next_attempt_at = null,
    email_notification_attempts = email_notification_attempts + 1,email_notification_last_error = null
  where id = p_post_id returning * into article;
  return jsonb_build_object('duplicate',false,'post',to_jsonb(article),'log_id',delivery.id,
    'status',delivery.status,'request_id',p_request_id,'audience_id',p_audience_id,
    'bcc',to_jsonb(recipients),'cc',to_jsonb(copies));
end;
$$;
