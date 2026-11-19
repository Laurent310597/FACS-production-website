# CMS › AR – Email nhắc công nợ

Trang `/admin/ar` gửi email nhắc công nợ song ngữ từ **accounting@facs.vn** (cùng ứng dụng Microsoft 365 đang gửi email Insights và Contact), kèm thông tin tài khoản ngân hàng của FACS.

## Lần đầu sử dụng
1. Bấm **Mẫu email & tài khoản ngân hàng** → điền Ngân hàng, Số tài khoản, Chủ tài khoản (bắt buộc), Chi nhánh/SWIFT (tùy chọn), chỉnh tiêu đề và nội dung nếu muốn → **Cập nhật xem trước** → **Lưu**.
2. **Cấp quyền gửi (làm một lần, trên web):** Exchange admin center (https://admin.exchange.microsoft.com) → **Recipients → Mailboxes** → bấm **Internal Accounting - FACS** (accounting@facs.vn) → tab **Delegation** → mục **Send as** → **Edit** → **Add members** → chọn **Infor - FACS** (infor@facs.vn) → **Save**. Đợi khoảng 1 giờ.
   - Lý do: ứng dụng gửi mail của website hiện chỉ được Microsoft cho gửi trực tiếp từ infor@/contact@/hr@. Khi gửi trực tiếp từ accounting@ bị từ chối (403), website tự gửi qua infor@ nhưng người gửi hiển thị là **accounting@facs.vn**, khách trả lời sẽ về accounting@. Một bản ẩn (BCC) được gửi về accounting@ để lưu lịch sử.
   - Nếu sau này quản trị viên cho phép ứng dụng gửi trực tiếp từ accounting@, website tự chuyển sang gửi trực tiếp, không cần sửa gì. Hộp thư trung gian đổi được bằng secret `AR_RELAY_MAILBOX` trên Supabase.
3. Bấm **Gửi thử tới tunguyen@facs.vn**: bản thử luôn đi từ accounting@facs.vn tới tunguyen@facs.vn (đổi được bằng secret `AR_TEST_RECIPIENT` trên Supabase), không gửi ra email cá nhân; thông báo cho biết đã gửi trực tiếp hay qua infor@.

## Gửi nhắc nợ
- **Ít khách:** tab *Nhập trực tiếp* → điền Người nhận, Email (nhiều email ngăn bằng `;`), Email CC, Tên công ty, MST, Số tiền nợ, Giai đoạn nợ, Ghi chú → **Lưu vào danh sách**.
- **Nhiều khách:** tab *Tải file Excel* → tải **file mẫu** → điền → chọn file → kiểm tra bảng xem trước (dòng lỗi tô đỏ) → **Lưu N dòng**. Tối đa 500 dòng/lần.
- Ở **Danh sách nhắc nợ**: tick các dòng → **Gửi email** → xác nhận. Mỗi email cách nhau ~2 giây (giới hạn của Microsoft 365); giữ trang mở đến khi xong.
- Bố cục giống email Insights/Contact/HR: phần tiếng Việt (lời nhắn, bảng song ngữ *Chi tiết công nợ / Outstanding balance* và *Thông tin chuyển khoản / Bank transfer details*, chữ ký Phòng Kế toán) — gạch ngang — phần tiếng Anh (lời nhắn, chữ ký Accounting Department). Bảng chỉ hiện một lần. Bản sao lưu trong *Sent Items* của accounting@facs.vn.

## An toàn
- Không có email nào tự gửi; chỉ gửi khi bấm và xác nhận. Dòng đã gửi không gửi lại được nếu không bấm **Gửi lại** và xác nhận lần nữa.
- Bấm gửi 2 lần hoặc mở 2 tab cũng không gửi trùng (máy chủ khóa từng dòng trước khi gửi).
- Dòng đã gửi không sửa/xóa được (giữ lịch sử). Thiếu thông tin ngân hàng thì hệ thống chặn gửi.

Thay thế AR Tracker cũ (import hóa đơn Viettel / Customer Master) — phần đó chưa từng có dữ liệu nên đã gỡ.
