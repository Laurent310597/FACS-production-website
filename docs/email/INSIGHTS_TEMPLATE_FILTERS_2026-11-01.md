# Insights: mẫu email và bộ lọc bài viết — 01/11/2026

## Yêu cầu của Tú

Định dạng email Insights như mẫu HR/Contact; tìm và chọn bài viết thuận tiện khi danh sách dài, theo từ khóa, ngày đăng và trạng thái.

## Thay đổi

- Insights dùng chung `buildEmailShell` và `buildEmailSignature` với email HR/Contact: nền xám nhạt, logo FACS, khung trắng tối đa 640 px, viền xanh cyan, chữ Arial và chữ ký gọn. Giữ nội dung VI/EN, ngày đăng và đường dẫn bài riêng cho mỗi ngôn ngữ.
- Xem trước dùng iframe srcDoc đã sanitize, sandbox không cho chạy script. Màu chữ và font không còn kế thừa từ giao diện admin tối. Khung hiển thị và email gửi thực tế dùng cùng HTML do máy chủ tạo.
- Thay dropdown bằng cửa sổ tìm/chọn có bộ lọc: cụm từ trong tiêu đề, mô tả và nội dung VI/EN; ngày đăng từ/đến; bài nháp/đã xuất bản/đã lên lịch; trạng thái email; ngày đăng mới/cũ nhất.
- Ngày đăng tính theo giờ Việt Nam và bao gồm trọn hai ngày biên. Từ khóa không phân biệt hoa/thường; dấu tiếng Việt được giữ nguyên. Ký tự %, _, dấu ngoặc, dấu phẩy và dấu nháy được xử lý như nội dung tìm kiếm.
- Truy vấn lọc và phân trang tại Supabase, 8 bài/trang; không tải toàn bộ nội dung bài vào trình duyệt. Bài đang chọn không bị đổi khi lọc. Chuyển bài xóa bản xem trước/xác nhận của bài cũ.
- Phiên bản mẫu được đưa vào hash kiểm duyệt. Mẫu mới yêu cầu xem trước và gửi thử lại; không dùng lại xác nhận của mẫu cũ. Người nhận và quy trình xác nhận Audience giữ nguyên.

## Kiểm tra đã thực hiện

- 11 kiểm tra email/tìm kiếm tự động đạt; gồm escape HTML, liên kết bài, biên ngày Việt Nam, ngày không hợp lệ và truy vấn phân trang qua Supabase client.
- 9 truy vấn đọc thực tế trên Supabase Preview đạt: từ khóa TEST, cụm có dấu nháy/dấu phẩy, khoảng ngày cùng ngày, ngày trước ngày đăng, đã xuất bản/đã lên lịch, %, _ và dấu gạch chéo ngược.
- ESLint, Vite build, Deno check `insight-email` và `form-email-admin` đạt. Build vẫn có cảnh báo bundle lớn như trước.
- Không gọi Microsoft Graph để gửi thư; không nhập Audience, xuất bản bài, đổi cấu hình hoặc dữ liệu production.

## Giới hạn kiểm tra và phát hành

- Trình duyệt CUA không khởi động được do filesystem môi trường; Chromium có sẵn cũng bị chặn tạo socket. Script kiểm thử giao diện với dữ liệu giả chưa chạy được. Chưa có bằng chứng kiểm tra bố cục bằng trình duyệt hoặc nhận email Outlook thực tế.
- Bản thử phải dùng Vercel Preview và Supabase `zpbdsfkihjwfhasbadmn`. Không promote trực tiếp bản này sang production vì frontend được khóa vào cơ sở dữ liệu Preview.
- GitHub vẫn chưa có quyền ghi; các thay đổi được commit cục bộ và có thể triển khai Preview qua source overlay đã khóa commit nền và kiểm tra SHA-256.
- Chờ Tú duyệt bản giao diện/mẫu trước khi phát hành lên facs.vn. Việc cấp quyền cơ sở dữ liệu đã duyệt trước đó là thay đổi riêng đã hoàn tất, không phải phát hành mẫu/UI này.

## Preview đã sẵn sàng

- URL: https://facs-production-website-e6n0jq6a3-facs-s-projects.vercel.app/admin/email
- Vercel deployment `dpl_5AtA6bpLyj5YWn1QAdcRTQDeoQdY`: READY, target Preview (null), không có alias production. Mã nguồn triển khai tại commit cục bộ `075348ce3692ce5046abf1c5660dd6b76460ae3a`.
- Function `insight-email` tại Supabase Preview: phiên bản 7 ACTIVE, gồm mẫu mới, module khung dùng chung và phiên bản mẫu trong hash kiểm duyệt.
- HTML và JavaScript trên Vercel trả HTTP 200. Bundle có nút tìm/chọn, bộ lọc ngày và iframe xem trước; URL cơ sở dữ liệu là Preview và không có ref Supabase production.
- Endpoint preview từ chối yêu cầu chưa đăng nhập bằng HTTP 401. Không thử giả lập quyền quản trị trên máy chủ hoặc gửi thư thực tế.
- Production vẫn ở deployment `dpl_7dpSJmPeKrHe5MerAxSjP4cFnbsu`, commit main `689ce442c03601133f2282efda013eaa9541a0f7`; `insight-email` production vẫn phiên bản 2 và `form-email-admin` vẫn phiên bản 20.

## Điều chỉnh font theo phản hồi của Tú

- Thống nhất Arial cho toàn bộ email Insights, bao gồm tiêu đề bài VI/EN, nút đọc bài, liên kết, chữ ký và footer. Font được khai báo inline để email client không tự đổi font ở tiêu đề hoặc nút. Chỉ dùng sans-serif làm font dự phòng khi thiết bị thiếu Arial.
- Đã triển khai `insight-email` phiên bản 8 ACTIVE trên Supabase Preview. Cùng URL Vercel Preview tiếp tục dùng được; không cần phát hành lại frontend vì HTML email được tạo tại function.
- Mẫu mang phiên bản `2026-11-01-arial-v3`, yêu cầu xem trước/gửi thử lại trước khi duyệt Audience. Kiểm tra HTML tạo ra ở cả chế độ thường và thử nội bộ chỉ có font Arial; không còn Cambria, Georgia hoặc Times New Roman.
- 11 kiểm tra sẵn có và Deno check đạt. Không gửi thư thực tế hoặc triển khai font/mẫu này lên production. Kiểm thử trình duyệt/Outlook thực tế vẫn chưa hoàn tất; cần mở lại bản xem trước để thấy HTML mới.
