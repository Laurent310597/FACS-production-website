-- Run once on the intended environment AFTER its migration and Edge deployment.
-- Set facs.insight_scheduler_url to that environment's /functions/v1/insight-email URL
-- in the same transaction before running this script. No credentials leave Postgres.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$
declare scheduler_url text := current_setting('facs.insight_scheduler_url', true);
  token text := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
  secret_id uuid;
begin
  if scheduler_url is null or scheduler_url !~ '^https://[a-z]+\.supabase\.co/functions/v1/insight-email$' then
    raise exception 'Set facs.insight_scheduler_url to the intended project before configuring cron.';
  end if;
  select id into secret_id from vault.secrets where name='facs_insight_scheduler_token';
  if secret_id is null then
    perform vault.create_secret(token,'facs_insight_scheduler_token');
  else
    perform vault.update_secret(secret_id,token);
  end if;
  insert into public.insight_email_scheduler_config(singleton,secret_hash)
    values(true,encode(sha256(convert_to(token,'UTF8')),'hex'))
    on conflict(singleton) do update set secret_hash=excluded.secret_hash;
  select id into secret_id from vault.secrets where name='facs_insight_scheduler_url';
  if secret_id is null then
    perform vault.create_secret(scheduler_url,'facs_insight_scheduler_url');
  else
    perform vault.update_secret(secret_id,scheduler_url);
  end if;
end; $$;
select cron.schedule('facs-insight-confirmed-schedules','* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='facs_insight_scheduler_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-facs-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='facs_insight_scheduler_token')),
    body := '{"action":"process_scheduled"}'::jsonb,
    timeout_milliseconds := 10000
  );
$job$);
