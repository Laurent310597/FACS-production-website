# FACS Website v20 — Insights CMS

## Nội dung nâng cấp

- Chuyển trang Insights từ dữ liệu cố định sang dữ liệu Supabase.
- Thêm trang chi tiết bài viết `/insights/:slug`.
- Thêm cổng quản trị `/admin/login`.
- Thêm danh sách quản lý bài viết `/admin/posts`.
- Thêm trình tạo/chỉnh sửa bài viết.
- Hỗ trợ tiếng Việt và tiếng Anh.
- Hỗ trợ ảnh bìa qua Supabase Storage hoặc URL bên ngoài.
- Hỗ trợ draft/published, category, author, featured và SEO metadata.
- Thêm tìm kiếm, bộ lọc và trạng thái bài viết.
- Thêm RLS database và chính sách Storage.
- Thêm Vercel SPA rewrite để các đường dẫn động hoạt động khi refresh.
- Thêm fallback an toàn để website không bị lỗi khi chưa cấu hình Supabase.

## Kiểm thử

- `npm run lint`: Passed.
- `npm run build`: Passed.
- `npm audit`: 0 vulnerabilities.
