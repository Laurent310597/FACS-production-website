# FACS Website v20.1 — Insights CMS Final Package

## Trạng thái dự án

- Website production: `https://facs.vn`
- GitHub repository: `Laurent310597/FACS-production-website`
- Vercel project: `facs-production-website`
- CMS quản trị: `https://facs.vn/admin/login`
- Trang bài viết: `https://facs.vn/insights`
- Nền tảng dữ liệu và đăng nhập: Supabase

## Nội dung đã tích hợp

- Đăng nhập và bảo vệ khu vực quản trị.
- Tạo, sửa, nhân bản, xóa, lưu nháp và xuất bản bài viết.
- Nội dung song ngữ Việt–Anh.
- Trình soạn thảo nội dung có định dạng.
- Chuyên mục, tác giả, slug, SEO và bài nổi bật.
- Upload ảnh bìa vào Supabase Storage.
- Trang danh sách Insights và trang chi tiết bài viết.
- Row Level Security cho database và storage.
- Vercel SPA rewrite cho route động.
- Fallback giữ ba bài mẫu khi chưa cấu hình Supabase.

## Thay đổi v20.1

- Ảnh bìa và infographic trong trang chi tiết hiển thị đầy đủ theo tỷ lệ gốc.
- Ảnh xem trước trong Admin không còn bị crop.
- Thumbnail trên danh sách Insights vẫn giữ tỷ lệ đồng đều để bảo toàn bố cục.
- `package-lock.json` đã dùng URL `registry.npmjs.org`, tương thích Vercel.

## Lưu ý bảo mật

Không lưu trong repository hoặc gửi qua chat các thông tin sau:

- Mật khẩu database Supabase.
- Mật khẩu tài khoản quản trị.
- Supabase Secret key.
- Supabase Service Role key.

Ứng dụng trình duyệt chỉ sử dụng:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Hai biến này đã được cấu hình trong Vercel theo quá trình triển khai ngày 27/06/2026.

## Cách cập nhật về sau

1. Sửa source trong repository local `FACS-production-website`.
2. Chạy `npm install`, `npm run lint` và `npm run build`.
3. Commit và push nhánh `main` bằng GitHub Desktop.
4. Vercel tự động tạo deployment Production mới.
5. Chỉ đưa vào production khi trạng thái deployment là `Ready`.

## File quan trọng

- `supabase/setup.sql`: cấu trúc database, RLS và storage policies.
- `.env.example`: tên biến môi trường cần dùng.
- `HUONG-DAN-KICH-HOAT-INSIGHTS-CMS.md`: hướng dẫn kích hoạt.
- `CHANGELOG-v20-INSIGHTS-CMS.md`: nội dung nâng cấp CMS.
- `vercel.json`: cấu hình route cho React SPA.

## Phiên bản cơ sở cho các lần sửa tiếp theo

Sử dụng gói **FACS Website v20.1 — Insights CMS Final Package** này làm bản gốc. Ưu tiên sửa theo dạng patch nhỏ, giữ nguyên giao diện, route và luồng production hiện tại.
