# Hướng dẫn cập nhật FACS Website v20.3.1

Bản này bao gồm **tên tác giả song ngữ** và **slug/link bài viết song ngữ**.

## 1. Cập nhật Supabase

1. Mở Supabase → organization `FACS` → project `facs-website`.
2. Chọn **SQL Editor → New query**.
3. Mở file `v20.3-to-v20.3.1-bilingual-author-and-slugs.sql`.
4. Sao chép toàn bộ nội dung, dán vào SQL Editor và bấm **Run**.
5. Kết quả đúng: `Success. No rows returned`.

Migration không xóa bài viết. Trường `slug` cũ được giữ làm alias, vì vậy các link đã chia sẻ trước đây vẫn hoạt động.

## 2. Cập nhật source website

1. Giải nén gói patch v20.3.1.
2. Mở GitHub Desktop → repository `FACS-production-website` → **Show in Explorer**.
3. Sao chép toàn bộ nội dung patch vào repository.
4. Chọn **Replace the files in the destination**.
5. Trong GitHub Desktop, nhập Summary: `Add bilingual Insight authors and slugs`.
6. Bấm **Commit to main → Push origin**.
7. Vào Vercel → project `facs-production-website` → Deployments.
8. Chờ deployment mới chuyển thành **Ready**.

## 3. Redeploy Edge Function gửi email

Bước này cần thực hiện để email song ngữ sử dụng hai link VI/EN khác nhau.

Tại thư mục repository, mở Command Prompt và chạy:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy insight-email --no-verify-jwt --use-api
```

Không cần deploy lại `lark-oauth-callback` nếu function đó không thay đổi.

## 4. Kiểm tra

1. Đăng nhập `https://facs.vn/admin/login`.
2. Mở một bài viết.
3. Điền riêng:
   - Tác giả tiếng Việt;
   - Author (English);
   - Đường dẫn bài viết tiếng Việt;
   - Article URL slug (English).
4. Lưu bài.
5. Mở bài ngoài website và chuyển VI/EN. Tên tác giả và URL phải đổi theo ngôn ngữ.
6. Mở lại đường dẫn cũ để xác nhận link cũ vẫn tải đúng bài.
7. Gửi email thử để xác nhận phần tiếng Việt và tiếng Anh dùng đúng hai link riêng.
