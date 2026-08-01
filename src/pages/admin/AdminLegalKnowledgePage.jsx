import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BookOpenCheck, CheckCircle2, Clock3, ExternalLink, FileSearch, Loader2, Pencil, Plus, RotateCcw, Save, Search, ShieldCheck } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  title_vi: "",
  title_en: "",
  document_number: "",
  document_type: "",
  issuing_authority: "",
  jurisdiction: "Vietnam",
  topic: "",
  source_tier: "P1",
  source_url: "",
  legal_citation_allowed: false,
  status: "draft",
  issued_at: "",
  effective_from: "",
  effective_to: "",
  summary_vi: "",
  summary_en: "",
  citation_text: "",
  content_notes: "",
  tags: "",
  review_notes: "",
};

const statusLabels = {
  draft: "Nháp",
  reviewed: "Đã rà soát",
  approved: "Đã phê duyệt",
  expired: "Hết hiệu lực",
  archived: "Lưu trữ",
};

function fieldValue(value) {
  return value == null ? "" : String(value);
}

function rowToForm(row) {
  return {
    ...emptyForm,
    ...row,
    issued_at: fieldValue(row.issued_at),
    effective_from: fieldValue(row.effective_from),
    effective_to: fieldValue(row.effective_to),
    tags: Array.isArray(row.tags) ? row.tags.join(", ") : "",
  };
}

