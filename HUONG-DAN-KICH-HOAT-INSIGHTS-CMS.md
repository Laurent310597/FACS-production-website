# HƯỚNG DẪN KÍCH HOẠT FACS INSIGHTS CMS

Phần code quản trị đã được tích hợp hoàn chỉnh. Để đưa hệ thống vào hoạt động thật, cần hoàn tất **một lần duy nhất** các bước dưới đây.

## 1. Tạo Supabase project

1. Đăng nhập Supabase.
2. Chọn **New project**.
3. Đặt tên, ví dụ: `facs-website`.
4. Lưu lại mật khẩu database ở nơi an toàn.

## 2. Tạo database và kho ảnh

1. Trong Supabase, mở **SQL Editor**.
2. Chọn **New query**.
3. Mở file `supabase/setup.sql` trong source website.
4. Copy toàn bộ nội dung file, dán vào SQL Editor và bấm **Run**.

File SQL sẽ tự tạo:

- Bảng `posts` để lưu bài viết;
- Phân quyền chỉ cho người đã đăng nhập quản trị;
- Quyền đọc công khai đối với bài đã xuất bản;
- Kho ảnh `insight-images`;
- Giới hạn ảnh tối đa 5 MB.

## 3. Tạo tài khoản quản trị

1. Trong Supabase, mở **Authentication → Users**.
2. Chọn **Add user**.
3. Nhập email quản trị và mật khẩu.
4. Bật xác nhận email tự động nếu màn hình có lựa chọn này.
5. Trong phần cài đặt Authentication, tắt đăng ký công khai để người ngoài không tự tạo tài khoản.

## 4. Lấy thông tin kết nối

Trong Supabase, mở phần **Project Settings / API Keys** và lấy:

- Project URL;
- Publishable Key, thường bắt đầu bằng `sb_publishable_`.

Không sử dụng Secret Key hoặc Service Role Key trên website.

## 5. Thêm biến môi trường trên Vercel

Trong Vercel:

1. Mở project đang chạy `facs.vn`.
2. Chọn **Settings → Environment Variables**.
3. Thêm hai biến:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

4. Áp dụng cho Production, Preview và Development.
5. Redeploy website.

## 6. Đăng nhập và đăng bài

Sau khi deploy xong, mở:

```text
https://facs.vn/admin/login
```

Quy trình sử dụng:

1. Đăng nhập;
2. Chọn **Viết bài mới**;
3. Nhập nội dung tiếng Việt, tiếng Anh hoặc cả hai;
4. Chọn chuyên mục;
5. Upload ảnh bìa;
6. Chọn **Lưu nháp** hoặc **Xuất bản**.

Bài đã xuất bản sẽ tự động xuất hiện tại:

```text
https://facs.vn/insights
```

## Các chức năng đã tích hợp

- Đăng nhập và đăng xuất quản trị;
- Bảo vệ toàn bộ đường dẫn `/admin`;
- Tạo, chỉnh sửa, nhân bản và xóa bài viết;
- Lưu nháp và xuất bản;
- Trình soạn thảo có in đậm, in nghiêng, tiêu đề phụ, danh sách, trích dẫn và liên kết;
- Nội dung song ngữ Việt–Anh với cơ chế dự phòng;
- Upload ảnh trực tiếp từ máy;
- Chuyên mục, tác giả, slug và SEO;
- Tìm kiếm và lọc bài viết;
- Trang chi tiết bài viết;
- Tính thời gian đọc và sao chép liên kết;
- Giao diện responsive cho máy tính và điện thoại;
- Làm sạch HTML trước khi hiển thị;
- Row Level Security cho database;
- Giữ ba bài mẫu nếu Supabase chưa được kết nối.

## Lưu ý bảo mật

- Tuyệt đối không đưa Supabase Secret Key hoặc Service Role Key vào file `.env` của website.
- Chỉ dùng Publishable Key hoặc legacy Anon Key.
- Không upload file `.env.local` lên GitHub.
- Nên dùng mật khẩu quản trị dài, riêng biệt và khó đoán.
