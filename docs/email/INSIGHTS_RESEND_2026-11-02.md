# Insights: gửi lại Audience và gửi riêng — 02/11/2026

## Hành vi theo yêu cầu của Tú

- Bài viết có trạng thái email `sent` tiếp tục được chọn và gửi lại. Gửi lại Audience bao gồm toàn bộ khách hàng đang nhận tại thời điểm xác nhận, kể cả khách hàng cũ; giao diện ghi rõ đây là gửi lại toàn bộ.
- Giữ quy trình xem trước → gửi thử → xác nhận `SEND-AUDIENCE` cho lượt gửi toàn bộ. Bản thử cùng nội dung có hiệu lực 24 giờ; mở lại bản xem trước cùng nội dung không xóa bản thử còn khớp. Thay đổi nội dung email yêu cầu kiểm tra lại.
- Mỗi dòng khách hàng có nút phong bì. Chọn bài đã xuất bản, bấm phong bì, xem nội dung và email đích trong hộp xác nhận rồi bấm gửi riêng. Không cần thực hiện một chiến dịch gửi toàn bộ để gửi riêng.
- Gửi riêng dùng From `infor@facs.vn`, To `tunguyen@facs.vn`, Cc trống và duy nhất một địa chỉ khách hàng được chọn trong Bcc. Không cho gửi riêng tới khách đã ngừng nhận, email không hợp lệ hoặc các hộp thư nội bộ cố định.
- Nhật ký phân biệt Audience và Gửi riêng, lưu danh sách Bcc thực tế của từng lượt mới. Không thay đổi hoặc xóa lịch sử cũ.
- Quy trình dùng thời gian máy chủ, cập nhật trực tiếp bản ghi đã lưu sau khi gửi thử; không phụ thuộc đồng hồ trên máy tính người dùng.

## Xử lý mỗi lượt gửi

Máy chủ kiểm tra lại nội dung và khách hàng trước khi gửi. RPC `claim_insight_email_delivery` khóa dòng bài viết trong giao dịch, chụp danh sách người nhận và tạo log cùng mã lượt gửi duy nhất. Một yêu cầu bị bấm lặp dùng lại mã đó và không gửi lại qua Microsoft Graph. Một lượt gửi mới có mã riêng. Các RPC mới dùng SECURITY INVOKER và chỉ cấp EXECUTE cho service_role; không mở thêm quyền cho anon/authenticated.

Lượt gửi thủ công hoặc gửi riêng không được đưa vào hàng đợi gửi lại tự động. Nếu Graph đã chấp nhận nhưng lưu kết quả thất bại, giữ trạng thái processing để đối chiếu Sent Items trước khi tạo lượt mới. Chỉnh sửa và xuất bản bài không tự gửi email.

## Xác minh

- `npm run qa:email`: 19 kiểm tra, gồm phạm vi Bcc, mã lượt gửi, xử lý trùng, lỗi chốt trạng thái, đồng hồ và nội dung thay đổi.
- `deno test --node-modules-dir=manual --no-lock --allow-env scripts/qa-insight-handler.test.ts`: 6 tình huống qua handler thật; toàn bộ HTTP được mô phỏng, không có quyền truy cập mạng hoặc gửi thư. Kiểm tra payload Graph, gửi lại bài sent, yêu cầu lặp, nội dung đổi và khách đã ngừng nhận.
- `scripts/qa-email-delivery.sql`: chạy trên Supabase Preview bằng giao dịch rồi ROLLBACK. Kiểm tra gửi lại, khóa lượt đồng thời, Bcc duy nhất, yêu cầu lặp, từ chối unsubscribed, hết hạn kiểm thử, reset kiểm duyệt khi nội dung đổi và không tự retry gửi riêng.
- Kiểm tra tương tác React trong DOM mô phỏng: 7 tình huống, gồm cập nhật nút xác nhận ngay cả khi đồng hồ máy người dùng chậm sáu giờ; không gọi dịch vụ thư thật.
- Lint, build, Deno check và hồi quy AR đạt. Trình duyệt Chromium bị môi trường từ chối socket và công cụ trình duyệt cloud không khởi chạy được; chưa xác minh trực quan bằng trình duyệt hoặc nhận email Outlook thực tế cho tính năng mới.

## Phạm vi phát hành

Không gửi email thử hoặc email khách hàng trong quá trình triển khai tính năng. Không thay đổi Audience production, bài viết hoặc mẫu email Arial đã duyệt. Các kiểm soát vai trò quản trị cũ ngoài phạm vi thay đổi này; xem hồ sơ email trước đó.
