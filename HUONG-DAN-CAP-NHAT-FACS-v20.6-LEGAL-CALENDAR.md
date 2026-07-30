# Hướng dẫn kích hoạt FACS Legal Calendar v20.6

Thực hiện trên nhánh `feature/legal-calendar-v20.6`. Không merge hoặc triển
khai nhánh AI Assistant cũ.

## 1. Cập nhật cơ sở dữ liệu

Trong Supabase SQL Editor, chạy toàn bộ file:

```text
supabase/migrations/v20.6-legal-calendar.sql
```

Migration chỉ bổ sung bảng, chính sách RLS, danh mục nguồn và dữ liệu nháp.
Không xóa hoặc thay đổi dữ liệu Insights, Careers, Contact hay Email hiện có.

## 2. Triển khai tác vụ quét nguồn

```powershell
npx supabase functions deploy legal-calendar-sync --project-ref bnfzbhgkkxzjrvdtrhyt
```

Tác vụ sử dụng `FACS_CRON_SECRET` hiện có. Không nhập hoặc gửi
`SUPABASE_SERVICE_ROLE_KEY` qua chat.

## 3. Kích hoạt lịch quét 10:00 và 16:00

Trong Supabase SQL Editor, chạy:

```text
supabase/cron-v20.6-legal-calendar-template.sql
```

File này tái sử dụng ba Vault secret đã được thiết lập cho cron v20.3:

- `facs_project_url`
- `facs_publishable_key`
- `facs_cron_secret`

## 4. Rà soát dữ liệu khởi tạo

1. Đăng nhập `/admin/login`.
2. Mở `Legal Calendar → Mốc pháp lý`.
3. Mở từng bản nháp tháng 7/2026.
4. Kiểm tra đối tượng áp dụng, hiệu lực văn bản và ngày đến hạn.
5. Thêm URL nguồn chính thức P1.
6. Chuyển trạng thái sang `Đã xác minh`.
7. Chọn `Xác minh & xuất bản`.

## 5. Kiểm tra công khai

- Mở `/legal-calendar`.
- Kiểm tra VI/EN, bộ lọc tháng/năm/lĩnh vực và chi tiết nguồn.
- Chọn `Thêm vào lịch` để kiểm tra file `.ics`.
- Kiểm tra trên điện thoại và máy tính trước khi merge.

## Nguyên tắc vận hành

- P1: nguồn chính thức, có thể dùng làm căn cứ sau khi kiểm tra hiệu lực.
- P2: MISA, Thư Viện Pháp Luật, Luật Việt Nam và nguồn chuyên môn tương tự;
  chỉ dùng để phát hiện và đối chiếu.
- P3: email, mạng xã hội hoặc nguồn cảnh báo sớm; không dùng độc lập làm căn
  cứ pháp lý.
- Không tự động công khai ứng viên do tác vụ quét phát hiện.
