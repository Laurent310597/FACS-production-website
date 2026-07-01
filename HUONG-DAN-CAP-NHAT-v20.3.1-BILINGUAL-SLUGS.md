# Hướng dẫn cập nhật slug song ngữ — FACS Website v20.3.1

## 1. Cập nhật Supabase
1. Mở Supabase > `facs-website` > SQL Editor > New query.
2. Mở `v20.3.1-bilingual-slugs.sql`, sao chép toàn bộ và bấm **Run**.
3. Kết quả đúng: `Success. No rows returned`.

Trường `slug` cũ được giữ làm alias nên các link cũ không bị hỏng.

## 2. Cập nhật source
1. Giải nén gói patch.
2. GitHub Desktop > `FACS-production-website` > **Show in Explorer**.
3. Sao chép toàn bộ patch vào repository và chọn **Replace the files in the destination**.
4. Commit: `Add bilingual Insight slugs`.
5. **Push origin**.
6. Vercel > Deployments > chờ **Ready**.

## 3. Kiểm tra
1. Mở một bài trong Admin.
2. Điền riêng slug tiếng Việt và slug tiếng Anh.
3. Lưu bài, mở ngoài website và chuyển VI/EN. URL phải đổi theo ngôn ngữ.
4. Mở link cũ để xác nhận link vẫn hoạt động.
