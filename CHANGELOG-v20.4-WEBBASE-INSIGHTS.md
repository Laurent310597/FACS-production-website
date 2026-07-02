# FACS Website v20.4 — Webbase Merge & Insights Refinement

## Baseline

Bản này được phát triển trực tiếp từ file `FACS-production-website.zip` mới nhất do người dùng cung cấp ngày 01/07/2026.
Baseline đã được xác minh có:

- 9 nhóm dịch vụ;
- nội dung chi tiết dịch vụ song ngữ;
- Careers CMS và quy trình đăng tuyển;
- Insights CMS và chức năng hẹn giờ đăng bài.

## Thay đổi Insights

- Tách tên tác giả thành `author_name_vi` và `author_name_en`.
- Tách đường dẫn bài viết thành `slug_vi` và `slug_en`.
- Chuyển ngôn ngữ trên trang bài viết sẽ chuyển sang URL tương ứng.
- Giữ trường `slug` cũ làm legacy alias để link cũ tiếp tục hoạt động.
- Danh sách Insights sử dụng slug theo ngôn ngữ đang chọn.
- Trang quản trị và chức năng nhân bản bài hỗ trợ đầy đủ dữ liệu song ngữ.
- Chặn trùng slug giữa mọi cột slug Việt, Anh và legacy.

## Cải tiến giao diện Admin đăng bài

- Bố cục hai cột rõ ràng: nội dung chính bên trái, thiết lập/xuất bản bên phải.
- Tác giả và slug đi theo tab ngôn ngữ đang chọn.
- Gom trạng thái, bài nổi bật, hẹn giờ và các nút xuất bản vào một khối sticky.
- Ảnh bìa và SEO chỉ hiển thị trường của ngôn ngữ đang chỉnh để giảm độ dài trang.
- Bản xem trước chuyển sang modal toàn màn hình, không làm co hẹp vùng soạn thảo.

## Nội dung được bảo toàn

Các file thuộc Dịch vụ và Careers không bị thay đổi so với baseline đính kèm.
