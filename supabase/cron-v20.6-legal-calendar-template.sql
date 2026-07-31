-- FACS Website v20.6 - Legal Calendar source monitoring
-- Run only after:
--   1. v20.6-legal-calendar.sql has been applied;
--   2. legal-calendar-sync has been deployed;
--   3. FACS_CRON_SECRET exists in Supabase Edge Function Secrets;
--   4. the v20.3 cron vault secrets have already been created.
--
-- 03:00 and 09:00 UTC correspond to 10:00 and 16:00 in Vietnam.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

select cron.unschedule('facs-legal-calendar-sync')
where exists (select 1 from cron.job where jobname = 'facs-legal-calendar-sync');

select cron.schedule(
  'facs-legal-calendar-sync',
  '0 3,9 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'facs_project_url')
      || '/functions/v1/legal-calendar-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'facs_publishable_key'),
      'x-facs-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'facs_cron_secret')
    ),
    body := '{"action":"sync"}'::jsonb
  );
  $$
);
