# Đồng bộ bản Email/Insights đã duyệt lên GitHub main

Ngày 01/11/2026, Tú đã cài và cấp quyền ChatGPT Codex Connector cho repository `Laurent310597/FACS-production-website`. Quyền ghi được kiểm chứng bằng thao tác tạo cây mã qua GitHub Git API. Lỗi HTTP 403 trước đó do kết nối mới được xác thực nhưng chưa được cài trên tài khoản sở hữu repository.

Commit đồng bộ đưa mã ứng dụng đã duyệt `f8cd32f7fb7e9ee862ebe973a0171d52bb154c52` và biên bản phát hành lên main, trên nền `689ce442c03601133f2282efda013eaa9541a0f7`. Nội dung ứng dụng khớp nguồn đã phát hành trên facs.vn; những thay đổi sau nghiệm thu chỉ là tài liệu.

## Cập nhật bản clone sau đồng bộ

```sh
git fetch origin
git switch main
git pull --ff-only origin main
```

Nếu bản clone có các commit cục bộ từ gói Git bàn giao cũ và không thể fast-forward, dừng để đối chiếu nội dung/lịch sử; không force-push hoặc nạp lại gói cũ lên main.

## Vercel và dữ liệu

Kiểm tra bản Git deployment sau khi cập nhật main. Build production phải dùng Supabase `bnfzbhgkkxzjrvdtrhyt`; bản Preview dùng database riêng và không được dùng trực tiếp thay production. Việc đồng bộ này không gửi email, nhập Audience hoặc xóa thêm bài viết.

File `FACS_Email_Release_main_2026-11-01.bundle` là hồ sơ bàn giao được tạo khi kết nối còn bị HTTP 403. Không cần dùng gói đó để ghi đè main sau lần đồng bộ này.
