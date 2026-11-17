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
6. **Mạng xã hội:** bấm *Chép nội dung* để đăng tay, hoặc đăng/hẹn giờ trực tiếp ở khung bên dưới (xem Phần 3 bên dưới).
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

---

## Phần 3 – Đăng & hẹn giờ lên mạng xã hội

Menu **FACS Hub → Đăng & lịch đăng** (`/admin/hub/social`) và khung **Đăng lên …** ở các thẻ Facebook / LinkedIn / Instagram của trang Tạo nội dung.

Nguyên tắc an toàn:
- Không có gì tự đăng. Bài chỉ được đăng sau khi anh/chị bấm **Duyệt & hẹn giờ** hoặc **Xác nhận đăng ngay**.
- Bài lỗi **không tự đăng lại** để tránh đăng trùng; hệ thống hiện lý do và anh/chị kiểm tra rồi quyết định.
- Luồng đăng bài Insights + email BCC `infor@facs.vn` **không bị thay đổi**.
- Mã kết nối (token) nằm ở bảng chỉ máy chủ đọc được; trình duyệt không thấy.

### Cài đặt một lần

Redirect URI dùng cho cả Meta và LinkedIn (cũng hiển thị trên trang Đăng & lịch đăng):
`https://<project-ref>.supabase.co/functions/v1/hub-social-callback`

**Facebook Fanpage + Instagram (Meta)**
1. Vào developers.facebook.com → Create App (loại Business) → thêm sản phẩm **Facebook Login**.
2. Trong Facebook Login → Settings, điền **Valid OAuth Redirect URIs** = Redirect URI ở trên.
3. Để app ở chế độ **Development**, tài khoản của anh/chị là Admin của app. Đăng lên Page/Instagram do chính mình quản lý thì **không cần Meta duyệt app**.
4. Instagram phải là tài khoản **Professional (Business/Creator)** và đã liên kết với Fanpage.
5. Supabase → Edge Functions → Secrets: `META_APP_ID`, `META_APP_SECRET`.

**LinkedIn (cá nhân)**
1. developers.linkedin.com → Create app (cần chọn một LinkedIn Page để gắn app).
2. Tab Products: thêm **Share on LinkedIn** và **Sign In with LinkedIn using OpenID Connect**.
3. Tab Auth: thêm Authorized redirect URL = Redirect URI ở trên.
4. Secrets: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`.
5. Mã LinkedIn hết hạn sau khoảng 60 ngày: trang Đăng & lịch đăng sẽ báo và có nút **Kết nối lại**.

Sau đó vào trang Đăng & lịch đăng bấm **Kết nối Facebook & Instagram** / **Kết nối LinkedIn**.

### Ghi chú kỹ thuật
- Phiên bản API đặt trong secret tùy chọn: `META_GRAPH_VERSION` (mặc định v25.0), `HUB_LINKEDIN_VERSION` (mặc định 202608).
- Instagram chỉ nhận ảnh JPEG tỉ lệ 4:5 đến 1.91:1; infographic của Hub (1080 × 1350) đã đúng chuẩn và được xuất sang JPG khi đăng.
- Hẹn giờ chạy mỗi phút bằng pg_cron (migration `20261117030000_facs_hub_social_cron.sql`), khóa riêng nằm trong Supabase Vault.
- Kiểm thử logic: `npm run qa:hub-social`.
