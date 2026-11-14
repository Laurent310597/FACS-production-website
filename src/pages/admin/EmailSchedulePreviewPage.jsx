import { useRef, useState } from "react";
import InsightScheduledWorkflow from "../../components/admin/InsightScheduledWorkflow";
import { formatVietnamDateTime } from "../../lib/publication";

const contacts = [
  {
    id: "demo-1",
    email: "khachhang.a@example.com",
    display_name: "Khách hàng A",
  },
  {
    id: "demo-2",
    email: "khachhang.b@example.com",
    display_name: "Khách hàng B",
  },
  {
    id: "demo-3",
    email: "khachhang.c@example.com",
    display_name: "Khách hàng C",
  },
];

export default function EmailSchedulePreviewPage() {
  const [post, setPost] = useState(() => ({
    id: "demo-post",
    title_vi: "FACS Insights — Bài viết hẹn đăng để thử quy trình",
    status: "published",
    published_at: new Date(Date.now() + 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    email_delivery_mode: "review_after_publish",
  }));
  const [schedule, setSchedule] = useState(null);
  const saved = useRef(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [testReady, setTestReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [revision, setRevision] = useState(0);

  async function invoke(action, body) {
    if (action === "prepare_schedule") {
      const selected = selectedIds.length
        ? contacts.filter((contact) => selectedIds.includes(contact.id))
        : contacts;
      return {
        post,
        request_id: crypto.randomUUID(),
        scheduled_at: post.published_at,
        preview_hash: "demo-reviewed-content",
        contacts: selected,
        bcc: selected.map((contact) => contact.email),
      };
    }
    if (action === "confirm_schedule") {
      if (!previewReady || !testReady)
        throw new Error("Hãy xem trước và gửi thử trước khi xác nhận.");
      saved.current = {
        id: body.request_id,
        status: "scheduled",
        scheduled_at: body.scheduled_at,
        bcc_addresses: body.expected_bcc,
      };
      setMessage(
        "Mô phỏng đã lưu lịch. Bạn có thể thử huỷ lịch hoặc thay đổi giờ đăng.",
      );
      return { schedule: saved.current };
    }
    if (action === "cancel_schedule") {
      saved.current = { ...saved.current, status: "cancelled" };
      setMessage("Mô phỏng đã huỷ lịch gửi.");
      return { ok: true };
    }
    throw new Error("Thao tác chưa được hỗ trợ trong bản mô phỏng.");
  }

  function changePost(change) {
    setPost((current) => ({
      ...current,
      ...change,
      updated_at: new Date().toISOString(),
    }));
    setPreviewReady(false);
    setTestReady(false);
    if (saved.current?.status === "scheduled") {
      saved.current = {
        ...saved.current,
        status: "invalidated",
        error_message:
          "Nội dung hoặc giờ đăng đã thay đổi. Hãy kiểm thử và xác nhận lịch lại.",
      };
      setSchedule(saved.current);
    }
    setRevision((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-[#081321] px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-200">
          FACS · Preview
        </p>
        <h1 className="mt-3 text-4xl font-bold">Email & Audience</h1>
        <div className="mt-5 rounded-2xl border border-amber-200/30 bg-amber-100/5 p-4 text-sm leading-relaxed text-amber-100">
          Bản xem thử tương tác dùng dữ liệu mẫu. Các thao tác gửi thử, hẹn gửi
          và đến giờ gửi đều được mô phỏng. Kết nối cơ sở dữ liệu preview đang
          cần khôi phục để kiểm thử gửi tự động trên máy chủ.
        </div>
        {message && (
          <p
            role="status"
            className="mt-4 rounded-xl bg-cyan-300/10 p-3 text-cyan-100"
          >
            {message}
          </p>
        )}
        <section className="mt-6 rounded-[28px] border border-white/15 bg-white/[0.035] p-5 sm:p-7">
          <h2 className="text-xl font-bold">Quy trình gửi bài Insights</h2>
          <div className="mt-4 grid gap-4 rounded-2xl bg-[#081321] p-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="text-sm text-slate-400">Bài viết</p>
              <p className="mt-1 font-semibold">{post.title_vi}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Thời gian đăng bài</p>
              <p className="mt-1 text-cyan-100">
                {formatVietnamDateTime(post.published_at)} (UTC+7)
              </p>
            </div>
          </div>
          <InsightScheduledWorkflow
            key={`${post.id}-${revision}`}
            post={post}
            schedule={schedule}
            previewReady={previewReady}
            testReady={testReady}
            onPreview={() => {
              setPreviewOpen(true);
              setPreviewReady(true);
            }}
            onTest={() => {
              setTestReady(true);
              setMessage(
                "Đã mô phỏng gửi bản thử đến tunguyen@facs.vn. Bạn có thể xác nhận lịch gửi.",
              );
            }}
            onChanged={() => setSchedule(saved.current)}
            selectedIds={selectedIds}
            invoke={invoke}
          />
        </section>
        <section className="mt-6 rounded-[28px] border border-white/15 bg-white/[0.035] p-5 sm:p-7">
          <h2 className="text-xl font-bold">Audience mẫu</h2>
          <p className="mt-2 text-sm text-slate-300">
            Tick chọn để thử gửi một nhóm khách. Bỏ chọn tất cả để dùng toàn bộ
            danh sách.
          </p>
          <div className="mt-4 divide-y divide-white/10">
            {contacts.map((contact) => (
              <label
                key={contact.id}
                className="flex cursor-pointer items-center gap-3 py-4"
              >
                <input
                  type="checkbox"
                  disabled={schedule?.status === "scheduled"}
                  checked={selectedIds.includes(contact.id)}
                  onChange={(event) =>
                    setSelectedIds((current) =>
                      event.target.checked
                        ? [...current, contact.id]
                        : current.filter((id) => id !== contact.id),
                    )
                  }
                  className="h-4 w-4 accent-cyan-300"
                />
                <span>
                  {contact.display_name}
                  <span className="mt-1 block text-sm text-slate-300">
                    {contact.email}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-white/10 p-5">
          <h2 className="font-semibold">Thử các tình huống</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-white/20 px-4 py-2"
              onClick={() =>
                changePost({
                  published_at: new Date(
                    Date.parse(post.published_at) + 3600000,
                  ).toISOString(),
                })
              }
            >
              Đổi giờ đăng +1 giờ
            </button>
            <button
              className="rounded-xl border border-white/20 px-4 py-2"
              onClick={() =>
                changePost({ title_vi: `${post.title_vi} (cập nhật)` })
              }
            >
              Sửa nội dung bài
            </button>
            <button
              className="rounded-xl border border-cyan-200/30 px-4 py-2 disabled:opacity-40"
              disabled={schedule?.status !== "scheduled"}
              onClick={() => {
                saved.current = { ...saved.current, status: "sent" };
                setSchedule(saved.current);
                setMessage(
                  "Đã mô phỏng đến giờ đăng và chuyển yêu cầu gửi email. Đây là kết quả mô phỏng giao diện.",
                );
              }}
            >
              Mô phỏng đến giờ gửi
            </button>
          </div>
        </section>
        {previewOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 p-5">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Xem trước email mẫu"
              className="w-full max-w-xl rounded-2xl bg-white p-8 text-[#12324d]"
            >
              <p className="text-sm">From: infor@facs.vn</p>
              <h2 className="mt-4 text-2xl font-bold">{post.title_vi}</h2>
              <p className="mt-5 text-justify leading-7">
                Kính gửi Quý Khách hàng, FACS trân trọng giới thiệu bài viết mới
                trên chuyên mục Insights. Đây là nội dung mẫu để Tú kiểm tra quy
                trình xem trước, gửi thử và xác nhận hẹn gửi email.
              </p>
              <button
                className="mt-6 rounded-xl bg-[#12324d] px-5 py-3 text-white"
                onClick={() => setPreviewOpen(false)}
              >
                Đóng xem trước
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
