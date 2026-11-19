import { useState } from "react";
import { CalendarClock, CheckCircle2, Eye, Send, X } from "lucide-react";
import { formatVietnamDateTime } from "../../lib/publication";
import { invokeInsightEmail } from "../../lib/emailNotifications";

const button =
  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/25 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35";
const labels = {
  scheduled: "Đã xác nhận lịch gửi",
  processing: "Đang xử lý lượt gửi",
  sent: "Đã chuyển Microsoft 365",
  failed: "Gửi thất bại — cần kiểm tra",
  cancelled: "Đã huỷ lịch gửi",
  invalidated: "Lịch cần được xác nhận lại",
};

export default function InsightScheduledWorkflow({
  post,
  schedule,
  previewReady,
  testReady,
  busy,
  onPreview,
  onTest,
  onChanged,
  selectedIds = [],
  invoke = invokeInsightEmail,
}) {
  const [choice, setChoice] = useState("no");
  const [plan, setPlan] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const active =
    schedule && ["scheduled", "processing"].includes(schedule.status);
  const disabled = Boolean(busy || working || active);
  const when = formatVietnamDateTime(post.published_at);

  async function prepare() {
    setWorking(true);
    setError("");
    try {
      const result = await invoke("prepare_schedule", {
        post_id: post.id,
        audience_ids: selectedIds,
      });
      setPlan(result);
      setConfirmation("");
    } catch (issue) {
      setError(issue.message);
    } finally {
      setWorking(false);
    }
  }

  async function confirm() {
    setWorking(true);
    setError("");
    try {
      await invoke("confirm_schedule", {
        post_id: post.id,
        confirmation_text: confirmation,
        request_id: plan.request_id,
        preview_hash: plan.preview_hash,
        expected_updated_at: plan.post.updated_at,
        scheduled_at: plan.scheduled_at,
        audience_ids: plan.contacts.map((contact) => contact.id),
        expected_bcc: plan.bcc,
      });
      setPlan(null);
      await onChanged();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setWorking(false);
    }
  }

  async function cancel() {
    setWorking(true);
    setError("");
    try {
      await invoke("cancel_schedule", {
        post_id: post.id,
        schedule_id: schedule.id,
      });
      setChoice("no");
      await onChanged();
    } catch (issue) {
      setError(issue.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      {schedule && (
        <div
          role="status"
          className="rounded-2xl border border-cyan-200/25 bg-cyan-300/5 p-4 text-sm text-cyan-100"
        >
          <strong>{labels[schedule.status]}</strong>
          <p className="mt-2">
            {formatVietnamDateTime(schedule.scheduled_at)} · Giờ Việt Nam ·{" "}
            {schedule.bcc_addresses.length} người nhận đã xác nhận
          </p>
          {schedule.error_message && (
            <p className="mt-2 text-amber-100">{schedule.error_message}</p>
          )}
          {schedule.status === "scheduled" && (
            <button
              type="button"
              disabled={working}
              onClick={cancel}
              className="mt-3 rounded-xl border border-amber-200/30 px-4 py-2 text-amber-100 disabled:opacity-40"
            >
              Huỷ lịch gửi
            </button>
          )}
          {schedule.status === "processing" && (
            <p className="mt-2">
              Nếu trạng thái kéo dài, hãy đối chiếu nhật ký và Outlook trước khi
              tạo lượt gửi mới.
            </p>
          )}
        </div>
      )}
      {!active && (
        <fieldset className="rounded-2xl border border-white/10 bg-cms-2 p-4">
          <legend className="px-2 font-semibold text-white">
            Gửi email cùng thời điểm đăng bài?
          </legend>
          <p className="text-sm text-ink-2">
            Bài viết hẹn đăng lúc{" "}
            <strong className="text-cyan-100">{when}</strong> (giờ Việt Nam).
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="scheduled-email-choice"
                value="no"
                checked={choice === "no"}
                disabled={Boolean(busy || working)}
                onChange={() => setChoice("no")}
                className="accent-cyan-300"
              />
              Không — tôi sẽ gửi thủ công
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="scheduled-email-choice"
                value="yes"
                checked={choice === "yes"}
                disabled={Boolean(busy || working)}
                onChange={() => setChoice("yes")}
                className="accent-cyan-300"
              />
              Có — hẹn gửi cùng giờ đăng
            </label>
          </div>
        </fieldset>
      )}
      {!active && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Step title="1. Xem trước email" complete={previewReady}>
            <p className="mt-2 text-sm text-ink-2">
              Kiểm tra nội dung và đường dẫn bài viết.
            </p>
            <button
              type="button"
              className={button}
              disabled={disabled}
              onClick={onPreview}
            >
              <Eye size={17} />
              Xem trước
            </button>
          </Step>
          <Step title="2. Gửi thử nội bộ" complete={testReady}>
            <p className="mt-2 text-sm text-ink-2">
              Gửi bản thử đến tunguyen@facs.vn.
            </p>
            <button
              type="button"
              className={button}
              disabled={disabled || !previewReady}
              onClick={onTest}
            >
              <Send size={17} />
              Gửi thử
            </button>
          </Step>
          <Step
            title={
              choice === "yes"
                ? "3. Xác nhận lịch gửi"
                : "3. Xác nhận gửi Audience"
            }
          >
            <p className="mt-2 text-sm text-ink-2">
              {choice === "yes"
                ? `Gửi ${selectedIds.length ? `${selectedIds.length} khách đã chọn` : "toàn bộ Audience"} dưới dạng Bcc.`
                : "Tú có thể xác nhận gửi thủ công sau khi bài đã công khai."}
            </p>
            <button
              type="button"
              className={`${button} bg-cyan-300/[0.12] !text-cyan-100`}
              disabled={
                disabled || choice !== "yes" || !previewReady || !testReady
              }
              onClick={prepare}
            >
              <CalendarClock size={18} />
              {choice === "yes"
                ? `Xác nhận gửi Audience vào ${when}`
                : "Chờ bài viết công khai"}
            </button>
          </Step>
        </div>
      )}
      {!active && choice === "yes" && (
        <p className="text-sm leading-relaxed text-ink-2">
          Lịch gửi chỉ được lưu sau bước xác nhận cuối. Hệ thống xử lý từ giờ đã
          hẹn, thường trong vòng một phút. Danh sách người nhận được chốt khi
          xác nhận và loại người đã huỷ đăng ký khi gửi.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}
      {plan && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020811]/90 p-4 backdrop-blur-md">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận lịch gửi Audience"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[20px] border border-cyan-200/25 bg-cms-2 p-6 md:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold">Xác nhận lịch gửi Audience</h2>
              <button
                type="button"
                disabled={working}
                onClick={() => setPlan(null)}
                aria-label="Đóng xác nhận lịch"
              >
                <X size={22} />
              </button>
            </div>
            <p className="mt-4 font-semibold">
              {post.title_vi || post.title_en}
            </p>
            <p className="mt-3 font-semibold text-cyan-100">
              {formatVietnamDateTime(plan.scheduled_at)} · Giờ Việt Nam (UTC+7)
            </p>
            <div className="mt-4 rounded-2xl bg-cms-2 p-4 text-sm leading-7 text-ink-2">
              <p>From: infor@facs.vn</p>
              <p>To: tunguyen@facs.vn</p>
              <p>Cc: yendoan@facs.vn, thanhhuynh@facs.vn</p>
              <p className="font-semibold text-white">
                Bcc: {plan.bcc.length} khách hàng
              </p>
              <details>
                <summary className="cursor-pointer text-cyan-100">
                  Xem danh sách Bcc
                </summary>
                <ul className="max-h-36 overflow-y-auto">
                  {plan.bcc.map((email) => (
                    <li key={email}>{email}</li>
                  ))}
                </ul>
              </details>
            </div>
            <p className="mt-4 text-sm text-ink-2">
              Sau khi xác nhận, hệ thống sẽ tự gửi khi đến hạn. Sửa nội dung
              hoặc giờ đăng sẽ yêu cầu xác nhận lịch lại.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-red-200">
                {error}
              </p>
            )}
            <label className="mt-4 block text-sm">
              Nhập SCHEDULE-AUDIENCE để xác nhận
              <input
                autoFocus
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/20 bg-cms-2 p-3 text-white"
              />
            </label>
            <button
              type="button"
              className={`${button} bg-cyan-300/[0.12] !text-cyan-100`}
              disabled={working || confirmation !== "SCHEDULE-AUDIENCE"}
              onClick={confirm}
            >
              {working
                ? "Đang lưu lịch…"
                : `Xác nhận gửi cho Audience vào ${formatVietnamDateTime(plan.scheduled_at)}`}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function Step({ title, complete, children }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${complete ? "border-emerald-300/25 bg-emerald-300/5" : "border-white/10 bg-cms-2"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong>{title}</strong>
        {complete && <CheckCircle2 size={18} className="text-emerald-300" />}
      </div>
      {children}
    </div>
  );
}
