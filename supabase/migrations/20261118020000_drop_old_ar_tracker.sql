-- Gỡ AR Tracker cũ (v20.19: import hóa đơn Viettel, customer master). Chưa từng có dữ liệu (0 dòng ở cả 4 bảng khi gỡ).
-- Đã thay bằng ar_reminders / ar_reminder_settings (20261118010000_facs_ar_reminders.sql).
drop function if exists public.import_ar_customer_master(jsonb, text, text);
drop function if exists public.import_ar_viettel_invoices(jsonb, text, text);
drop function if exists public.set_ar_invoice_paid(uuid, boolean, date, text);
drop table if exists public.ar_audit_events;
drop table if exists public.ar_invoices;
drop table if exists public.ar_import_runs;
drop table if exists public.ar_customers;
drop function if exists public.capture_ar_audit_event();
drop function if exists public.touch_ar_record();
notify pgrst, 'reload schema';
