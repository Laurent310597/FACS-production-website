-- The insight-email Edge Function uses a server-only service_role client.
-- Production had no SELECT/INSERT/UPDATE privileges for this role on these
-- tables, so a real article returned HTTP 403 and was reported as not found.
-- RLS bypass does not replace table-level privileges.
-- Grant only the operations required by the existing governed email workflow.
-- Browser roles, RLS policies, article data and send approvals are unchanged.

grant select, update on table public.posts to service_role;
grant select on table public.insight_email_audience to service_role;
grant select, insert, update on table public.insight_email_delivery_logs to service_role;
