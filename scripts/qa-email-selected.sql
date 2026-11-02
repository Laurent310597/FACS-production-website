-- Preview only. Fixture writes are rolled back; no email is sent.
begin;
do $$
declare
  article_id uuid;
  contact_id uuid;
  suffix text := gen_random_uuid()::text;
begin
  insert into public.posts(title_vi,content_vi,slug,status,published_at,email_delivery_mode)
  values('Selected Bcc QA','Fixture only','selected-email-qa-'||suffix,'published',now()-interval '1 hour','review_after_publish') returning id into article_id;
  perform set_config('facs.qa_post',article_id::text,true);
  insert into public.insight_email_audience(email,status) values('chosen-a-'||suffix||'@example.com','subscribed') returning id into contact_id;
  perform set_config('facs.qa_first',contact_id::text,true);
  insert into public.insight_email_audience(email,status) values('chosen-b-'||suffix||'@example.com','subscribed') returning id into contact_id;
  perform set_config('facs.qa_second',contact_id::text,true);
  insert into public.insight_email_audience(email,status) values('optout-'||suffix||'@example.com','unsubscribed') returning id into contact_id;
  perform set_config('facs.qa_optout',contact_id::text,true);
end;
$$;
set local role service_role;
do $$
declare
  article_id uuid := current_setting('facs.qa_post')::uuid;
  ids uuid[] := array[current_setting('facs.qa_first')::uuid,current_setting('facs.qa_second')::uuid];
  optout_id uuid := current_setting('facs.qa_optout')::uuid;
  recipients text[];
  request_id uuid := gen_random_uuid();
  actor uuid := gen_random_uuid();
  article public.posts%rowtype;
  claim jsonb;
  duplicate jsonb;
  rejected boolean;
begin
  assert not has_function_privilege('anon','public.claim_insight_email_selected_delivery(uuid,uuid,text,timestamptz,uuid,uuid[],text[])','execute');
  assert not has_function_privilege('authenticated','public.claim_insight_email_selected_delivery(uuid,uuid,text,timestamptz,uuid,uuid[],text[])','execute');
  select array_agg(lower(trim(email::text)) order by lower(trim(email::text))) into recipients from public.insight_email_audience where id=any(ids);
  update public.posts set email_notification_preview_hash='reviewed',email_notification_test_hash='reviewed',email_notification_tested_at=now() where id=article_id returning * into article;
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),array[]::uuid[],recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Empty selection must never fall back to all Audience';
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids,array['other@example.com']);
  exception when others then rejected := true; end;
  assert rejected, 'Changed recipient address must invalidate confirmation';
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids||optout_id,recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Any opted-out contact must reject the entire selection';
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids||gen_random_uuid(),recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Any deleted/missing contact must reject the entire selection';
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'stale',article.updated_at,gen_random_uuid(),ids,recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Stale content review must not send';
  claim := public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,request_id,ids||ids[1],recipients);
  assert claim->'bcc'=to_jsonb(recipients) and jsonb_array_length(claim->'bcc')=2, 'Only the chosen addresses may appear in Bcc';
  assert claim->'cc'=jsonb_build_array('yendoan@facs.vn','thanhhuynh@facs.vn');
  assert exists(select 1 from public.insight_email_delivery_logs where id=(claim->>'log_id')::uuid and delivery_scope='selected' and cardinality(audience_contact_ids)=2 and bcc_count=2);
  duplicate := public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,request_id,ids,recipients);
  assert (duplicate->'duplicate')::boolean and duplicate->>'log_id'=claim->>'log_id';
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,request_id,array[ids[1]],recipients);
  exception when others then rejected := true; end;
  assert rejected, 'A reused request identifier cannot change its recipients';
  select * into article from public.posts where id=article_id;
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids,recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Concurrent sends must be serialized';
  perform public.finalize_insight_email_delivery(article_id,(claim->>'log_id')::uuid,'qa-no-mail',null);
  select * into article from public.posts where id=article_id;
  duplicate := public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,request_id,ids,recipients);
  assert (duplicate->'duplicate')::boolean and duplicate->>'status'='sent';
  claim := public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids,recipients);
  perform public.fail_insight_email_delivery(article_id,(claim->>'log_id')::uuid,'qa failure');
  select * into article from public.posts where id=article_id;
  assert article.email_notification_status='failed' and not article.email_notification_enabled and article.email_notification_next_attempt_at is null, 'A selected-group failure must never auto-send all Audience';
  update public.posts set email_notification_tested_at=now()-interval '25 hours' where id=article_id returning * into article;
  rejected := false;
  begin perform public.claim_insight_email_selected_delivery(article_id,actor,'reviewed',article.updated_at,gen_random_uuid(),ids,recipients);
  exception when others then rejected := true; end;
  assert rejected, 'Expired internal tests must block a new selected-group send';
end;
$$;
rollback;
