# Nhật ký triển khai FACS Insights CMS — 27/06/2026

## 1. Xác nhận source

- Đối chiếu file `facs-website-project-v19 (2).zip` với website `facs.vn` và repository production.
- Xác nhận source v19 là bản phù hợp để nâng cấp.

## 2. Xây dựng v20 Insights CMS

- Tích hợp Supabase Authentication, Database và Storage.
- Tạo khu vực quản trị, trình soạn thảo, quản lý bài viết và nội dung song ngữ.
- Thêm trang chi tiết bài viết, SEO, chuyên mục, tác giả, ảnh bìa và trạng thái draft/published.
- Thêm `supabase/setup.sql`, `.env.example` và `vercel.json`.

## 3. Cấu hình hạ tầng

- Tạo Supabase project ở vùng Southeast Asia (Singapore).
- Chạy thành công `supabase/setup.sql`.
- Tạo tài khoản quản trị qua Supabase Authentication.
- Cấu hình hai biến môi trường trong Vercel cho Production, Preview và Development:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Không ghi nhận mật khẩu, secret key hoặc service-role key trong tài liệu hay source.

## 4. Đưa source lên production

- Clone repository `Laurent310597/FACS-production-website` bằng GitHub Desktop.
- Thay source v19 bằng v20 và push lên nhánh `main`.
- Deployment đầu tiên lỗi tại `npm install` do URL registry nội bộ trong `package-lock.json`.
- Thay lockfile bằng bản sử dụng `registry.npmjs.org`.
- Deployment kế tiếp trên Vercel đạt trạng thái `Ready` và Production.

## 5. Kiểm tra chức năng

- Truy cập và đăng nhập được khu vực CMS.
- Upload ảnh lên Supabase Storage thành công.
- Tạo và xuất bản bài viết thành công.
- Trang chi tiết bài viết hiển thị nội dung và ảnh.

## 6. Bản vá v20.1

- Phát hiện ảnh dọc/infographic bị cắt do `object-cover` và giới hạn chiều cao.
- Chuyển ảnh trang chi tiết và ảnh preview Admin sang `object-contain`, giữ tỷ lệ gốc.
- Bản vá đã được hợp nhất vào gói final này.
- Thumbnail ngoài trang danh sách vẫn giữ crop để bố cục card đồng đều.

## 7. Kiểm thử gói final

- `npm ci`: Passed.
- `npm run lint`: Passed.
- `npm run build`: Passed.
- `npm audit`: 0 vulnerabilities.
- ZIP integrity test: Passed.

## Nguyên tắc cho lần cập nhật tiếp theo

- Dùng v20.1 final làm baseline.
- Giữ nguyên giao diện, route và luồng production hiện tại.
- Ưu tiên patch nhỏ, kiểm thử lint/build trước khi push.
- Không commit `.env`, mật khẩu, secret key hoặc service-role key.
