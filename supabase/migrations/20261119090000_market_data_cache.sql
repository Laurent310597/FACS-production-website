-- Bộ nhớ đệm dữ liệu thị trường cho tiện ích "Dữ liệu thị trường tài chính".
-- Hàm market-data ghi lại lần lấy thành công gần nhất của từng nguồn; khi một nguồn tạm lỗi
-- thì trả về giá trị đã lưu (kèm thời điểm) thay vì để trống. Chỉ service role được đọc/ghi.
create table if not exists public.market_data_cache (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.market_data_cache enable row level security;
revoke all on public.market_data_cache from anon, authenticated;
