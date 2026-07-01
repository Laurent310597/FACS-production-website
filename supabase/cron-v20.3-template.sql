-- FACS Website v20.3 - Cron template
-- Run only AFTER deploying the `insight-email` Edge Function and creating FACS_CRON_SECRET.
-- Replace the three placeholders before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'facs_project_url');
select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'facs_publishable_key');
select vault.create_secret('YOUR_FACS_CRON_SECRET', 'facs_cron_secret');

select cron.unschedule('facs-process-insight-emails')
where exists (select 1 from cron.job where jobname = 'facs-process-insight-emails');

select cron.schedule(
  'facs-process-insight-emails',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'facs_project_url')
      || '/functions/v1/insight-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'facs_publishable_key'),
      'x-facs-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'facs_cron_secret')
    ),
    body := '{"action":"process"}'::jsonb
  );
  $$
);
