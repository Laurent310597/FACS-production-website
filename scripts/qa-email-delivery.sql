-- Run only against the Preview database. All fixture writes are rolled back.
-- No Edge Function or mail provider is invoked by this test.
begin;
do $$
declare
  post_id uuid;
  audience_id uuid;
  suffix text := gen_random_uuid()::text;
begin
  insert into public.posts(title_vi,content_vi,slug,slug_vi,slug_en,status,published_at,email_delivery_mode)
  values('Email delivery QA','Fixture only','email-qa-'||suffix,'email-qa-vi-'||suffix,'email-qa-en-'||suffix,'published',now()-interval '1 hour','review_after_publish') returning id into post_id;
  perform set_config('facs.qa_post',post_id::text,true);
  insert into public.insight_email_audience(email,status) values('first-'||suffix||'@example.com','subscribed') returning id into audience_id;
  perform set_config('facs.qa_first',audience_id::text,true);
  insert into public.insight_email_audience(email,status) values('second-'||suffix||'@example.com','subscribed') returning id into audience_id;
  perform set_config('facs.qa_second',audience_id::text,true);
  insert into public.insight_email_audience(email,status) values('optout-'||suffix||'@example.com','unsubscribed') returning id into audience_id;
  perform set_config('facs.qa_optout',audience_id::text,true);
end;
$$;
-- Mirror production: the mail server may read Audience but cannot update it.
revoke update on public.insight_email_audience from service_role;
set local role service_role;
do $$
declare
  post_id uuid := current_setting('facs.qa_post')::uuid;
  customer_id uuid := current_setting('facs.qa_second')::uuid;
  optout_id uuid := current_setting('facs.qa_optout')::uuid;
  actor uuid := gen_random_uuid();
  first_request uuid := gen_random_uuid();
  single_request uuid := gen_random_uuid();
  article public.posts%rowtype;
  claim jsonb;
  duplicate jsonb;
  rejected boolean;
  expected_email text;
begin
  assert not has_any_column_privilege('service_role','public.insight_email_audience','UPDATE');
  assert has_table_privilege('service_role','public.insight_email_audience','SELECT');
  assert not has_function_privilege('anon','public.claim_insight_email_delivery(uuid,uuid,text,timestamptz,uuid,uuid)','execute');
  assert not has_function_privilege('authenticated','public.claim_insight_email_delivery(uuid,uuid,text,timestamptz,uuid,uuid)','execute');
  update public.posts set email_notification_preview_hash='reviewed',email_notification_test_hash='reviewed',email_notification_tested_at=now() where id=post_id returning * into article;
  claim := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,first_request,null);
  assert jsonb_array_length(claim->'bcc') >= 2;
  assert jsonb_array_length(claim->'cc') = 2;
  assert not (claim->'duplicate')::boolean;
  duplicate := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,first_request,null);
  assert (duplicate->'duplicate')::boolean;
  assert duplicate->>'log_id' = claim->>'log_id';
  select * into article from public.posts where id=post_id;
  rejected := false;
  begin
    perform public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,gen_random_uuid(),null);
  exception when others then rejected := true; end;
  assert rejected, 'Concurrent send must not obtain another claim';
  rejected := false;
  begin update public.posts set excerpt_vi='Change during send' where id=post_id;
  exception when others then rejected := true; end;
  assert rejected, 'Article must not change while its email is in flight';
  perform public.finalize_insight_email_delivery(post_id,(claim->>'log_id')::uuid,'qa-no-outbound',null);
  select * into article from public.posts where id=post_id;
  assert article.email_notification_status='sent';
  assert not article.email_notification_enabled;
  claim := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,gen_random_uuid(),null);
  assert not (claim->'duplicate')::boolean, 'A deliberate repeat after success must be allowed';
  perform public.finalize_insight_email_delivery(post_id,(claim->>'log_id')::uuid,'qa-no-outbound',null);

  -- An individual resend previews its own content; it does not require a bulk campaign test.
  update public.posts set email_notification_tested_at=now()-interval '25 hours' where id=post_id returning * into article;
  rejected := false;
  begin perform public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,gen_random_uuid(),null);
  exception when others then rejected := true; end;
  assert rejected, 'An expired test must still block bulk sending';
  claim := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,single_request,customer_id);
  select lower(email::text) into expected_email from public.insight_email_audience where id=customer_id;
  assert claim->'bcc' = jsonb_build_array(expected_email), 'Only the selected customer may appear in Bcc';
  assert claim->'cc' = '[]'::jsonb;
  perform public.finalize_insight_email_delivery(post_id,(claim->>'log_id')::uuid,'qa-no-outbound',null);
  select * into article from public.posts where id=post_id;
  duplicate := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,single_request,customer_id);
  assert (duplicate->'duplicate')::boolean and duplicate->>'status'='sent';
  rejected := false;
  begin perform public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,gen_random_uuid(),optout_id);
  exception when others then rejected := true; end;
  assert rejected, 'Unsubscribed contacts must not receive individual emails';
  claim := public.claim_insight_email_delivery(post_id,actor,'reviewed',article.updated_at,gen_random_uuid(),customer_id);
  perform public.fail_insight_email_delivery(post_id,(claim->>'log_id')::uuid,'qa failure');
  select * into article from public.posts where id=post_id;
  assert article.email_notification_status='failed' and not article.email_notification_enabled;
  assert article.email_notification_next_attempt_at is null, 'A failed individual send must never enter bulk cron retries';
  update public.posts set excerpt_vi='Updated after delivery' where id=post_id returning * into article;
  assert article.email_notification_status='awaiting_review';
  assert article.email_notification_test_hash is null and article.email_notification_preview_hash is null;
  assert article.email_notification_sent_at is not null, 'Historical successful send timestamp must be retained';
end;
$$;
rollback;
