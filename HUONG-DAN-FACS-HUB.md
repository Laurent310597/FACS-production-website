# FACS Hub – Phần 2: Tạo nội dung AI (nhánh `feature/facs-hub`)

## Thay đổi trong nhánh này

Chỉ **thêm mới**, không sửa luồng đăng bài và gửi email Insights:

| Loại | File |
|---|---|
| Trang mới | `src/pages/admin/AdminHubContentPage.jsx` (đường dẫn `/admin/hub/content`) |
| Thư viện mới | `src/lib/hub.js`, `src/lib/hubInfographic.js` |
| Edge Function mới | `supabase/functions/hub-content/`, `supabase/functions/_shared/hub-content.ts` |
| Database (bảng mới) | `supabase/migrations/20261116160000_facs_hub_content_studio.sql` → `hub_content_items`, `hub_generation_log` |
| Sửa nhỏ | `src/App.jsx` (thêm 2 route), `src/components/admin/AdminLayout.jsx` (thêm 1 mục menu), `supabase/config.toml` (khai báo function), `package.json` (thêm lệnh `qa:hub`) |

Không file nào của `insight-email`, trình soạn bài, lịch hẹn giờ hay bảng `posts` bị sửa.

Điểm chạm duy nhất với CMS: nút **"Tạo bài nháp trong CMS"** thêm một dòng vào bảng `posts` với `status = draft` và `email_delivery_mode = disabled` — giống hệt khi anh bấm lưu nháp trong trình soạn bài. Bài không tự đăng, không tự gửi email.

## Kích hoạt (làm một lần)

> Bản xem trước (preview) trên Vercel dùng **chung database Supabase** với website thật. Hai bước dưới đây chỉ thêm bảng và function mới nên không ảnh hưởng website đang chạy.

**Bước 1 – Tạo bảng.** Supabase Dashboard → SQL Editor → dán toàn bộ nội dung file `supabase/migrations/20261116160000_facs_hub_content_studio.sql` → Run.

**Bước 2 – Khai báo khóa OpenAI.** Supabase Dashboard → Edge Functions → Secrets → thêm:

| Tên | Giá trị |
|---|---|
| `OPENAI_API_KEY` | API key tạo tại platform.openai.com (nên tạo project riêng và đặt giới hạn chi tiêu tháng) |
| `HUB_OPENAI_MODEL` | (không bắt buộc) mặc định `gpt-4.1-mini` |
| `HUB_DAILY_LIMIT` | (không bắt buộc) số lượt tạo tối đa mỗi người / 24 giờ, mặc định `40` |

**Bước 3 – Triển khai function.** Trên máy có Supabase CLI, tại thư mục dự án (nhánh `feature/facs-hub`):

```
supabase functions deploy hub-content
```

**Bước 4 – Xem thử.** Mở bản preview của nhánh trên Vercel → đăng nhập quản trị → menu **FACS Hub › Tạo nội dung AI**.

## Cách dùng

1. Dán tối đa 3 link (https), hoặc dán thẳng nội dung nguồn, và ghi yêu cầu.
2. Chọn loại nội dung: bài website song ngữ, Facebook, LinkedIn, Instagram, infographic.
3. Bấm **Tạo nội dung**, chờ 30–90 giây.
4. Đọc mục **"Cần chuyên gia kiểm tra trước khi đăng"** (nếu có), sửa nội dung ngay trên trang.
5. **Website:** bấm *Tạo bài nháp trong CMS* → mở bài nháp → rà soát, thêm ảnh bìa, đăng / hẹn giờ / gửi email như bình thường.
6. **Mạng xã hội:** bấm *Chép nội dung* để đăng tay (hẹn giờ đăng trực tiếp là Phần 3).
7. **Infographic:** sửa chữ, bấm *Tải ảnh PNG*.
8. **Lưu bộ nội dung** để mở lại sau.

Giới hạn hiện tại: link phải là trang công khai (trang cần đăng nhập, file PDF, ảnh thì dán nội dung vào ô "Dán nội dung"); infographic có một mẫu bố cục.

## Kiểm thử

```
npm run qa:hub     # logic đọc nguồn, chặn link nội bộ, schema AI
npm run lint
npm run build
```

## Gỡ bỏ (nếu không dùng)

Không gộp nhánh là website giữ nguyên. Để xóa phần đã kích hoạt trên Supabase: `drop table public.hub_content_items, public.hub_generation_log;` và xóa function `hub-content`.
