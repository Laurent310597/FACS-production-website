# FACS Website v20.5 — Hướng dẫn kích hoạt biểu mẫu và email

## Kết quả của bản cập nhật

- Hồ sơ ứng tuyển và CV được lưu trong khu vực Admin.
- Yêu cầu liên hệ được lưu trong khu vực Admin.
- Email nội bộ được gửi đồng thời đến `tunguyen@facs.vn`, `thanhuynh@facs.vn` và `yendoan@facs.vn` bằng trường **To**.
- Email ứng tuyển được gửi từ `hr@facs.vn` và đính kèm CV.
- Email liên hệ được gửi từ `contact@facs.vn`.
- Người gửi nhận email xác nhận song ngữ: tiếng Việt, dòng `-------------------`, rồi tiếng Anh.
- CV chỉ nhận PDF, DOC hoặc DOCX, tối đa 5 MB.
- Nếu Lark tạm thời lỗi, dữ liệu vẫn được lưu và Admin có thể gửi lại email.

## Thứ tự kích hoạt ngắn nhất

### 1. Kiểm tra hai địa chỉ gửi trong Lark

Trong Lark Mail Admin, xác nhận cả hai địa chỉ sau là địa chỉ gửi thay mặt/alias của tài khoản `tunguyen@facs.vn`:

- `hr@facs.vn`
- `contact@facs.vn`

Nếu chúng mới chỉ là mail group nhận thư, hãy thêm chúng làm alias/send-as của `tunguyen@facs.vn`. Bước kiểm tra gửi thử ở cuối sẽ xác nhận cấu hình này.

### 2. Cấu hình ứng dụng Lark

Trong ứng dụng Custom App đang dùng cho website:

1. Bật quyền `mail:user_mailbox.message:send`.
2. Thêm Redirect URL:

   `https://bnfzbhgkkxzjrvdtrhyt.supabase.co/functions/v1/form-lark-oauth-callback`

3. Lưu lại `App ID` và `App Secret`. Không gửi hai giá trị này qua email hoặc đưa vào GitHub.

### 3. Tạo bảng dữ liệu trên Supabase

1. Mở Supabase → **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/v20.5-form-submissions-email.sql`.
3. Sao chép toàn bộ nội dung, dán vào SQL Editor và bấm **Run**.
4. Kết quả đúng là `Success. No rows returned`.

Migration chỉ thêm bảng/bucket mới; không xóa bài Insights, JD hoặc dữ liệu cũ.

### 4. Thêm ba secret vào Supabase

Trong Supabase → **Edge Functions** → **Secrets**, thêm:

```text
LARK_APP_ID=<App ID của Lark>
LARK_APP_SECRET=<App Secret của Lark>
FACS_SITE_URL=https://facs.vn
```

### 5. Triển khai ba Edge Functions

Từ thư mục source v20.5, chạy:

```powershell
npx supabase functions deploy form-submissions --project-ref bnfzbhgkkxzjrvdtrhyt
npx supabase functions deploy form-email-admin --project-ref bnfzbhgkkxzjrvdtrhyt
npx supabase functions deploy form-lark-oauth-callback --project-ref bnfzbhgkkxzjrvdtrhyt
```

### 6. Kết nối tài khoản Lark một lần

Sau khi Vercel Preview đã sẵn sàng:

1. Đăng nhập Admin.
2. Mở `/admin/form-email`.
3. Bấm **Kết nối tunguyen@facs.vn**.
4. Đăng nhập Lark bằng `tunguyen@facs.vn` và bấm cho phép.
5. Quay lại Admin, bấm gửi thử từ `hr@facs.vn` và `contact@facs.vn`.

Chỉ tiếp tục khi cả hai email thử đều đến hộp thư `tunguyen@facs.vn` và trường From hiển thị đúng alias.

### 7. Kiểm tra trước khi merge

1. Gửi một yêu cầu thử tại `/contact` bằng email của bạn.
2. Gửi một hồ sơ thử tại `/careers/apply` với CV PDF nhỏ hơn 5 MB.
3. Kiểm tra cả ba người nhận đều nằm trong trường **To**.
4. Kiểm tra email Careers có CV đính kèm.
5. Kiểm tra người gửi nhận thư xác nhận song ngữ.
6. Kiểm tra dữ liệu tại `/admin/applications` và `/admin/inquiries`.
7. Xóa hoặc đánh dấu đóng dữ liệu thử, rồi mới merge Pull Request vào `main`.

## Các đường dẫn Admin mới

- `/admin/applications`: hồ sơ ứng tuyển và tải CV.
- `/admin/inquiries`: yêu cầu liên hệ.
- `/admin/form-email`: kết nối Lark, gửi thử và kiểm tra alias.

## Lưu ý bảo mật

- CV được lưu trong bucket riêng tư `career-cvs`, không có URL công khai.
- Trình duyệt không nhận `LARK_APP_SECRET` hoặc Supabase service-role key.
- Chỉ người dùng đã đăng nhập Admin mới xem dữ liệu và tải CV.
- Không commit `.env.local` hoặc bất kỳ secret nào vào GitHub.
