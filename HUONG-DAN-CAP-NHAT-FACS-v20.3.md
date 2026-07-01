# HƯỚNG DẪN CẬP NHẬT FACS WEBSITE v20.3

> Làm theo đúng thứ tự. Không đưa App Secret, refresh token hoặc Supabase Secret Key lên GitHub/Vercel/frontend.

## A. Sao lưu trước khi cập nhật

1. Mở GitHub Desktop.
2. Chọn repository `FACS-production-website`.
3. Đảm bảo đang ở branch `main` và hiện `No local changes`.
4. Giữ lại file ZIP backup hiện tại.

## B. Cập nhật database Supabase

Website production hiện tại chưa xác nhận đã cài v20.2, nên dùng file tổng hợp:

`supabase/migrations/v20.1-to-v20.3-combined.sql`

1. Mở Supabase Dashboard.
2. Chọn organization `FACS` → project `facs-website`.
3. Bấm **SQL Editor** → **New query**.
4. Mở file SQL trên, `Ctrl + A` → `Ctrl + C`.
5. Dán vào SQL Editor → bấm **Run**.
6. Kết quả đúng: `Success. No rows returned`.

File này không xóa bài viết, tài khoản hoặc ảnh hiện có.

## C. Tạo Lark Custom App

1. Mở Lark Developer Console: `https://open.larksuite.com/app`.
2. Đăng nhập tài khoản quản trị Lark của FACS.
3. Tạo **Custom App** với tên gợi ý: `FACS Insight Email Automation`.
4. Trong **Credentials & Basic Info**, lưu riêng:
   - App ID
   - App Secret
5. Trong **Permissions**, thêm:
   - `mail:user_mailbox.message:send`
   - `offline_access`
6. Trong **Security Settings**, bật quyền refresh `user_access_token` nếu có công tắc này.
7. Thêm Redirect URL chính xác:

   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/lark-oauth-callback`

   `YOUR_PROJECT_REF` là phần đầu trong Project URL của Supabase.
8. Phát hành app/version và cấp quyền sử dụng app cho tài khoản `info@facs.vn`.

## D. Deploy Supabase Edge Functions

### Cách khuyến nghị: Supabase CLI

1. Mở thư mục source v20.3 trong File Explorer.
2. Bấm vào thanh địa chỉ, gõ `cmd`, nhấn Enter.
3. Chạy:

```bash
npx supabase login
```

4. Đăng nhập theo cửa sổ trình duyệt.
5. Lấy Project Ref trong Supabase Settings/Project URL, rồi chạy:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

6. Deploy hai functions:

```bash
npx supabase functions deploy insight-email --no-verify-jwt --use-api
npx supabase functions deploy lark-oauth-callback --no-verify-jwt --use-api
```

## E. Cài Edge Function Secrets

Tự tạo một chuỗi bí mật dài cho `FACS_CRON_SECRET`, ví dụ bằng password generator. Không gửi chuỗi này qua chat.

Chạy trong CMD:

```bash
npx supabase secrets set \
  LARK_APP_ID=YOUR_LARK_APP_ID \
  LARK_APP_SECRET=YOUR_LARK_APP_SECRET \
  FACS_CRON_SECRET=YOUR_RANDOM_CRON_SECRET \
  FACS_SITE_URL=https://facs.vn \
  --project-ref YOUR_PROJECT_REF
