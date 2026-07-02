# Hướng dẫn cập nhật FACS Website v20.4

## Khuyến nghị quan trọng

Vì production có thể đã bị ghi đè bằng source cũ, hãy dùng **gói Full Source v20.4**, không dùng patch nhỏ, để khôi phục chắc chắn 9 dịch vụ và Careers CMS.

## 1. Cập nhật Supabase

1. Mở Supabase → organization `FACS` → project `facs-website`.
2. Chọn **SQL Editor → New query**.
3. Mở file `v20.4-insights-bilingual-author-slugs.sql`.
4. Sao chép toàn bộ nội dung, dán vào SQL Editor và bấm **Run**.
5. Kết quả đúng: `Success. No rows returned`.

File SQL này an toàn khi chạy lại. Không xóa bài viết, tài khoản, ảnh hoặc dữ liệu Careers.

## 2. Cập nhật source

1. Mở GitHub Desktop và chọn `FACS-production-website`.
2. Bấm **Fetch origin**; nếu có **Pull origin**, bấm tiếp.
3. Bấm **Repository → Show in Explorer**.
4. Tạo một bản sao thư mục hiện tại để backup.
5. Giải nén gói `facs-website-v20.4-webbase-insights-full.zip`.
6. Sao chép toàn bộ nội dung trong thư mục đã giải nén vào repository hiện tại.
7. Chọn **Replace the files in the destination**.
8. Không xóa thư mục ẩn `.git` của repository.
9. Trong GitHub Desktop, kiểm tra không có `.env.local` hoặc secret nào trong danh sách thay đổi.
10. Commit với nội dung: `Merge latest Webbase and refine Insights CMS`.
11. Bấm **Push origin**.

## 3. Kiểm tra Vercel

1. Mở Vercel → project `facs-production-website` → **Deployments**.
2. Chờ deployment mới chuyển thành **Ready**.
3. Nếu Error, mở Build Logs và kiểm tra dòng đỏ cuối cùng.

## 4. Kiểm tra sau cập nhật

### Dịch vụ

- Trang Services phải hiển thị đủ 9 dịch vụ.
- Các trang chi tiết dịch vụ vẫn mở bình thường ở VI và EN.

### Careers

- Trang Careers và trang chi tiết tuyển dụng phải hoạt động.
- Admin vẫn có danh sách việc làm và trình tạo/chỉnh sửa việc làm.

### Insights

1. Vào `/admin/posts/new`.
2. Tab VI: nhập tên tác giả Việt và slug Việt.
3. Tab EN: nhập author tiếng Anh và slug Anh.
4. Lưu nháp hoặc đăng bài.
5. Mở bài ngoài website và chuyển VI/EN.
6. Tên tác giả và URL phải đổi theo ngôn ngữ.
7. Link cũ vẫn phải mở được bài.

## 5. Cách sử dụng bố cục Admin mới

- Cột trái: nội dung, ảnh bìa và SEO.
- Cột phải: chuyên mục, tác giả, slug, trạng thái, bài nổi bật, hẹn giờ và nút xuất bản.
- Tab VI/EN điều khiển đồng thời nội dung, tác giả, slug, mô tả ảnh và SEO.
- Nút **Xem trước** mở modal riêng, không làm hẹp vùng soạn thảo.
