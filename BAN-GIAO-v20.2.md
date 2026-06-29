# Bàn giao FACS Website v20.2 — Scheduled Publishing

## Baseline

- Nâng cấp trực tiếp từ FACS Website v20.1 Insights CMS Full Image Fix.
- Không thay đổi page flow, branding hoặc nội dung cốt lõi của website.

## Phạm vi hoàn thành

- Hẹn giờ đăng bài theo múi giờ Việt Nam (UTC+7).
- Đăng ngay và lưu nháp vẫn hoạt động độc lập.
- Nhãn trạng thái Draft / Scheduled / Published trong Admin.
- Bộ lọc bài đã lên lịch.
- Tự động cho phép truy cập công khai khi đến giờ thông qua Supabase RLS.
- Tự làm mới trang Insights và trang chi tiết mỗi 60 giây, đồng thời làm mới khi người dùng quay lại tab.

## Cập nhật database

Chạy một lần file:

`supabase/migrations/v20.2-scheduled-publishing.sql`

## Cập nhật source

Dùng gói patch hoặc source đầy đủ được bàn giao cùng tài liệu này.

## Bảo mật

- Không có Secret Key, Service Role Key, mật khẩu hoặc dữ liệu live trong gói bàn giao.
- Không cần thêm biến môi trường mới trên Vercel.
