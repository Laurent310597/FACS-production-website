-- FACS Hub phần 3: bộ hẹn giờ đăng mạng xã hội (mỗi phút), cùng cách với lịch email Insights.
-- Khóa riêng của bộ hẹn giờ nằm trong Supabase Vault, không cần đặt Edge Function Secret.

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'facs_hub_social_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'facs_hub_social_token', 'FACS Hub: khóa riêng cho bộ hẹn giờ đăng mạng xã hội');
  end if;
  -- Đổi địa chỉ này cho đúng dự án Supabase nếu triển khai sang dự án khác.
  if not exists (select 1 from vault.decrypted_secrets where name = 'facs_hub_social_url') then
    perform vault.create_secret('https://bnfzbhgkkxzjrvdtrhyt.supabase.co/functions/v1/hub-social-publisher', 'facs_hub_social_url', 'FACS Hub: địa chỉ hàm đăng bài theo lịch');
  end if;
end $$;

create or replace function public.hub_social_verify_cron(p_token text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select coalesce(p_token <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'facs_hub_social_token' and decrypted_secret = p_token
  ), false);
$$;
revoke all on function public.hub_social_verify_cron(text) from public, anon, authenticated;
grant execute on function public.hub_social_verify_cron(text) to service_role;

create or replace function public.hub_social_cron_ready()
returns boolean
language sql
security definer
set search_path = public, cron, vault
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'facs_hub_social_token')
     and exists (select 1 from cron.job where jobname = 'facs-hub-social-publisher' and active);
$$;
revoke all on function public.hub_social_cron_ready() from public, anon;
grant execute on function public.hub_social_cron_ready() to authenticated, service_role;

select cron.schedule(
  'facs-hub-social-publisher',
  '* * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'facs_hub_social_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-facs-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'facs_hub_social_token')),
    body := '{"action":"publish_due"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
