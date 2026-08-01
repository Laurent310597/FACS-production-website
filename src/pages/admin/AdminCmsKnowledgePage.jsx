import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, ExternalLink, FileText, Link2, Loader2, Search, ShieldCheck, Upload } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { ingestCmsKnowledge } from "../../lib/aiAssistants";
import { supabase } from "../../lib/supabaseClient";

const BUCKET = "cms-private-library";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv", "html", "htm", "json"];

function mimeFromExtension(extension) {
  const mimeTypes = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

function safeFileName(value) {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-180) || "document";
}

function statusStyle(status) {
  if (status === "active") return "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200";
  if (status === "error") return "border-red-300/20 bg-red-300/[0.06] text-red-200";
  if (status === "processing") return "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-200";
  return "border-white/10 bg-white/[0.035] text-slate-400";
}

const statusLabels = {
  active: "Sẵn sàng",
  processing: "Đang xử lý",
  error: "Lỗi trích xuất",
  archived: "Lưu trữ",
};

export default function AdminCmsKnowledgePage() {
  const [documents, setDocuments] = useState([]);
  const [urlForm, setUrlForm] = useState({ title: "", url: "", tags: "" });
  const [fileTitle, setFileTitle] = useState("");
  const [fileTags, setFileTags] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("active");
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState([]);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("cms_knowledge_documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (fetchError) setError(`Không thể tải thư viện riêng: ${fetchError.message}`);
    else setDocuments(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => ({
    active: documents.filter((item) => item.status === "active").length,
    url: documents.filter((item) => item.status === "active" && item.source_type === "url").length,
    file: documents.filter((item) => item.status === "active" && item.source_type === "file").length,
    error: documents.filter((item) => item.status === "error").length,
  }), [documents]);
  const visible = useMemo(() => filter === "all" ? documents : documents.filter((item) => item.status === filter), [documents, filter]);

  const tags = (value) => value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30);

  const ingestUrl = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!urlForm.url.trim().startsWith("https://")) return setError("URL phải bắt đầu bằng https://.");
    setWorking("url");
    try {
      const result = await ingestCmsKnowledge({
        action: "ingest_url",
        title: urlForm.title.trim(),
        url: urlForm.url.trim(),
        tags: tags(urlForm.tags),
      });
      setMessage(`Đã nhập “${result.title}” và lập chỉ mục ${result.chunks} đoạn cho ChatGPT CMS.`);
      setUrlForm({ title: "", url: "", tags: "" });
      await load();
    } catch (ingestError) {
      setError(ingestError.message || "Không thể nhập URL vào thư viện.");
    } finally {
      setWorking("");
    }
  };

  const ingestFile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedFile) return setError("Vui lòng chọn file cần upload.");
    const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) return setError(`Chưa hỗ trợ file .${extension || "unknown"}.`);
    if (selectedFile.size > MAX_FILE_BYTES) return setError("File vượt quá giới hạn 15 MB.");
    const mimeType = selectedFile.type || mimeFromExtension(extension);
    setWorking("file");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error("Vui lòng đăng nhập lại CMS.");
      const storagePath = `${userId}/${crypto.randomUUID()}-${safeFileName(selectedFile.name)}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, selectedFile, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) throw new Error(`Không thể upload file: ${uploadError.message}`);
      const result = await ingestCmsKnowledge({
        action: "ingest_file",
        title: fileTitle.trim(),
        storage_path: storagePath,
        file_name: selectedFile.name,
        mime_type: mimeType,
        tags: tags(fileTags),
      });
      setMessage(`Đã nhập “${result.title}” và lập chỉ mục ${result.chunks} đoạn cho ChatGPT CMS.`);
      setSelectedFile(null);
      setFileTitle("");
      setFileTags("");
      const input = document.getElementById("cms-knowledge-file");
      if (input) input.value = "";
      await load();
    } catch (ingestError) {
      setError(ingestError.message || "Không thể nhập file vào thư viện.");
    } finally {
      setWorking("");
    }
  };

  const openDocument = async (document) => {
    if (document.source_type === "url" && document.source_url) {
      window.open(document.source_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!document.storage_path) return;
    const { data, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(document.storage_path, 60);
    if (signedError || !data?.signedUrl) setError(`Không thể mở file riêng: ${signedError?.message || "không tạo được liên kết"}`);
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const archive = async (document) => {
    if (!window.confirm(`Lưu trữ “${document.title}”? ChatGPT CMS sẽ ngừng sử dụng tài liệu này.`)) return;
    setWorking(document.id);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: updateError } = await supabase.from("cms_knowledge_documents").update({
      status: "archived",
      updated_by: sessionData.session?.user?.id || null,
    }).eq("id", document.id);
    if (updateError) setError(`Không thể lưu trữ tài liệu: ${updateError.message}`);
    else await load();
    setWorking("");
  };

  const testSearch = async () => {
    if (!testQuery.trim()) return;
    setWorking("test");
    setError("");
    const { data, error: searchError } = await supabase.rpc("search_cms_knowledge", {
      p_query: testQuery.trim(),
      p_limit: 8,
    });
    if (searchError) setError(`Không thể kiểm tra truy xuất: ${searchError.message}`);
    else setTestResults(data || []);
    setWorking("");
  };

  return (
    <AdminLayout>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300/80">Private ChatGPT CMS Library</div>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">Thư viện riêng do Tú biên soạn</h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">Chỉ ChatGPT trong CMS được truy xuất URL và file tại đây. Nội dung không được chuyển sang GROQ công khai, không tự publish và không được dùng nếu tài liệu đã lưu trữ hoặc trích xuất lỗi.</p>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-5 py-4 text-sm text-emerald-100"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="mt-7 grid gap-4 sm:grid-cols-4">
        {[["Sẵn sàng", counts.active], ["URL", counts.url], ["File", counts.file], ["Cần xử lý lỗi", counts.error]].map(([label, value]) => <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold">{value}</div></div>)}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-2">
        <form onSubmit={ingestUrl} className="rounded-[28px] border border-violet-200/15 bg-white/[0.035] p-6">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><Link2 size={21} /></span><div><h2 className="text-xl font-bold">Thêm bằng URL</h2><p className="mt-1 text-sm text-slate-500">Hệ thống đọc nội dung HTTPS công khai và lưu phần văn bản trích xuất.</p></div></div>
          <div className="mt-5 grid gap-4"><label className="text-sm text-slate-400">Tên tài liệu (không bắt buộc)<input value={urlForm.title} onChange={(event) => setUrlForm((current) => ({ ...current, title: event.target.value }))} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-violet-300/40" /></label><label className="text-sm text-slate-400">URL HTTPS<input type="url" required value={urlForm.url} onChange={(event) => setUrlForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-violet-300/40" /></label><label className="text-sm text-slate-400">Tags<input value={urlForm.tags} onChange={(event) => setUrlForm((current) => ({ ...current, tags: event.target.value }))} placeholder="thuế, kế toán, nội bộ" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-violet-300/40" /></label></div>
          <button type="submit" disabled={working === "url"} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-300 px-5 py-3 font-bold text-[#111329] disabled:opacity-50">{working === "url" ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />}Đọc và lập chỉ mục URL</button>
        </form>

        <form onSubmit={ingestFile} className="rounded-[28px] border border-violet-200/15 bg-white/[0.035] p-6">
          <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-300/10 text-violet-200"><Upload size={21} /></span><div><h2 className="text-xl font-bold">Upload file riêng</h2><p className="mt-1 text-sm text-slate-500">PDF, DOCX, TXT, MD, CSV, HTML hoặc JSON; tối đa 15 MB.</p></div></div>
          <div className="mt-5 grid gap-4"><label className="text-sm text-slate-400">Tên tài liệu (không bắt buộc)<input value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-violet-300/40" /></label><label className="text-sm text-slate-400">Chọn file<input id="cms-knowledge-file" type="file" required accept=".pdf,.docx,.txt,.md,.csv,.html,.htm,.json" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-2xl border border-dashed border-white/15 bg-[#081321] px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-300 file:px-4 file:py-2 file:font-semibold file:text-[#111329]" /></label><label className="text-sm text-slate-400">Tags<input value={fileTags} onChange={(event) => setFileTags(event.target.value)} placeholder="hợp đồng, quy trình, báo cáo" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-violet-300/40" /></label></div>
          <button type="submit" disabled={working === "file"} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-300 px-5 py-3 font-bold text-[#111329] disabled:opacity-50">{working === "file" ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}Upload và lập chỉ mục</button>
        </form>
      </div>

      <section className="mt-7 rounded-[28px] border border-cyan-200/12 bg-white/[0.03] p-6">
        <div className="flex items-start gap-3"><Search size={20} className="mt-1 shrink-0 text-cyan-200" /><div><h2 className="text-xl font-bold">Kiểm tra ChatGPT sẽ tìm thấy gì</h2><p className="mt-1 text-sm text-slate-500">Tìm trực tiếp trong thư viện riêng, không gọi OpenAI và không tiêu tốn token.</p></div></div>
        <div className="mt-5 flex gap-2"><input value={testQuery} onChange={(event) => setTestQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); testSearch(); } }} placeholder="Ví dụ: quy trình rà soát hợp đồng" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 outline-none focus:border-cyan-300/40" /><button type="button" onClick={testSearch} disabled={working === "test" || !testQuery.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] disabled:opacity-50">{working === "test" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}Kiểm tra</button></div>
        {testResults.length > 0 && <div className="mt-5 grid gap-3">{testResults.map((result) => <div key={`${result.document_id}-${result.chunk_index}`} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{result.title}</h3><span className="text-xs text-cyan-200">Điểm khớp {result.relevance}</span></div><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{result.content}</p></div>)}</div>}
      </section>

      <section className="mt-7 rounded-[28px] border border-amber-200/12 bg-amber-200/[0.025] p-6">
        <div className="flex items-start gap-3"><ShieldCheck size={20} className="mt-0.5 shrink-0 text-amber-200" /><p className="text-sm leading-relaxed text-slate-400">Chỉ thêm URL/file mà FACS có quyền xử lý. Không upload hồ sơ khách hàng, CV, dữ liệu cá nhân, credential hoặc tài liệu mật không được phép xử lý qua OpenAI. PDF scan không có lớp chữ cần OCR trước khi upload. Nội dung trong file/URL luôn được xem là dữ liệu không đáng tin cậy và không được phép thay đổi chỉ dẫn hệ thống.</p></div>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Danh mục thư viện riêng</h2><p className="mt-1 text-sm text-slate-500">Lưu trữ thay cho xóa cứng để bảo toàn dấu vết.</p></div><select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm outline-none"><option value="active">Sẵn sàng</option><option value="error">Lỗi trích xuất</option><option value="processing">Đang xử lý</option><option value="archived">Lưu trữ</option><option value="all">Tất cả</option></select></div>
        <div className="mt-5 grid gap-4">
          {loading ? <div className="flex items-center gap-3 text-slate-400"><Loader2 size={18} className="animate-spin" />Đang tải...</div> : visible.length === 0 ? <div className="rounded-[24px] border border-dashed border-white/10 p-8 text-center text-slate-500">Chưa có tài liệu trong nhóm này.</div> : visible.map((document) => <article key={document.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(document.status)}`}>{statusLabels[document.status] || document.status}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-500">{document.source_type === "url" ? "URL" : document.mime_type || "FILE"}</span></div><h3 className="mt-3 text-lg font-bold">{document.title}</h3><p className="mt-1 truncate text-sm text-slate-500">{document.source_type === "url" ? document.source_url : document.file_name}</p>{document.extraction_error && <p className="mt-2 text-sm text-red-200">{document.extraction_error}</p>}</div><div className="flex shrink-0 flex-wrap gap-2">{document.status !== "error" && <button type="button" onClick={() => openDocument(document)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/15 px-4 py-2 text-sm text-cyan-100">{document.source_type === "url" ? <ExternalLink size={15} /> : <FileText size={15} />}Mở nguồn</button>}<button type="button" disabled={working === document.id || document.status === "archived"} onClick={() => archive(document)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200/15 px-4 py-2 text-sm text-amber-100 disabled:opacity-40"><Archive size={15} />Lưu trữ</button></div></div></article>)}
        </div>
      </section>
    </AdminLayout>
  );
}
