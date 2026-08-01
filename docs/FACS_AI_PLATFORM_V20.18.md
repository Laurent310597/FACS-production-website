# FACS AI Platform v20.18

## Phạm vi

- Legal Calendar: Groq `openai/gpt-oss-120b` biên soạn bản nháp; quản trị viên vẫn phải kiểm tra và phê duyệt.
- Popup website: Groq trả lời từ kho nguồn FACS đã kiểm soát và tiếp tục chuyển yêu cầu sang biểu mẫu liên hệ hiện có.
- `/legal-ai`: trang tra cứu pháp lý cơ bản bằng cùng cơ chế truy xuất có kiểm soát.
- CMS: OpenAI `gpt-5.6-sol` hỗ trợ Tú ở chế độ chỉ đọc; không tự sửa, xuất bản, xóa hoặc gửi dữ liệu.
- `/admin/legal-knowledge`: kho tri thức pháp lý riêng có trạng thái, phiên bản và bước phê duyệt P1.

`openai/gpt-oss-120b` là tên mô hình open-weight do Groq phục vụ qua GroqCloud. Nó không phải ChatGPT và không sử dụng gói ChatGPT của người quản trị.

## Luồng dữ liệu công khai

1. Người dùng chấp nhận cảnh báo và gửi câu hỏi tối đa 1.500 ký tự.
2. Edge Function giới hạn tần suất và tìm từ khóa trong:
   - tài liệu P1 có trạng thái `approved` và được phép trích dẫn;
   - sự kiện Lịch pháp lý đã `published` và `verified`;
   - thông tin dịch vụ FACS cố định khi câu hỏi liên quan FACS.
3. Nếu không có nguồn phù hợp, hệ thống từ chối kết luận và không gọi Groq.
4. Nếu có nguồn, Groq nhận câu hỏi cùng gói nguồn giới hạn, trả JSON strict và bắt buộc dùng mã nguồn `[K1]`, `[C1]`.
5. Server loại kết luận không gắn được với nguồn được phép rồi mới trả về trình duyệt.
6. Nhật ký FACS chỉ lưu metadata kỹ thuật; không lưu câu hỏi hoặc câu trả lời thô.

Public Legal AI không tự tìm kiếm web. Văn bản mới chỉ được dùng sau khi FACS nhập, kiểm tra và phê duyệt.

## Quy trình bổ sung thư viện pháp lý

Tại `/admin/legal-knowledge`:

1. Tạo tài liệu và nhập số/ký hiệu, cơ quan ban hành, ngày hiệu lực và URL HTTPS chính thức.
2. Dán đúng trích đoạn/điều khoản đã đối chiếu; không dán hồ sơ khách hàng hoặc ghi chú mật.
3. Đặt nguồn `P1` và xác nhận được phép dùng làm căn cứ trích dẫn.
4. Lưu ở trạng thái nháp/đã rà soát để kiểm tra chéo.
5. Chỉ dùng nút **Lưu & phê duyệt P1** sau khi hoàn tất kiểm tra.
6. Chạy **Kiểm tra AI sẽ tìm thấy nguồn nào** trước khi thử câu hỏi công khai.

Mọi lần sửa đều tạo snapshot. Sửa một tài liệu đã phê duyệt bằng nút lưu thông thường sẽ tự hạ về `reviewed`; tài liệu chỉ được AI dùng lại sau khi phê duyệt lại. Không xóa cứng, dùng `archived` để giữ dấu vết.

## Biên dữ liệu của trợ lý CMS

- Chỉ quản trị viên Supabase đã đăng nhập mới gọi được Edge Function.
- Server gửi trạng thái và metadata vận hành gần đây cùng số liệu tổng hợp email; không gửi tên, email, số điện thoại, tin nhắn, CV hoặc hồ sơ khách hàng.
- OpenAI Responses API được gọi với `store: false` và mã nhận diện an toàn đã băm.
- Trợ lý chỉ đưa ra nhận xét, bản nháp và đề xuất. Mọi thay đổi CMS vẫn cần Tú thao tác/phê duyệt.
- API OpenAI được tính riêng với ChatGPT. Không dùng API key trong trình duyệt, Vercel hoặc Git.

## Biến môi trường phía server

Required for Groq features:

```text
GROQ_API_KEY
```

Required for the private CMS assistant:

```text
OPENAI_API_KEY
```

Optional:

```text
GROQ_LEGAL_CALENDAR_MODEL=openai/gpt-oss-120b
GROQ_PUBLIC_LEGAL_MODEL=openai/gpt-oss-120b
OPENAI_CMS_ASSISTANT_MODEL=gpt-5.6-sol
FACS_AI_ALLOWED_ORIGINS=https://facs.vn,https://www.facs.vn
```

Optional Legal Calendar fallback is deliberately isolated from the CMS budget:

```text
OPENAI_LEGAL_CALENDAR_API_KEY
OPENAI_LEGAL_CALENDAR_MODEL=gpt-5.6
```

## Triển khai

```powershell
npx supabase@latest db push
npx supabase@latest functions deploy legal-calendar-sync
npx supabase@latest functions deploy legal-ai-assistant
npx supabase@latest functions deploy cms-assistant
```

Trước khi triển khai, bật Zero Data Retention trong Groq Data Controls nếu tài khoản hỗ trợ cấu hình này. Với OpenAI, cấu hình project API và ngân sách riêng cho CMS.

## Kiểm thử Preview bắt buộc

- `/legal-ai`: câu hỏi không có nguồn phải được từ chối; câu hỏi có nguồn phải hiển thị link nguồn.
- Popup: tab AI và tab liên hệ hoạt động trên desktop/mobile.
- `/admin/legal-knowledge`: nháp không xuất hiện trong truy xuất; P1 đã phê duyệt có xuất hiện; sửa tài liệu đã duyệt phải hạ trạng thái.
- Một trang `/admin/*`: trợ lý OpenAI xuất hiện sau đăng nhập và nêu rõ chỉ đọc.
- Legal Calendar: quét khoảng ngày ngắn và xác nhận draft vẫn cần phê duyệt.
- `/privacy` và `/terms`: hiển thị điều khoản AI mới.

## Rollback

Frontend có thể rollback bằng deployment/commit trước v20.18. Migration chỉ bổ sung bảng và function; không thay đổi hoặc xóa dữ liệu cũ. Khi cần dừng ngay AI mà không rollback website, unset khóa tương ứng trong Supabase Secrets hoặc không deploy hai Edge Function trợ lý. Không xóa bảng kho tri thức nếu còn cần lịch sử kiểm soát.
