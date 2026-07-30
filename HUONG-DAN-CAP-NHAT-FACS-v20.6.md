# FACS Website v20.6 — AI Assistant & Contact Widget

## 0. Baseline đã xác minh

V20.6 được phát triển trực tiếp trên phiên bản website mới nhất tại thời điểm
xác minh ngày 25/07/2026:

- Repository: `Laurent310597/FACS-production-website`;
- nhánh production: `main`;
- commit production mới nhất: `d2231f109a125777f088b270e18ce5114972b378`;
- nội dung baseline: v20.5 — Form Email Automation và Admin Submissions;
- Vercel status của commit baseline: `success`;
- parent và merge-base của commit v20.6
  `0b6731df9a2db0afb1be49db24b845d5e699bab2` đều là đúng commit production
  `d2231f109a125777f088b270e18ce5114972b378`.

Do đó, v20.6 đã kế thừa đầy đủ v20.5 và không được tạo từ baseline v20.4 cũ.
Nếu `main` phát sinh commit mới trước khi mở Pull Request hoặc merge, phải cập
nhật nhánh v20.6 từ `main`, chạy lại toàn bộ kiểm thử và xác minh merge-base
trước khi triển khai.

## 1. Phạm vi cập nhật

Phiên bản v20.6 bổ sung một pop-up dùng chung trên toàn bộ website công khai, gồm:

- **Tra cứu bằng AI:** tìm thông tin trên `facs.vn` và danh sách nguồn chính thức đã giới hạn;
- **Nguồn tham khảo:** hiển thị liên kết có thể bấm trực tiếp;
- **Nhắn FACS:** gửi yêu cầu qua luồng Contact hiện có, lưu vào Supabase và gửi email theo cấu hình v20.5;
- **Liên hệ nhanh:** email, điện thoại, Facebook Messenger và Zalo;
- **Song ngữ:** tiếng Việt và tiếng Anh theo ngôn ngữ hiện tại của website.

Widget không hiển thị trong khu vực `/admin`.

## 2. Kiểm soát rủi ro đã tích hợp

- Gemini API key chỉ được lưu dưới dạng **Supabase Edge Function Secret**;
- câu hỏi AI không được lưu vào cơ sở dữ liệu FACS;
- Gemini Interactions API được gọi với `store: false`;
- giới hạn 12 lượt tra cứu/IP/60 phút;
- kiểm soát nội dung bằng cơ chế safety tích hợp của Gemini;
- giới hạn độ dài câu hỏi, số lượt lịch sử và độ dài phản hồi;
- tìm kiếm bắt buộc trong danh sách domain được phê duyệt;
- hiển thị nguồn bấm được;
- nội dung AI được xác định rõ là thông tin tham khảo, không phải tư vấn chuyên môn;
- yêu cầu người dùng đồng ý trước lần tra cứu đầu tiên và không nhập dữ liệu mật/nhạy cảm;
- cập nhật Chính sách bảo mật và Điều khoản sử dụng.

## 3. Cấu hình bắt buộc trước khi kích hoạt

Tại Supabase Dashboard → Edge Functions → Secrets, thêm:

```text
GEMINI_API_KEY=<Google AI Studio API Key>
GEMINI_MODEL=gemini-2.5-flash-lite
FACS_ASSISTANT_ALLOWED_ORIGINS=https://facs.vn,https://www.facs.vn,https://facs-production-website.vercel.app
FACS_ASSISTANT_ALLOWED_DOMAINS=facs.vn,chinhphu.vn,vbpl.vn,moj.gov.vn,mof.gov.vn,gdt.gov.vn,customs.gov.vn,baohiemxahoi.gov.vn,dangkykinhdoanh.gov.vn,sbv.gov.vn,moit.gov.vn
```

Không đưa `GEMINI_API_KEY` vào `.env`, source code, GitHub hoặc biến `VITE_*`.

## 4. Thứ tự triển khai

1. Xác nhận migration v20.5 đã được áp dụng vì trợ lý dùng chung hàm giới hạn tần suất `check_form_submission_rate_limit`.
2. Thêm các Supabase Edge Function Secrets nêu trên.
3. Deploy Edge Function:

   ```bash
   supabase functions deploy website-assistant
   ```

4. Kiểm tra Edge Function hoạt động trên môi trường preview.
5. Deploy source website lên Vercel.
6. Kiểm tra tối thiểu:

   - mở/đóng widget trên desktop và mobile;
   - đổi ngôn ngữ Việt/Anh;
   - hỏi về dịch vụ FACS;
   - hỏi một vấn đề thuế/pháp lý cần nguồn chính thức;
   - kiểm tra mọi nguồn mở đúng trang;
   - gửi biểu mẫu “Nhắn FACS”;
   - xác nhận inquiry xuất hiện tại `/admin/inquiries`;
   - xác nhận email nội bộ và email xác nhận được gửi;
   - xác nhận widget không xuất hiện tại `/admin`.

## 5. Vận hành chi phí

- Model mặc định: `gemini-2.5-flash-lite`, có Free Tier và phù hợp tác vụ có lưu lượng;
- mỗi câu hỏi bắt buộc thực hiện web search để có nguồn;
- giới hạn phản hồi 700 output tokens;
- Free Tier có giới hạn tốc độ và số lượt; cần theo dõi quota trong Google AI Studio trước khi mở production.

## 6. Tắt nhanh hoặc hoàn nguyên

- Tắt riêng AI nhưng vẫn giữ widget liên hệ: xóa hoặc vô hiệu hóa `GEMINI_API_KEY`; tab AI sẽ hướng người dùng sang “Nhắn FACS”.
- Gỡ toàn bộ widget: bỏ `<FacsAssistant />` và import tương ứng trong `src/App.jsx`.
- Không cần rollback database vì v20.6 không tạo thêm bảng hoặc thay đổi dữ liệu hiện hữu.
