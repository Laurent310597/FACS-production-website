# Hướng dẫn cập nhật FACS Website v20.2

## Phần A — Cập nhật Supabase

1. Đăng nhập Supabase và mở project `facs-website`.
2. Chọn **SQL Editor**.
3. Chọn **New query**.
4. Mở file `supabase/migrations/v20.2-scheduled-publishing.sql` trong gói này.
5. Sao chép toàn bộ nội dung, dán vào SQL Editor và bấm **Run**.
6. Kết quả đúng là `Success. No rows returned`.

Migration không xóa hoặc thay đổi nội dung bài viết hiện có.

## Phần B — Cập nhật source bằng GitHub Desktop

1. Mở GitHub Desktop và chọn repository `FACS-production-website`.
2. Bấm **Show in Explorer**.
3. Giải nén file patch `facs-v20.2-scheduled-publishing-patch.zip`.
4. Sao chép các thư mục/file trong patch vào thư mục repository.
5. Khi Windows hỏi, chọn **Replace the files in the destination**.
6. Quay lại GitHub Desktop và kiểm tra danh sách file thay đổi.
7. Tại **Summary**, nhập: `Add scheduled publishing for Insights`.
8. Bấm **Commit to main**.
9. Bấm **Push origin**.

## Phần C — Kiểm tra Vercel

1. Mở Vercel project `facs-production-website`.
2. Vào **Deployments**.
3. Chờ deployment `Add scheduled publishing for Insights` chuyển thành **Ready**.
4. Không cần thêm biến môi trường mới.

## Phần D — Kiểm tra chức năng

1. Mở `https://facs.vn/admin/login`.
2. Tạo một bài thử.
3. Chọn ngày giờ sau thời điểm hiện tại khoảng 5–10 phút.
4. Bấm **Hẹn giờ đăng**.
5. Kiểm tra danh sách Admin hiển thị nhãn **Đã lên lịch**.
6. Trước giờ đăng, bài không được xuất hiện công khai.
7. Sau giờ đăng, mở hoặc làm mới `https://facs.vn/insights`; bài phải xuất hiện.

## Cách sử dụng sau khi cập nhật

- **Lưu nháp:** bài không hiển thị công khai.
- **Hẹn giờ đăng:** chọn ngày giờ Việt Nam, sau đó bấm nút Hẹn giờ đăng.
- **Đăng ngay:** bài xuất hiện ngay lập tức.
- Muốn hủy lịch: mở bài, bấm **Lưu nháp**.
- Muốn đổi lịch: chọn thời gian mới và bấm **Hẹn giờ đăng** lại.
- Muốn đăng sớm: mở bài và bấm **Đăng ngay**.
