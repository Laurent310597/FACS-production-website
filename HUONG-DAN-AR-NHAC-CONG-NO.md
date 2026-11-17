# CMS › AR – Email nhắc công nợ

Trang `/admin/ar` gửi email nhắc công nợ song ngữ từ **accounting@facs.vn** (cùng ứng dụng Microsoft 365 đang gửi email Insights và Contact), kèm thông tin tài khoản ngân hàng của FACS.

## Lần đầu sử dụng
1. Bấm **Mẫu email & tài khoản ngân hàng** → điền Ngân hàng, Số tài khoản, Chủ tài khoản (bắt buộc), Chi nhánh/SWIFT (tùy chọn), chỉnh tiêu đề và nội dung nếu muốn → **Cập nhật xem trước** → **Lưu**.
2. Bấm **Gửi thử cho tôi**: bản thử đi từ accounting@facs.vn tới email đăng nhập CMS của anh/chị.
   - Nếu báo lỗi `Mail.Send failed (403/404)`: hộp thư accounting@facs.vn chưa tồn tại trong Microsoft 365, hoặc ứng dụng Graph đang bị giới hạn bằng Application Access Policy — cần thêm accounting@facs.vn vào nhóm được phép (giống infor@ và contact@).

## Gửi nhắc nợ
- **Ít khách:** tab *Nhập trực tiếp* → điền Người nhận, Email (nhiều email ngăn bằng `;`), Email CC, Tên công ty, MST, Số tiền nợ, Giai đoạn nợ, Ghi chú → **Lưu vào danh sách**.
- **Nhiều khách:** tab *Tải file Excel* → tải **file mẫu** → điền → chọn file → kiểm tra bảng xem trước (dòng lỗi tô đỏ) → **Lưu N dòng**. Tối đa 500 dòng/lần.
- Ở **Danh sách nhắc nợ**: tick các dòng → **Gửi email** → xác nhận. Mỗi email cách nhau ~2 giây (giới hạn của Microsoft 365); giữ trang mở đến khi xong.
- Mỗi email có: lời nhắn tiếng Việt, lời nhắn tiếng Anh, rồi bảng song ngữ *Chi tiết công nợ / Outstanding balance* (công ty, MST, giai đoạn, số tiền, ghi chú của khách đó) và *Thông tin chuyển khoản / Bank transfer details*, cuối cùng là chữ ký Phòng Kế toán song ngữ. Bản sao lưu trong *Sent Items* của accounting@facs.vn.

## An toàn
- Không có email nào tự gửi; chỉ gửi khi bấm và xác nhận. Dòng đã gửi không gửi lại được nếu không bấm **Gửi lại** và xác nhận lần nữa.
- Bấm gửi 2 lần hoặc mở 2 tab cũng không gửi trùng (máy chủ khóa từng dòng trước khi gửi).
- Dòng đã gửi không sửa/xóa được (giữ lịch sử). Thiếu thông tin ngân hàng thì hệ thống chặn gửi.

Thay thế AR Tracker cũ (import hóa đơn Viettel / Customer Master) — phần đó chưa từng có dữ liệu nên đã gỡ.