```

Trên Windows CMD, có thể nhập trên một dòng:

```bash
npx supabase secrets set LARK_APP_ID=YOUR_LARK_APP_ID LARK_APP_SECRET=YOUR_LARK_APP_SECRET FACS_CRON_SECRET=YOUR_RANDOM_CRON_SECRET FACS_SITE_URL=https://facs.vn --project-ref YOUR_PROJECT_REF
```

Không cần redeploy function sau khi chỉ thay secrets.

## F. Cấu hình Cron gửi bài hẹn giờ

1. Mở `supabase/cron-v20.3-template.sql`.
2. Thay ba placeholder:
   - `YOUR_PROJECT_REF`
   - `YOUR_SUPABASE_PUBLISHABLE_KEY`
   - `YOUR_FACS_CRON_SECRET`
3. Vào Supabase → SQL Editor → New query.
4. Dán file đã thay giá trị → **Run**.
5. Cron sẽ gọi function mỗi phút.

Không dùng Secret Key/service-role key trong Cron. Publishable Key chỉ dùng để định tuyến request; function còn kiểm tra `x-facs-cron-secret`.

## G. Cập nhật source website trên GitHub

Dùng file patch tổng hợp `facs-v20.3-combined-patch-from-v20.1.zip`.

1. Giải nén patch.
2. Mở GitHub Desktop → repository `FACS-production-website` → **Show in Explorer**.
3. Sao chép toàn bộ nội dung patch vào repository.
4. Chọn **Replace the files in the destination**.
5. Quay lại GitHub Desktop.
6. Summary:

   `Add Lark Insight email notifications`

7. Bấm **Commit to main** → **Push origin**.
8. Vào Vercel → `facs-production-website` → **Deployments**.
9. Chờ deployment mới chuyển thành **Ready**.

Không cần thêm Vercel Environment Variable mới. Lark secrets nằm trong Supabase Edge Function Secrets.

## H. Kết nối mailbox info@facs.vn

1. Mở `https://facs.vn/admin/email`.
2. Bấm **Kết nối info@facs.vn**.
3. Đảm bảo trình duyệt đang đăng nhập đúng mailbox/user `info@facs.vn`.
4. Chấp thuận quyền gửi email và offline access.
5. Khi thấy thông báo kết nối thành công, quay lại `/admin/email`.
6. Bấm **Kiểm tra lại**; trạng thái phải là **Đã kết nối info@facs.vn**.

## I. Nhập danh sách khách hàng

1. Tại `/admin/email`, bấm **Nhập CSV**.
2. Dùng mẫu `templates/facs-insight-audience-template.csv`.
3. Cột bắt buộc: `email`.
4. Các cột khuyến nghị: `display_name`, `company_name`.
5. Kiểm tra tổng số người ở trạng thái **Đang nhận**.

Toàn bộ người trong danh sách này chỉ được đưa vào Bcc. Hệ thống loại trùng email và loại các địa chỉ nội bộ cố định khỏi Bcc.

## J. Test trước khi gửi khách hàng

1. Tạo hoặc mở một bài viết.
2. Lưu bài trước.
3. Bấm **Gửi thử cho tôi**.
4. Email test chỉ gửi tới `tunguyen@facs.vn`, không gửi Bcc khách hàng và không Cc.
5. Kiểm tra subject, nội dung song ngữ, link và chữ ký.

## K. Cách dùng hàng ngày

### Bài không cần gửi email

- Giữ công tắc **Gửi email khi bài viết được xuất bản** ở trạng thái tắt.
- Đăng ngay hoặc hẹn giờ như bình thường.

### Bài cần gửi email

- Bật công tắc gửi email.
- Đăng ngay hoặc hẹn giờ.
- Đăng ngay: hệ thống xử lý ngay; Cron là phương án dự phòng.
- Hẹn giờ: email chỉ gửi sau khi thời điểm xuất bản đến.

### Hủy email nhưng vẫn đăng bài

- Mở bài viết trước thời điểm gửi.
- Bấm **Hủy gửi email**.
- Lịch đăng bài được giữ nguyên; chỉ email bị hủy.

## L. Kiểm tra lỗi

- `/admin/posts`: xem badge email từng bài.
- `/admin/email`: xem nhật ký gửi gần nhất.
- Supabase → Edge Functions → Logs: xem lỗi API/token.
- Nếu token hết hạn hoặc bị thu hồi: bấm **Kết nối lại info@facs.vn**.
- Nếu audience bằng 0: hệ thống không gửi email nội bộ-only và đánh dấu thất bại để tránh nhầm.
