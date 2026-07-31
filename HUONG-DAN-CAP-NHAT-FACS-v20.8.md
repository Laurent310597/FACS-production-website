# Hướng dẫn cập nhật FACS Legal Calendar v20.8

Thực hiện trên nhánh `feature/legal-calendar-v20.6`. Không merge vào `main`
trước khi kiểm tra Vercel Preview.

## 1. Nội dung cập nhật

- Làm dịu nền sáng của bảng lịch bằng tông xanh xám.
- Mỗi thẻ chỉ còn một nút `Nguồn chính thức`.
- Bổ sung kiểm tra phiên đăng nhập và thông báo chẩn đoán cho tác vụ quét.
- Hiển thị riêng số nguồn quét lỗi thay vì báo thành công chung.

## 2. Triển khai Edge Function bắt buộc

Migration cơ sở dữ liệu không tự triển khai Edge Function. Mở PowerShell tại
thư mục dự án và chạy từng lệnh:

```powershell
npx supabase login
```

Sau khi trình duyệt xác nhận đăng nhập, chạy:

```powershell
npx supabase functions deploy legal-calendar-sync --project-ref bnfzbhgkkxzjrvdtrhyt --no-verify-jwt
```

Kết quả đúng phải có thông báo đã triển khai function
`legal-calendar-sync`. Không nhập hoặc gửi `SUPABASE_SERVICE_ROLE_KEY` qua chat.

## 3. Kiểm tra

1. Tải lại `/admin/legal-calendar/sources` bằng `Ctrl + F5`.
2. Bấm `Quét nguồn ngay`.
3. Kiểm tra thông báo số nguồn đã quét và hàng đợi cập nhật.
4. Mở `/legal-calendar` để kiểm tra nền lịch và nút nguồn trên cả máy tính,
   điện thoại.

Chỉ sau khi hai trang hoạt động đúng mới merge Pull Request vào `main`.
