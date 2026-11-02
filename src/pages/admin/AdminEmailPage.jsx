import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import {
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserMinus,
  UserRoundCheck,
  X,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import EmailPagination from "../../components/admin/EmailPagination";
import EmailSendHistory from "../../components/admin/EmailSendHistory";
import { canSelectContact, loadEmailAudience } from "../../lib/emailAudience";
import InsightSingleSendDialog from "../../components/admin/InsightSingleSendDialog";
import { emailReviewState, workflowTime } from "../../lib/insightEmailWorkflow";
import InsightPostPicker from "../../components/admin/InsightPostPicker";
import { emailStatusLabels, invokeInsightEmail } from "../../lib/emailNotifications";
import { supabase } from "../../lib/supabaseClient";

const emptyContact = {
  email: "",
  display_name: "",
  company_name: "",
  language: "both",
  consent_source: "Existing client relationship",
  notes: "",
};

const deliveryModeLabels = {
  disabled: "Không gửi email",
  review_after_publish: "Gửi sau khi kiểm duyệt",
  manual_later: "Gửi thủ công sau",
};

function postTitle(post) {
  return post?.title_vi || post?.title_en || "Bài viết chưa có tiêu đề";
}

function normalizeEmail(value = "") {
  return value.trim().toLowerCase();
}

function isValidEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function csvEscape(value = "") {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function toImportRecords(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((value) => value.toLowerCase().replace(/\s+/g, "_"));
  const hasHeader = header.some((value) => ["email", "e-mail", "mail"].includes(value));
  const body = hasHeader ? rows.slice(1) : rows;
  const emailIndex = hasHeader ? header.findIndex((value) => ["email", "e-mail", "mail"].includes(value)) : 0;
  const nameIndex = hasHeader ? header.findIndex((value) => ["name", "display_name", "customer_name"].includes(value)) : 1;
  const companyIndex = hasHeader ? header.findIndex((value) => ["company", "company_name"].includes(value)) : 2;

  return body
    .map((columns) => ({
      email: normalizeEmail(columns[emailIndex] || ""),
      display_name: nameIndex >= 0 ? columns[nameIndex] || null : null,
      company_name: companyIndex >= 0 ? columns[companyIndex] || null : null,
      language: "both",
      status: "subscribed",
      consent_source: "CSV import",
      consent_at: new Date().toISOString(),
    }))
    .filter((record) => isValidEmail(record.email));
}

export default function AdminEmailPage() {
  const [searchParams] = useSearchParams();
  const [connection, setConnection] = useState({ connected: false, loading: true });
  const [audience, setAudience] = useState([]);
  const [audiencePage, setAudiencePage] = useState(0);
  const [audiencePageSize, setAudiencePageSize] = useState(10);
  const [selectedContactIds, setSelectedContactIds] = useState(() => new Set());
  const [selectedPost, setSelectedPost] = useState(null);
  const [postPickerOpen, setPostPickerOpen] = useState(false);
  const [postRefresh, setPostRefresh] = useState(0);
  const [selectedPostId, setSelectedPostId] = useState(() => searchParams.get("post_id") || "");
  const [preview, setPreview] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [sendRequestId, setSendRequestId] = useState("");
  const [singlePreview, setSinglePreview] = useState(null);
  const [workflowNow, setWorkflowNow] = useState(() => new Date());
  const serverClock = useRef(null);
  const syncWorkflow = useCallback((data) => {
    const serverMs = Date.parse(data?.server_now || "");
    if (Number.isFinite(serverMs)) {
      serverClock.current = { serverMs, monotonicMs: performance.now() };
      setWorkflowNow(new Date(serverMs));
    }
    if (data?.post) setSelectedPost(data.post);
  }, []);
  const [workflowBusy, setWorkflowBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(emptyContact);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadConnection = async () => {
    try {
      const data = await invokeInsightEmail("oauth_status");
      setConnection({ ...data, loading: false });
    } catch (connectionError) {
      setConnection({ connected: false, loading: false, error: connectionError.message });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      setAudience(await loadEmailAudience(supabase));
    } catch (issue) { setError(issue.message); }
    setPostRefresh((current) => current + 1);
    setLoading(false);
  };

  const testMailbox = async () => {
    setTesting(true);
    setMessage("");
    setError("");
    try {
      await invokeInsightEmail("test");
      setMessage("Đã gửi email thử từ infor@facs.vn đến tunguyen@facs.vn. Hãy kiểm tra địa chỉ From trong Outlook.");
      await loadData();
    } catch (testError) {
      setError(testError.message);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      const [connectionResult, contactsResult] = await Promise.allSettled([
        invokeInsightEmail("oauth_status"),
        loadEmailAudience(supabase),
      ]);
      if (cancelled) return;

      if (connectionResult.status === "fulfilled") {
        setConnection({ ...connectionResult.value, loading: false });
      } else {
        setConnection({ connected: false, loading: false, error: connectionResult.reason?.message || "Không thể kiểm tra Microsoft 365." });
      }

      if (contactsResult.status === "fulfilled") {
        setAudience(contactsResult.value || []);
      } else {
        const reason = contactsResult.reason?.message;
        setError(reason || "Không thể tải audience.");
      }

      setLoading(false);
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedPostId) return;
    let cancelled = false;
    const loadSelectedPost = async () => {
      try {
        const data = await invokeInsightEmail("workflow_status", { post_id: selectedPostId });
        if (!cancelled) syncWorkflow(data);
      } catch (postError) {
        if (cancelled) return;
        setSelectedPost(null);
        setPreview(null);
        setError(postError.message || "Không thể tải bài viết. Vui lòng chọn lại.");
      }
    };
    loadSelectedPost();
    return () => { cancelled = true; };
  }, [selectedPostId, postRefresh, syncWorkflow]);

  const choosePost = (post) => {
    if (post.id !== selectedPostId) {
      setPreview(null);
      setConfirmationOpen(false);
      setSinglePreview(null);
      setConfirmationText("");
      setMessage("");
      setError("");
    }
    setSelectedPostId(post.id);
    setSelectedPost(post);
    setPostPickerOpen(false);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (serverClock.current) setWorkflowNow(new Date(workflowTime(serverClock.current, performance.now())));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredAudience = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return audience.filter((contact) => {
      const matchesStatus = status === "all" || contact.status === status;
      const haystack = `${contact.email || ""} ${contact.display_name || ""} ${contact.company_name || ""}`.toLowerCase();
      return matchesStatus && (!normalized || haystack.includes(normalized));
    });
  }, [audience, query, status]);

  const subscribedCount = audience.filter(canSelectContact).length;
  const currentAudiencePage = Math.min(audiencePage, Math.max(0, Math.ceil(filteredAudience.length / audiencePageSize) - 1));
  const pageAudience = filteredAudience.slice(currentAudiencePage * audiencePageSize, (currentAudiencePage + 1) * audiencePageSize);
  const selectedContacts = audience.filter((contact) => selectedContactIds.has(contact.id) && canSelectContact(contact));
  const eligiblePage = pageAudience.filter(canSelectContact);
  const pageChecked = eligiblePage.length > 0 && eligiblePage.every((contact) => selectedContactIds.has(contact.id));
  const pagePartlyChecked = !pageChecked && eligiblePage.some((contact) => selectedContactIds.has(contact.id));
  const toggleContacts = (contacts, checked) => setSelectedContactIds((current) => {
    const next = new Set(current);
    contacts.filter(canSelectContact).forEach((contact) => checked ? next.add(contact.id) : next.delete(contact.id));
    return next;
  });
  const { previewReady, testReady, isPublic: selectedPostIsPublic } = emailReviewState(selectedPost, preview, workflowNow.getTime());
  const sending = selectedPost?.email_notification_status === "processing";
  const closeSinglePreview = useCallback(() => {
    if (workflowBusy !== "single" && workflowBusy !== "selected") setSinglePreview(null);
  }, [workflowBusy]);

  const openAudienceConfirmation = () => {
    setConfirmationText("");
    setSendRequestId(crypto.randomUUID());
    setConfirmationOpen(true);
  };

  const previewSingleContact = async (contact) => {
    if (!selectedPostId || workflowBusy) return;
    setWorkflowBusy("preview-single");
    setError("");
    setMessage("");
    try {
      const data = await invokeInsightEmail("preview_single", { post_id: selectedPostId, audience_id: contact.id });
      setSinglePreview({ ...data, request_id: crypto.randomUUID() });
    } catch (singleError) {
      setError(singleError.message);
    } finally {
      setWorkflowBusy("");
    }
  };

  const previewSelectedContacts = async () => {
    if (!selectedPostId || !selectedContacts.length || workflowBusy) return;
    setWorkflowBusy("preview-selected"); setError(""); setMessage("");
    try {
      const data = await invokeInsightEmail("preview_selected", { post_id: selectedPostId, audience_ids: selectedContacts.map((contact) => contact.id) });
      setSinglePreview({ ...data, scope: "selected", request_id: crypto.randomUUID() });
    } catch (issue) { setError(issue.message); }
    finally { setWorkflowBusy(""); }
  };

  const sendSingleContact = async () => {
    if (!singlePreview || workflowBusy) return;
    const selected = singlePreview.scope === "selected";
    setWorkflowBusy(selected ? "selected" : "single");
    setError("");
    try {
      const data = await invokeInsightEmail(selected ? "confirm_selected" : "confirm_single", {
        post_id: singlePreview.post_id,
        ...(selected ? { audience_ids: singlePreview.contacts.map((contact) => contact.id), expected_bcc: singlePreview.recipients.bcc } : { audience_id: singlePreview.contact.id }),
        preview_hash: singlePreview.preview_hash, request_id: singlePreview.request_id,
        confirmation_text: selected ? "SEND-SELECTED" : "SEND-SINGLE",
      });
      setMessage(selected
        ? `Microsoft 365 đã tiếp nhận yêu cầu gửi tới ${data.recipients?.bcc_count || 0} khách hàng đã chọn trong Bcc. Chưa xác nhận giao thư đến từng hộp thư.`
        : `Microsoft 365 đã tiếp nhận yêu cầu gửi riêng tới ${singlePreview.contact.email} trong Bcc. Chưa xác nhận thư đã đến hộp thư người nhận.`);
      if (selected) setSelectedContactIds(new Set());
      setSinglePreview(null);
      await loadData();
    } catch (singleError) {
      setError(singleError.message);
    } finally {
      setWorkflowBusy("");
    }
  };

  const previewSelectedPost = async () => {
    if (!selectedPostId) return;
    setWorkflowBusy("preview");
    setError("");
    setMessage("");
    try {
      const data = await invokeInsightEmail("preview", { post_id: selectedPostId });
      setPreview(data);
      syncWorkflow(data);
      setPreviewOpen(true);
      await loadData();
    } catch (previewError) {
      setError(previewError.message);
    } finally {
      setWorkflowBusy("");
    }
  };

  const testSelectedPost = async () => {
    if (!selectedPostId || !previewReady) return;
    setWorkflowBusy("test");
    setError("");
    setMessage("");
    try {
      const data = await invokeInsightEmail("test", { post_id: selectedPostId });
      syncWorkflow(data);
      setMessage("Đã gửi bản thử đến tunguyen@facs.vn. Audience chưa nhận email.");
      await loadData();
    } catch (testError) {
      setError(testError.message);
    } finally {
      setWorkflowBusy("");
    }
  };

  const confirmAudienceSend = async () => {
    if (!selectedPostId || confirmationText !== "SEND-AUDIENCE") return;
    setWorkflowBusy("confirm");
    setError("");
    setMessage("");
    try {
      const data = await invokeInsightEmail("confirm_send", {
        post_id: selectedPostId,
        confirmation_text: confirmationText,
        request_id: sendRequestId,
      });
      setConfirmationOpen(false);
      setConfirmationText("");
      setPreview(null);
      setMessage(`Microsoft 365 đã tiếp nhận yêu cầu gửi tới ${data.recipients?.bcc_count || 0} địa chỉ Bcc. Chưa xác nhận giao thư đến từng hộp thư.`);
      await loadData();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setWorkflowBusy("");
    }
  };

  const addContact = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) {
      setError("Email khách hàng chưa hợp lệ.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("insight_email_audience").upsert({
      ...form,
      email,
      status: "subscribed",
      consent_at: new Date().toISOString(),
    }, { onConflict: "email" });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(emptyContact);
    setMessage("Đã thêm hoặc cập nhật người nhận.");
    loadData();
  };

  const setContactStatus = async (contact, nextStatus) => {
    const { error: updateError } = await supabase
      .from("insight_email_audience")
      .update({ status: nextStatus })
      .eq("id", contact.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setAudience((current) => current.map((item) => item.id === contact.id ? { ...item, status: nextStatus } : item));
    if (nextStatus !== "subscribed") setSelectedContactIds((current) => { const next = new Set(current); next.delete(contact.id); return next; });
  };

  const deleteContact = async (contact) => {
    if (!window.confirm(`Xóa ${contact.email} khỏi danh sách audience?`)) return;
    const { error: deleteError } = await supabase.from("insight_email_audience").delete().eq("id", contact.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setAudience((current) => current.filter((item) => item.id !== contact.id));
    setSelectedContactIds((current) => { const next = new Set(current); next.delete(contact.id); return next; });
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setMessage("");
    const text = await file.text();
    const records = toImportRecords(text);
    if (!records.length) {
      setError("Không tìm thấy email hợp lệ trong file CSV.");
      return;
    }
    const unique = Array.from(new Map(records.map((record) => [record.email, record])).values());
    setSaving(true);
    const { error: importError } = await supabase.from("insight_email_audience").upsert(unique, { onConflict: "email" });
    setSaving(false);
    if (importError) {
      setError(importError.message);
      return;
    }
    setMessage(`Đã nhập ${unique.length} địa chỉ email hợp lệ.`);
    loadData();
  };

  const exportCsv = () => {
    const header = ["email", "display_name", "company_name", "status", "language", "consent_source", "consent_at"];
    const body = audience.map((contact) => header.map((key) => csvEscape(contact[key] || "")).join(","));
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `facs-insight-audience-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Email automation</div>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Email & Audience</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Gửi từ infor@facs.vn; To cố định tunguyen@facs.vn; Cc cố định yendoan@facs.vn và thanhhuynh@facs.vn. Toàn bộ khách hàng chỉ xuất hiện tại Bcc.
        </p>
      </div>

      {(message || error) && (
        <div className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${error ? "border-red-300/20 bg-red-400/8 text-red-200" : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200"}`}>
          {error || message}
        </div>
      )}

      <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Mail className="text-cyan-300" size={24} />
              <h2 className="text-xl font-semibold">Microsoft 365</h2>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              {connection.loading ? (
                <><Loader2 size={16} className="animate-spin text-slate-400" /> Đang kiểm tra...</>
              ) : connection.connected ? (
                <><CheckCircle2 size={17} className="text-emerald-300" /> <span className="text-emerald-200">Đã cấu hình gửi từ {connection.mailbox_email}</span></>
              ) : (
                <><XCircle size={17} className="text-amber-300" /> <span className="text-amber-200">Chưa cấu hình Microsoft Graph</span></>
              )}
            </div>
            {connection.error && <div className="mt-2 text-xs text-red-200">{connection.error}</div>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={loadConnection} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:text-white">
              <RefreshCw size={17} /> Kiểm tra lại
            </button>
            <button type="button" disabled={!connection.connected || testing} onClick={testMailbox} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">
              {testing ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Gửi thử
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[28px] border border-cyan-200/15 bg-cyan-300/[0.035] p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-cyan-300" size={24} />
              <h2 className="text-xl font-semibold">Quy trình gửi bài Insights</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
              Audience chỉ nhận email sau đủ ba bước: xem trước nội dung, gửi thử nội bộ và xác nhận gửi cuối cùng.
            </p>
          </div>
          <button type="button" disabled={Boolean(workflowBusy)} onClick={() => setPostPickerOpen(true)} aria-haspopup="dialog"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-[#081321] px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/60 disabled:opacity-40">
            <Search size={18} /> Tìm và chọn bài viết
          </button>
        </div>

        {selectedPost ? (
          <div className="mt-6">
            <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#081321]/60 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div><div className="text-xs text-slate-500">Bài viết</div><div className="mt-1 truncate font-semibold">{postTitle(selectedPost)}</div></div>
              <div><div className="text-xs text-slate-500">Phương thức</div><div className="mt-1 font-semibold text-cyan-100">{deliveryModeLabels[selectedPost.email_delivery_mode] || "Chưa cấu hình"}</div></div>
              <div><div className="text-xs text-slate-500">Trạng thái email</div><div className="mt-1 font-semibold">{emailStatusLabels[selectedPost.email_notification_status] || "Chưa cấu hình"}</div></div>
              <div><div className="text-xs text-slate-500">Audience Bcc hiện tại</div><div className="mt-1 font-semibold">{subscribedCount} địa chỉ</div></div>
            </div>

            {selectedPost.email_notification_status === "sent" && (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/8 px-4 py-3 text-sm text-emerald-100">
                Bài viết đã có yêu cầu gửi được Microsoft 365 tiếp nhận. Tú có thể gửi lại toàn bộ Audience theo ba bước bên dưới, tick chọn một nhóm khách hàng để gửi, hoặc bấm biểu tượng email ở từng khách hàng để gửi riêng.
              </div>
            )}
            {selectedPost.email_delivery_mode === "disabled" ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/8 px-4 py-3 text-sm text-amber-100">
                Bài viết đang ở chế độ Không gửi email. Hãy thay đổi phương thức trong màn hình chỉnh sửa bài viết.
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className={`rounded-2xl border p-4 ${previewReady ? "border-emerald-300/25 bg-emerald-300/8" : "border-white/10 bg-[#081321]/45"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold">1. Xem trước email</span>{previewReady && <CheckCircle2 size={18} className="text-emerald-300" />}</div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-slate-500">Kiểm tra tiêu đề, nội dung song ngữ, link bài viết và số lượng người nhận.</p>
                  <button type="button" disabled={Boolean(workflowBusy) || sending} onClick={previewSelectedPost} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/25 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40">
                    {workflowBusy === "preview" ? <Loader2 size={17} className="animate-spin" /> : <Eye size={17} />} Xem trước
                  </button>
                </div>

                <div className={`rounded-2xl border p-4 ${testReady ? "border-emerald-300/25 bg-emerald-300/8" : "border-white/10 bg-[#081321]/45"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-semibold">2. Gửi thử nội bộ</span>{testReady && <CheckCircle2 size={18} className="text-emerald-300" />}</div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-slate-500">Chỉ gửi tới tunguyen@facs.vn; không Cc và không gửi khách hàng.</p>
                  <button type="button" disabled={!previewReady || Boolean(workflowBusy) || sending} onClick={testSelectedPost} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200/25 px-4 py-3 text-sm font-semibold text-violet-100 disabled:cursor-not-allowed disabled:opacity-35">
                    {workflowBusy === "test" ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Gửi thử
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#081321]/45 p-4">
                  <div className="font-semibold">3. Xác nhận Audience</div>
                  <p className="mt-2 min-h-10 text-xs leading-relaxed text-slate-500">{selectedContacts.length ? `Gửi ${selectedContacts.length} khách đã tick dưới dạng Bcc, với To/Cc nội bộ cố định.` : "Gửi From/To/Cc cố định và toàn bộ khách hàng subscribed dưới dạng Bcc."}</p>
                  <button type="button" disabled={!testReady || !previewReady || !selectedPostIsPublic || subscribedCount === 0 || selectedContacts.length > 497 || Boolean(workflowBusy) || sending} onClick={selectedContacts.length ? previewSelectedContacts : openAudienceConfirmation} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#071421] disabled:cursor-not-allowed disabled:opacity-35">
                    <ShieldCheck size={17} /> {selectedContacts.length ? `Xác nhận gửi ${selectedContacts.length} khách đã chọn` : selectedPost.email_notification_status === "sent" ? "Xác nhận gửi lại Audience" : "Xác nhận gửi Audience"}
                  </button>
                  {!selectedPostIsPublic && <p className="mt-2 text-xs leading-relaxed text-amber-200">Có thể xem trước và gửi thử ngay; xác nhận Audience chỉ mở sau khi bài viết công khai.</p>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 px-5 py-8 text-center text-sm text-slate-500">Chọn một bài viết để bắt đầu quy trình.</div>
        )}
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Danh sách khách hàng nhận Bcc</h2>
            <p className="mt-1 text-sm text-slate-500">{subscribedCount} địa chỉ đang được phép nhận email; tổng cộng {audience.length} bản ghi.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-cyan-100">
              <Upload size={17} /> Nhập CSV
              <input type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
            </label>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-200/30 hover:text-cyan-100">
              <Download size={17} /> Xuất CSV
            </button>
          </div>
        </div>

        <form onSubmit={addContact} className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-[#081321]/55 p-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="customer@example.com" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <input value={form.display_name} onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))} placeholder="Tên khách hàng" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <input value={form.company_name} onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))} placeholder="Công ty" className="rounded-xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/35" />
          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-[#071421] disabled:opacity-50">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />} Thêm
          </button>
        </form>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/35">
            <Search size={18} className="text-slate-500" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setAudiencePage(0); }} placeholder="Tìm email, tên hoặc công ty..." className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
          </label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setAudiencePage(0); }} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
            <option value="all">Tất cả</option>
            <option value="subscribed">Đang nhận</option>
            <option value="unsubscribed">Đã ngừng nhận</option>
          </select>
        </div>

        <p className="mt-3 text-xs text-slate-400">Đã chọn bài viết: <span className="font-semibold text-cyan-100">{selectedPost ? postTitle(selectedPost) : "Chưa chọn"}</span>. Bấm biểu tượng email ở từng dòng để xem và xác nhận gửi riêng.</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-200/15 bg-cyan-300/5 p-4">
        <div>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
            <input type="checkbox" aria-label="Chọn khách trên trang này" checked={pageChecked}
              ref={(node) => { if (node) node.indeterminate = pagePartlyChecked; }}
              disabled={!eligiblePage.length || Boolean(workflowBusy)} onChange={(event) => toggleContacts(eligiblePage, event.target.checked)}
              className="h-4 w-4 accent-cyan-300" /> Chọn trang này
          </label>
          <p className="mt-2 text-xs text-slate-400" aria-live="polite">Đã chọn {selectedContacts.length} khách trên tất cả các trang. Lựa chọn được giữ khi tìm kiếm hoặc chuyển trang.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={!selectedContacts.length || Boolean(workflowBusy)} onClick={() => setSelectedContactIds(new Set())}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 disabled:opacity-30">Bỏ chọn tất cả</button>
          <button type="button" onClick={previewSelectedContacts}
            disabled={!selectedContacts.length || selectedContacts.length > 497 || !testReady || !previewReady || !selectedPostIsPublic || selectedPost?.email_delivery_mode === "disabled" || sending || Boolean(workflowBusy)}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#071421] disabled:cursor-not-allowed disabled:opacity-35">
            <Mail size={17} /> Gửi {selectedContacts.length} khách đã chọn
          </button>
        </div>
        <p className="w-full text-xs text-slate-400">Chọn bài viết, hoàn tất xem trước và gửi thử ở trên, rồi tick khách cần gửi. Khách đã chọn sẽ nằm trong Bcc; To/Cc nội bộ giữ như quy trình Audience.</p>
        {selectedContacts.length > 497 && <p role="alert" className="text-xs text-amber-200">Mỗi lượt chọn tối đa 497 khách hàng.</p>}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-cyan-300" /></div>
          ) : filteredAudience.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Chưa có người nhận phù hợp.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {pageAudience.map((contact) => (
                <div key={contact.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 md:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1fr)_auto] md:items-center">
                  <input type="checkbox" aria-label={`Chọn ${contact.email}`} checked={canSelectContact(contact) && selectedContactIds.has(contact.id)}
                    disabled={!canSelectContact(contact) || Boolean(workflowBusy)} onChange={(event) => toggleContacts([contact], event.target.checked)}
                    className="h-4 w-4 accent-cyan-300 disabled:opacity-30" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{contact.email}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{contact.display_name || "Chưa có tên"}</div>
                  </div>
                  <div className="col-start-2 text-sm text-slate-400 md:col-start-auto">{contact.company_name || "—"}</div>
                  <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:justify-end">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contact.status === "subscribed" ? "bg-emerald-300/10 text-emerald-200" : "bg-amber-300/10 text-amber-200"}`}>
                      {contact.status === "subscribed" ? "Đang nhận" : "Đã ngừng nhận"}
                    </span>
                    <button type="button" onClick={() => previewSingleContact(contact)}
                      disabled={!selectedPostIsPublic || selectedPost?.email_delivery_mode === "disabled" || sending || contact.status !== "subscribed" || Boolean(workflowBusy)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/20 text-cyan-200 transition hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                      title={selectedPost ? `Gửi riêng bài viết cho ${contact.email}` : "Chọn bài viết trước khi gửi riêng"}
                      aria-label={`Gửi riêng cho ${contact.email}`}>
                      <Mail size={16} />
                    </button>
                    <button type="button" onClick={() => setContactStatus(contact, contact.status === "subscribed" ? "unsubscribed" : "subscribed")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-cyan-200" title={contact.status === "subscribed" ? "Ngừng gửi" : "Kích hoạt lại"}>
                      {contact.status === "subscribed" ? <UserMinus size={16} /> : <UserRoundCheck size={16} />}
                    </button>
                    <button type="button" onClick={() => deleteContact(contact)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-red-200" title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <EmailPagination count={filteredAudience.length} page={currentAudiencePage} pageSize={audiencePageSize}
          onPageChange={setAudiencePage} onPageSizeChange={(size) => { setAudiencePageSize(size); setAudiencePage(0); }} busy={loading} />
      </section>

      <EmailSendHistory refresh={postRefresh} />

      {postPickerOpen && <InsightPostPicker selectedId={selectedPostId} onSelect={choosePost} onClose={() => setPostPickerOpen(false)} />}

      {previewOpen && preview && (
        <div role="presentation" onClick={() => setPreviewOpen(false)} className="fixed inset-0 z-[130] flex items-center justify-center bg-[#020811]/90 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-label="Xem trước email Insights" onClick={(event) => event.stopPropagation()} className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[30px] border border-cyan-200/20 bg-[#0b1625] shadow-[0_40px_140px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-7">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Bản xem trước email</div>
                <div className="mt-2 break-words font-semibold text-white">{preview.subject}</div>
                <div className="mt-2 text-xs leading-relaxed text-slate-500">
                  From {preview.recipients?.sender} · To {preview.recipients?.to?.join(", ")} · Cc {preview.recipients?.cc?.join(", ")} · Bcc {preview.recipients?.bcc_count || 0}
                </div>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:text-white" aria-label="Đóng xem trước"><X size={19} /></button>
            </div>
            <iframe title="Nội dung email Insights" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"
              srcDoc={DOMPurify.sanitize(preview.body_html || "", { WHOLE_DOCUMENT: true, ADD_ATTR: ["target"] })}
              className="block h-[calc(90dvh-150px)] min-h-64 w-full border-0 bg-[#eef1f4]" />
          </section>
        </div>
      )}

      {singlePreview && <InsightSingleSendDialog preview={singlePreview} busy={workflowBusy === "single" || workflowBusy === "selected"}
        error={error} onClose={closeSinglePreview} onSend={sendSingleContact} />}

      {confirmationOpen && selectedPost && (
        <div role="presentation" onClick={() => { if (workflowBusy !== "confirm") setConfirmationOpen(false); }} className="fixed inset-0 z-[140] flex items-center justify-center bg-[#020811]/90 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-label="Xác nhận gửi Audience" onClick={(event) => event.stopPropagation()} className="w-full max-w-xl rounded-[28px] border border-red-200/20 bg-[#0b1625] p-6 shadow-[0_40px_140px_rgba(0,0,0,0.65)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">Xác nhận cuối cùng</div>
                <h2 className="mt-2 text-2xl font-bold">{selectedPost.email_notification_status === "sent" ? "Gửi lại bài viết đến Audience?" : "Gửi email đến Audience?"}</h2>
              </div>
              <button type="button" onClick={() => { if (workflowBusy !== "confirm") setConfirmationOpen(false); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400" aria-label="Đóng"><X size={19} /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-[#081321]/70 p-4 text-sm leading-relaxed text-slate-300">
              <div className="font-semibold text-white">{postTitle(selectedPost)}</div>
              <div className="mt-2">From: infor@facs.vn</div>
              <div>To: tunguyen@facs.vn</div>
              <div>Cc: yendoan@facs.vn, thanhhuynh@facs.vn</div>
              <div className="mt-2 font-semibold text-amber-100">Bcc: {subscribedCount} khách hàng subscribed</div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
            <label className="mt-5 block">
              <span className="mb-2 block text-sm text-slate-300">Nhập <strong className="text-white">SEND-AUDIENCE</strong> để xác nhận:</span>
              <input autoFocus value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 font-mono text-white outline-none focus:border-red-300/40" />
            </label>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { if (workflowBusy !== "confirm") setConfirmationOpen(false); }} className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-300">Hủy</button>
              <button type="button" disabled={confirmationText !== "SEND-AUDIENCE" || workflowBusy === "confirm"} onClick={confirmAudienceSend} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-300 px-4 py-3 font-bold text-[#210707] disabled:cursor-not-allowed disabled:opacity-35">
                {workflowBusy === "confirm" ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Gửi Audience
              </button>
            </div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