function StatusBadge({ status }) {
  const style = status === "approved"
    ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"
    : status === "reviewed"
    ? "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200"
    : status === "expired"
    ? "border-amber-300/20 bg-amber-300/[0.06] text-amber-200"
    : "border-white/10 bg-white/[0.035] text-slate-400";
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style}`}>{statusLabels[status] || status}</span>;
}

export default function AdminLegalKnowledgePage() {
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [versions, setVersions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState([]);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("legal_ai_documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (fetchError) setError(`Không thể tải kho tri thức: ${fetchError.message}`);
    else setDocuments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => ({
    total: documents.length,
    approved: documents.filter((item) => item.status === "approved").length,
    review: documents.filter((item) => ["draft", "reviewed"].includes(item.status)).length,
    expired: documents.filter((item) => item.status === "expired" || (item.effective_to && item.effective_to < new Date().toISOString().slice(0, 10))).length,
  }), [documents]);

  const visible = useMemo(() => filter === "all" ? documents : documents.filter((item) => item.status === filter), [documents, filter]);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
    setVersions([]);
    setError("");
    setMessage("");
  };

  const edit = async (document) => {
    setEditingId(document.id);
    setForm(rowToForm(document));
    setError("");
    setMessage("");
    const { data } = await supabase
      .from("legal_ai_document_versions")
      .select("id,version_number,snapshot,changed_at")
      .eq("document_id", document.id)
      .order("version_number", { ascending: false })
      .limit(8);
    setVersions(data || []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateApproval = () => {
    if (form.source_tier !== "P1") return "Chỉ nguồn P1 chính thức mới được phê duyệt làm căn cứ cho AI công khai.";
    if (!form.legal_citation_allowed) return "Cần xác nhận nguồn này được phép dùng làm căn cứ trích dẫn.";
    if (!form.source_url.trim().startsWith("https://")) return "Cần đường dẫn HTTPS đến nguồn chính thức.";
    if (!form.document_number.trim()) return "Cần số/ký hiệu văn bản.";
    if (!form.issuing_authority.trim()) return "Cần cơ quan ban hành.";
    if (form.citation_text.trim().length < 40) return "Cần tối thiểu 40 ký tự trích đoạn đã kiểm tra.";
    return "";
  };

  const save = async (event, approve = false) => {
    event?.preventDefault();
    setError("");
    setMessage("");
    if (!form.title_vi.trim()) return setError("Vui lòng nhập tiêu đề tiếng Việt.");
    if (form.source_url && !form.source_url.trim().startsWith("https://")) return setError("Đường dẫn nguồn phải bắt đầu bằng https://.");
    if (approve) {
      const approvalError = validateApproval();
      if (approvalError) return setError(approvalError);
    }

    setWorking(approve ? "approve" : "save");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const current = documents.find((item) => item.id === editingId);
    const nextStatus = approve
      ? "approved"
      : current?.status === "approved" || form.status === "approved"
      ? "reviewed"
      : form.status;
    const payload = {
      title_vi: form.title_vi.trim(),
      title_en: form.title_en.trim() || null,
      document_number: form.document_number.trim() || null,
      document_type: form.document_type.trim() || null,
      issuing_authority: form.issuing_authority.trim() || null,
      jurisdiction: form.jurisdiction.trim() || "Vietnam",
      topic: form.topic.trim() || null,
      source_tier: form.source_tier,
      source_url: form.source_url.trim() || null,
      legal_citation_allowed: Boolean(form.legal_citation_allowed),
      status: nextStatus,
      issued_at: form.issued_at || null,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      summary_vi: form.summary_vi.trim() || null,
      summary_en: form.summary_en.trim() || null,
      citation_text: form.citation_text.trim(),
      content_notes: form.content_notes.trim() || null,
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30),
      review_notes: form.review_notes.trim() || null,
      reviewed_by: ["reviewed", "approved"].includes(nextStatus) ? userId : null,
      reviewed_at: ["reviewed", "approved"].includes(nextStatus) ? new Date().toISOString() : null,
      updated_by: userId,
      ...(editingId ? {} : { created_by: userId }),
    };

    const result = editingId
      ? await supabase.from("legal_ai_documents").update(payload).eq("id", editingId).select("id").single()
      : await supabase.from("legal_ai_documents").insert(payload).select("id").single();
    if (result.error) {
      setError(`Không thể lưu tài liệu: ${result.error.message}`);
    } else {
      setMessage(approve
        ? "Đã phê duyệt nguồn P1 cho AI. Phiên bản phê duyệt đã được lưu vào lịch sử."
        : current?.status === "approved"
        ? "Đã lưu thay đổi và chuyển tài liệu về trạng thái Đã rà soát để phê duyệt lại."
        : "Đã lưu tài liệu vào kho tri thức.");
      await load();
      const saved = result.data?.id;
      if (saved) {
        const { data } = await supabase.from("legal_ai_documents").select("*").eq("id", saved).single();
        if (data) setForm(rowToForm(data));
        setEditingId(saved);
      }
    }
    setWorking("");
  };

  const archive = async (document) => {
    if (!window.confirm(`Lưu trữ “${document.title_vi}”? AI sẽ ngừng sử dụng tài liệu này.`)) return;
    setWorking(document.id);
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: updateError } = await supabase.from("legal_ai_documents").update({
      status: "archived",
      updated_by: sessionData.session?.user?.id || null,
    }).eq("id", document.id);
    if (updateError) setError(`Không thể lưu trữ: ${updateError.message}`);
    else {
      if (editingId === document.id) reset();
      await load();
    }
    setWorking("");
  };

  const testSearch = async () => {
    if (!testQuery.trim()) return;
    setWorking("test");
    setError("");
    const { data, error: searchError } = await supabase.rpc("search_legal_ai_documents", { p_query: testQuery.trim(), p_limit: 6 });
    if (searchError) setError(`Không thể kiểm tra truy xuất: ${searchError.message}`);
    else setTestResults(data || []);
    setWorking("");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/80">Controlled Legal Knowledge</div><h1 className="mt-3 text-3xl font-bold md:text-4xl">Kho tri thức cho AI pháp lý</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Kiểm tra, bổ sung và phê duyệt nguồn mà Groq AI được phép sử dụng. Chỉ tài liệu P1 ở trạng thái Đã phê duyệt mới được đưa vào câu trả lời công khai.</p></div>
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-300 px-5 py-3 font-bold text-[#101226]"><Plus size={18} />Tạo tài liệu mới</button>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] px-5 py-4 text-sm text-emerald-200">{message}</div>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Tổng tài liệu", counts.total, BookOpenCheck], ["Đã phê duyệt", counts.approved, CheckCircle2], ["Cần rà soát", counts.review, Clock3], ["Hết hiệu lực/cần kiểm tra", counts.expired, ShieldCheck]].map(([label, value, Icon]) => <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><Icon size={20} className="text-violet-300" /><div className="mt-4 text-3xl font-bold">{value}</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>)}
      </div>

      <form onSubmit={(event) => save(event, false)} className="mt-7 rounded-[30px] border border-violet-200/15 bg-violet-300/[0.035] p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{editingId ? "Chỉnh sửa tài liệu" : "Thêm nguồn pháp lý"}</h2><p className="mt-1 text-sm text-slate-500">Các thay đổi đều được lưu phiên bản để kiểm tra lại.</p></div>{editingId && <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"><RotateCcw size={15} />Đóng bản đang sửa</button>}</div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-300">Tiêu đề tiếng Việt *<input value={form.title_vi} onChange={(event) => update("title_vi", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Tiêu đề tiếng Anh<input value={form.title_en} onChange={(event) => update("title_en", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Số/ký hiệu văn bản<input value={form.document_number} onChange={(event) => update("document_number", event.target.value)} placeholder="Ví dụ: 109/2025/QH15" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Cơ quan ban hành<input value={form.issuing_authority} onChange={(event) => update("issuing_authority", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Loại văn bản<input value={form.document_type} onChange={(event) => update("document_type", event.target.value)} placeholder="Luật, Nghị định, Thông tư..." className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Chủ đề<input value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="Thuế TNCN, doanh nghiệp, lao động..." className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300 md:col-span-2">URL nguồn chính thức<input value={form.source_url} onChange={(event) => update("source_url", event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-semibold text-slate-300">Cấp nguồn<select value={form.source_tier} onChange={(event) => update("source_tier", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none"><option value="P1">P1 · Chính thức</option><option value="P2">P2 · Chuyên môn</option><option value="P3">P3 · Phát hiện</option></select></label>
          <label className="text-sm font-semibold text-slate-300">Trạng thái<select value={form.status} onChange={(event) => update("status", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none"><option value="draft">Nháp</option><option value="reviewed">Đã rà soát</option><option value="approved">Đã phê duyệt</option><option value="expired">Hết hiệu lực</option><option value="archived">Lưu trữ</option></select></label>
          <label className="text-sm font-semibold text-slate-300">Ngày ban hành<input type="date" value={form.issued_at} onChange={(event) => update("issued_at", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none" /></label>
          <label className="text-sm font-semibold text-slate-300">Hiệu lực từ<input type="date" value={form.effective_from} onChange={(event) => update("effective_from", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none" /></label>
          <label className="text-sm font-semibold text-slate-300">Hiệu lực đến<input type="date" value={form.effective_to} onChange={(event) => update("effective_to", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none" /></label>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200/15 bg-amber-200/[0.035] p-4 text-sm leading-relaxed text-slate-300"><input type="checkbox" checked={form.legal_citation_allowed} onChange={(event) => update("legal_citation_allowed", event.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-300" /><span><strong className="text-amber-100">Cho phép dùng làm căn cứ trích dẫn.</strong> Chỉ đánh dấu sau khi đã đối chiếu đúng nguồn chính thức, số văn bản, điều khoản và tình trạng hiệu lực.</span></label>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-300">Tóm tắt tiếng Việt<textarea rows="4" value={form.summary_vi} onChange={(event) => update("summary_vi", event.target.value)} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Tóm tắt tiếng Anh<textarea rows="4" value={form.summary_en} onChange={(event) => update("summary_en", event.target.value)} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300 md:col-span-2">Trích đoạn/điều khoản đã kiểm tra *<textarea rows="10" value={form.citation_text} onChange={(event) => update("citation_text", event.target.value)} placeholder="Dán đúng phần nội dung đã đối chiếu từ nguồn chính thức. Đây là phần Groq AI được phép đọc để trả lời." className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300 md:col-span-2">Ghi chú nội bộ<textarea rows="4" value={form.content_notes} onChange={(event) => update("content_notes", event.target.value)} className="mt-2 w-full resize-y rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Tags, phân cách bằng dấu phẩy<input value={form.tags} onChange={(event) => update("tags", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
          <label className="text-sm font-semibold text-slate-300">Ghi chú rà soát<input value={form.review_notes} onChange={(event) => update("review_notes", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-violet-300/40" /></label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3"><button type="submit" disabled={Boolean(working)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 font-semibold text-white disabled:opacity-50">{working === "save" ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Lưu & chờ kiểm tra</button><button type="button" disabled={Boolean(working)} onClick={(event) => save(event, true)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 font-bold text-[#071a18] disabled:opacity-50">{working === "approve" ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}Lưu & phê duyệt P1</button></div>

        {versions.length > 0 && <div className="mt-6 border-t border-white/10 pt-5"><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Lịch sử phiên bản</h3><div className="mt-3 flex flex-wrap gap-2">{versions.map((version) => <span key={version.id} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-400">v{version.version_number} · {new Date(version.changed_at).toLocaleString("vi-VN")} · {statusLabels[version.snapshot?.status] || version.snapshot?.status}</span>)}</div></div>}
      </form>

      <section className="mt-7 rounded-[30px] border border-cyan-200/15 bg-cyan-300/[0.03] p-5 md:p-7">
        <div className="flex items-start gap-3"><FileSearch size={22} className="mt-0.5 text-cyan-300" /><div><h2 className="text-xl font-bold">Kiểm tra AI sẽ tìm thấy nguồn nào</h2><p className="mt-1 text-sm text-slate-500">Chức năng này chỉ tìm trong các tài liệu P1 đã phê duyệt; kết quả không gọi Groq và không tiêu tốn token.</p></div></div>
        <div className="mt-5 flex gap-2"><input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); testSearch(); } }} placeholder="Ví dụ: thuế TNCN cá nhân không cư trú" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-cyan-300/40" /><button type="button" onClick={testSearch} disabled={working === "test" || !testQuery.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] disabled:opacity-50">{working === "test" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Kiểm tra</button></div>
        {testResults.length > 0 && <div className="mt-5 grid gap-3">{testResults.map((result) => <div key={result.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-white">{result.title_vi}</h3><p className="mt-1 text-xs text-slate-500">{[result.document_number, result.issuing_authority].filter(Boolean).join(" · ")} · Điểm khớp {result.relevance}</p></div><a href={result.source_url} target="_blank" rel="noreferrer" className="text-cyan-300"><ExternalLink size={16} /></a></div></div>)}</div>}
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Danh mục tài liệu</h2><p className="mt-1 text-sm text-slate-500">Không xóa cứng; dùng Lưu trữ để bảo toàn dấu vết kiểm soát.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm outline-none"><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="mt-5 grid gap-4">
          {loading ? <div className="flex items-center gap-3 text-slate-400"><Loader2 size={18} className="animate-spin" />Đang tải...</div> : visible.length === 0 ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-slate-500">Chưa có tài liệu trong nhóm này.</div> : visible.map((document) => <article key={document.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={document.status} /><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-500">{document.source_tier}</span>{document.legal_citation_allowed && <span className="rounded-full border border-violet-300/15 px-2.5 py-1 text-[11px] text-violet-200">Cho phép trích dẫn</span>}</div><h3 className="mt-3 text-lg font-bold text-white">{document.title_vi}</h3><p className="mt-1 text-sm text-slate-500">{[document.document_number, document.issuing_authority, document.topic].filter(Boolean).join(" · ")}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => edit(document)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/15 px-4 py-2 text-sm font-semibold text-cyan-100"><Pencil size={15} />Kiểm tra/sửa</button>{document.source_url && <a href={document.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300"><ExternalLink size={15} />Nguồn</a>}<button type="button" disabled={working === document.id || document.status === "archived"} onClick={() => archive(document)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200/15 px-4 py-2 text-sm text-amber-100 disabled:opacity-40"><Archive size={15} />Lưu trữ</button></div></div></article>)}
        </div>
      </section>
    </AdminLayout>
  );
}
