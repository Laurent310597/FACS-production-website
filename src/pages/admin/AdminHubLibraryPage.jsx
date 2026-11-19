import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, BookOpen, FileUp, FolderOpen, ImagePlus, Inbox, Loader2, Pencil, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useToastSetter } from "../../components/admin/ui/toastContext";
import { SkeletonRows } from "../../components/admin/ui/Skeleton";
import {
  deleteApprovedExample,
  deleteGuideline,
  guidelineKinds,
  hubOutputOptions,
  listApprovedExamples,
  listGuidelines,
  listHubInputs,
  sanitizeArticleHtml,
  saveGuideline,
  setExampleReference,
  signedInputUrls,
  uploadHubGuidelineImage,
} from "../../lib/hub";

const inputClass = "w-full rounded-2xl border border-white/10 bg-[#0d1726]/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50";
const cardClass = "rounded-[26px] border border-white/10 bg-white/[0.035] p-5 lg:p-6";
const labelClass = "mb-2 block text-sm font-semibold text-slate-200";
const ghostButton = "inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-white disabled:opacity-50";
const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-[#071421] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";

const channelLabel = Object.fromEntries(hubOutputOptions.map((o) => [o.value, o.label]));
const kindLabel = Object.fromEntries(guidelineKinds.map((k) => [k.value, k.label]));
const emptyGuideline = { id: null, title: "", kind: "rule", applies_to: [], content: "", is_active: true, sort_order: 0, images: [] };
const fmt = (value) => (value ? new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }) : "");

const folders = [
  { key: "guidelines", icon: BookOpen, title: "1. Hướng dẫn & Quy tắc", note: "Quy tắc, văn phong, kỹ năng anh/chị muốn AI tuân theo" },
  { key: "inputs", icon: Inbox, title: "2. Đầu vào đã gửi", note: "Link, nội dung, ảnh và yêu cầu của mỗi lần tạo" },
  { key: "approved", icon: BadgeCheck, title: "3. Kết quả đã duyệt", note: "Bản cuối cùng đã duyệt, AI dùng làm mẫu tham khảo" },
];

// ───────────────────────── Thư mục 1 ─────────────────────────
function GuidelinesFolder({ rows, reload, setError, setNotice }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState({});
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const openForm = async (row) => {
    const images = Array.isArray(row.images) ? row.images : [];
    setForm({ ...row, applies_to: row.applies_to || [], images });
    setPreviews(await signedInputUrls(images));
  };

  const addImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if ((form.images?.length || 0) + files.length > 3) {
      setError("Mỗi hướng dẫn tối đa 3 ảnh mẫu. Cần nhiều hơn thì tạo thêm hướng dẫn khác.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const uploaded = await uploadHubGuidelineImage(file);
        setForm((current) => ({ ...current, images: [...(current.images || []), uploaded] }));
        setPreviews((current) => ({ ...current, [uploaded.path]: URL.createObjectURL(file) }));
      }
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };
  const removeImage = (path) => setForm((current) => ({ ...current, images: current.images.filter((image) => image.path !== path) }));
  const toggleChannel = (value) =>
    setForm((current) => ({ ...current, applies_to: current.applies_to.includes(value) ? current.applies_to.filter((c) => c !== value) : [...current.applies_to, value] }));

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 200_000) {
      setError("Chỉ nhập được file .txt hoặc .md, tối đa 200 KB. Với file Word, hãy mở file và chép nội dung vào ô bên dưới.");
      return;
    }
    const text = await file.text();
    setForm((current) => ({ ...current, title: current.title || file.name.replace(/\.(txt|md)$/i, ""), content: text.slice(0, 20000) }));
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await saveGuideline(form);
      setForm(null);
      setNotice("Đã lưu hướng dẫn. AI sẽ áp dụng từ lần tạo nội dung tiếp theo.");
      await reload();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    try {
      await saveGuideline({ ...row, is_active: !row.is_active });
      await reload();
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Xóa hướng dẫn "${row.title}"?`)) return;
    try {
      await deleteGuideline(row.id);
      await reload();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-slate-400">
          Mỗi mục là một hướng dẫn AI phải đọc trước khi viết: quy tắc bắt buộc, văn phong thương hiệu, kỹ năng (cách viết một loại bài), hoặc tài liệu tham chiếu. Chọn kênh áp dụng, để trống là áp dụng cho mọi kênh. Tắt một mục khi muốn tạm ngưng mà không xóa.
        </p>
        {!form && (
          <button type="button" className={primaryButton} onClick={() => { setForm({ ...emptyGuideline }); setPreviews({}); }}>
            <Plus size={16} /> Thêm hướng dẫn
          </button>
        )}
      </div>

      {form && (
        <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/5 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px_120px]">
            <label className="block">
              <span className={labelClass}>Tên hướng dẫn</span>
              <input value={form.title} onChange={(e) => update("title", e.target.value)} maxLength={200} className={inputClass} placeholder="Ví dụ: Giọng văn thương hiệu FACS" />
            </label>
            <label className="block">
              <span className={labelClass}>Loại</span>
              <select value={form.kind} onChange={(e) => update("kind", e.target.value)} className={inputClass}>
                {guidelineKinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={labelClass}>Thứ tự</span>
              <input type="number" value={form.sort_order} onChange={(e) => update("sort_order", e.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="mt-4">
            <span className={labelClass}>Áp dụng cho (để trống = mọi kênh)</span>
            <div className="flex flex-wrap gap-2">
              {hubOutputOptions.map((option) => {
                const active = form.applies_to.includes(option.value);
                return (
                  <button key={option.value} type="button" aria-pressed={active} onClick={() => toggleChannel(option.value)} className={`rounded-xl border px-3 py-1.5 text-sm ${active ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-400"}`}>
                    {active ? "✓ " : ""}{option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="mt-4 block">
            <span className={labelClass}>Nội dung ({form.content.length}/20.000 ký tự)</span>
            <textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={10} maxLength={20000} className={inputClass} placeholder={"Ví dụ:\n- Luôn xưng \"FACS\", gọi người đọc là \"Quý doanh nghiệp\".\n- Không dùng từ ngữ cường điệu như \"tốt nhất\", \"cam kết 100%\".\n- Bài LinkedIn kết thúc bằng một câu hỏi mở cho người đọc."} />
          </label>
          <div className="mt-4">
            <span className={labelClass}>Ảnh mẫu: infographic FACS đã làm (tối đa 3 ảnh, mỗi ảnh ≤ 4 MB, PNG/JPG/WEBP)</span>
            <div className="flex flex-wrap items-center gap-3">
              {(form.images || []).map((image) => (
                <div key={image.path} className="relative h-28 w-24 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {previews[image.path] ? <img src={previews[image.path]} alt={image.name} className="h-full w-full object-cover" /> : <div className="p-2 text-xs text-slate-400">{image.name}</div>}
                  <button type="button" onClick={() => removeImage(image.path)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white" aria-label={`Bỏ ảnh ${image.name}`}><X size={12} /></button>
                </div>
              ))}
              {(form.images?.length || 0) < 3 && (
                <label className={`${ghostButton} cursor-pointer`}>
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} Thêm ảnh mẫu
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addImages} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">AI xem ảnh mẫu khi tạo infographic để học cách chọn ý, độ dài chữ và giọng điệu. Ảnh chỉ được gửi cho AI khi hướng dẫn này đang áp dụng và anh/chị chọn tạo Infographic.</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} onClick={submit} disabled={saving || uploading}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu
            </button>
            <label className={`${ghostButton} cursor-pointer`}>
              <FileUp size={15} /> Nhập từ file .txt / .md
              <input type="file" accept=".txt,.md,text/plain,text/markdown" onChange={importFile} className="hidden" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} /> Đang áp dụng
            </label>
            <button type="button" className={ghostButton} onClick={() => setForm(null)}>Hủy</button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có hướng dẫn nào. AI đang dùng hướng dẫn mặc định của Hub.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{row.title}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{kindLabel[row.kind] || row.kind}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${row.is_active ? "bg-emerald-300/15 text-emerald-200" : "bg-white/5 text-slate-500"}`}>{row.is_active ? "Đang áp dụng" : "Tạm tắt"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {row.applies_to?.length ? row.applies_to.map((c) => channelLabel[c] || c).join(", ") : "Mọi kênh"} · cập nhật {fmt(row.updated_at)}{row.images?.length ? ` · ${row.images.length} ảnh mẫu` : ""}
                </div>
                <p className="mt-2 line-clamp-2 whitespace-pre-line text-sm text-slate-400">{row.content}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className={ghostButton} onClick={() => toggleActive(row)}>{row.is_active ? "Tạm tắt" : "Bật lại"}</button>
                <button type="button" className={ghostButton} onClick={() => openForm(row)} aria-label={`Sửa ${row.title}`}><Pencil size={15} /></button>
                <button type="button" className={ghostButton} onClick={() => remove(row)} aria-label={`Xóa ${row.title}`}><Trash2 size={15} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Thư mục 2 ─────────────────────────
function InputsFolder({ rows }) {
  const [images, setImages] = useState({});
  useEffect(() => {
    let active = true;
    const files = rows.flatMap((row) => (Array.isArray(row.input_files) ? row.input_files : []));
    signedInputUrls(files).then((urls) => active && setImages(urls));
    return () => {
      active = false;
    };
  }, [rows]);

  if (!rows.length) return <p className="text-sm text-slate-500">Chưa có đầu vào nào. Mỗi lần tạo nội dung, đầu vào được lưu tự động vào đây.</p>;
  return (
    <ul className="divide-y divide-white/10">
      {rows.map((row) => {
        const files = Array.isArray(row.input_files) ? row.input_files : [];
        return (
          <li key={row.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{row.title || "Nội dung chưa đặt tên"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {fmt(row.created_at)} · {(row.requested_outputs || []).map((c) => channelLabel[c] || c).join(", ")}
                  {row.status === "approved" ? " · đã duyệt" : row.status === "archived" ? " · đã lưu trữ" : ""}
                </div>
              </div>
              <Link to={`/admin/hub/content?item=${row.id}`} className={ghostButton}><FolderOpen size={15} /> Mở</Link>
            </div>
            {row.brief && <p className="mt-2 text-sm text-slate-300"><span className="text-slate-500">Yêu cầu: </span>{row.brief}</p>}
            {row.source_urls?.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {row.source_urls.map((url) => (
                  <li key={url} className="truncate"><a href={url} target="_blank" rel="noreferrer noopener" className="text-cyan-300 hover:underline">{url}</a></li>
                ))}
              </ul>
            )}
            {row.source_text && (
              <details className="mt-2 text-sm text-slate-400">
                <summary className="cursor-pointer text-slate-300">Nội dung đã dán ({row.source_text.length.toLocaleString("vi-VN")} ký tự)</summary>
                <p className="mt-2 max-h-48 overflow-auto whitespace-pre-line rounded-xl bg-black/20 p-3">{row.source_text}</p>
              </details>
            )}
            {files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {files.map((file) => (
                  <a key={file.path} href={images[file.path]} target="_blank" rel="noreferrer noopener" className="block h-20 w-20 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    {images[file.path] ? <img src={images[file.path]} alt={file.name} className="h-full w-full object-cover" /> : <span className="p-1 text-[10px] text-slate-500">{file.name}</span>}
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────── Thư mục 3 ─────────────────────────
function ExamplePreview({ row }) {
  const c = row.content || {};
  if (row.channel === "website") {
    return (
      <div>
        <div className="font-semibold text-slate-800">{c.title_vi}</div>
        <p className="mt-1 text-slate-600">{c.excerpt_vi}</p>
        <div className="mt-3 max-h-72 overflow-auto [&_h2]:mt-3 [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-5 [&_p]:mb-2 [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(c.content_vi) }} />
      </div>
    );
  }
  if (row.channel === "infographic") {
    return (
      <div>
        <div className="font-semibold text-slate-800">{c.title}</div>
        <p className="text-slate-600">{c.subtitle}</p>
        <ul className="mt-2 list-disc pl-5">{(c.points || []).map((p, i) => <li key={i}><strong>{p.heading}:</strong> {p.detail}</li>)}</ul>
      </div>
    );
  }
  return <p className="whitespace-pre-line">{c.text}</p>;
}

function ApprovedFolder({ rows, reload, setError }) {
  const [channel, setChannel] = useState("all");
  const [openId, setOpenId] = useState(null);
  const filtered = useMemo(() => (channel === "all" ? rows : rows.filter((r) => r.channel === channel)), [rows, channel]);

  const toggleReference = async (row) => {
    try {
      await setExampleReference(row.id, !row.is_reference);
      await reload();
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };
  const remove = async (row) => {
    if (!window.confirm(`Xóa "${row.title}" khỏi thư mục Kết quả đã duyệt? AI sẽ không tham khảo bài này nữa.`)) return;
    try {
      await deleteApprovedExample(row.id);
      await reload();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-slate-400">
        Mỗi lần tạo nội dung, AI đọc tối đa 2 bài đã duyệt cho mỗi kênh (ưu tiên bài cùng chủ đề, rồi bài mới nhất) để học văn phong, độ dài và cấu trúc. AI không lấy số liệu từ bài mẫu. Bỏ chọn "Dùng làm mẫu" với bài anh/chị không muốn AI học theo.
      </p>
      <div className="flex flex-wrap gap-2">
        {[{ value: "all", label: "Tất cả" }, ...hubOutputOptions].map((option) => (
          <button key={option.value} type="button" onClick={() => setChannel(option.value)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${channel === option.value ? "bg-cyan-300 text-[#071421]" : "text-slate-300 hover:bg-white/[0.07]"}`}>
            {option.label} {option.value === "all" ? `(${rows.length})` : `(${rows.filter((r) => r.channel === option.value).length})`}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có kết quả nào được duyệt. Trong trang Tạo nội dung, bấm "Duyệt & lưu vào thư viện" khi bài đã đạt.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {filtered.map((row) => (
            <li key={row.id} className="py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setOpenId(openId === row.id ? null : row.id)} className="min-w-0 flex-1 text-left">
                  <div className="font-semibold text-white hover:text-cyan-200">{row.title || "(không tiêu đề)"}</div>
                  <div className="mt-1 text-xs text-slate-500">{channelLabel[row.channel] || row.channel} · duyệt lúc {fmt(row.approved_at)}</div>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={row.is_reference} onChange={() => toggleReference(row)} /> Dùng làm mẫu
                  </label>
                  {row.content_item_id && <Link to={`/admin/hub/content?item=${row.content_item_id}`} className={ghostButton}><FolderOpen size={15} /> Mở bộ gốc</Link>}
                  <button type="button" className={ghostButton} onClick={() => remove(row)} aria-label={`Xóa ${row.title}`}><Trash2 size={15} /></button>
                </div>
              </div>
              {openId === row.id && (
                <div className="mt-3 rounded-2xl bg-white p-5 text-sm leading-6 text-slate-700">
                  <ExamplePreview row={row} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Trang Thư viện ─────────────────────────
export default function AdminHubLibraryPage() {
  const [active, setActive] = useState("guidelines");
  const [guidelines, setGuidelines] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const setNotice = useToastSetter("success");

  const reload = useCallback(async () => {
    try {
      const [g, i, a] = await Promise.all([listGuidelines(), listHubInputs(), listApprovedExamples()]);
      setGuidelines(g);
      setInputs(i);
      setApproved(a);
    } catch (loadError) {
      setError(/hub_guidelines|hub_approved_examples|input_files|schema cache|does not exist/i.test(loadError.message)
        ? "Thư viện chưa được kích hoạt trên Supabase (cần chạy migration 20261117000000_facs_hub_library.sql)."
        : loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(reload, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const counts = { guidelines: guidelines.filter((g) => g.is_active).length, inputs: inputs.length, approved: approved.filter((a) => a.is_reference).length };
  const countLabel = { guidelines: `${counts.guidelines} đang áp dụng`, inputs: `${counts.inputs} lần gửi`, approved: `${counts.approved} bài làm mẫu` };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">FACS Hub</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em]">Thư viện</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Nơi AI học cách làm việc theo cách của FACS: đọc hướng dẫn ở thư mục 1 và các bài đã duyệt ở thư mục 3 trước mỗi lần tạo nội dung.</p>
          </div>
          <Link to="/admin/hub/content" className={primaryButton}><Sparkles size={16} /> Tạo nội dung</Link>
        </div>

        {error && <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{error}</div>}

        <div className="grid gap-3 md:grid-cols-3">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = active === folder.key;
            return (
              <button key={folder.key} type="button" onClick={() => { setActive(folder.key); setNotice(""); }} aria-pressed={isActive} className={`rounded-[22px] border p-5 text-left transition ${isActive ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-white/[0.035] hover:border-cyan-200/30"}`}>
                <div className="flex items-center gap-3">
                  <Icon size={22} className={isActive ? "text-cyan-300" : "text-slate-400"} />
                  <span className="font-bold text-white">{folder.title}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{folder.note}</p>
                <p className="mt-3 text-sm font-semibold text-cyan-200">{loading ? "…" : countLabel[folder.key]}</p>
              </button>
            );
          })}
        </div>

        <div className={cardClass}>
          {loading ? (
            <SkeletonRows rows={4} />
          ) : active === "guidelines" ? (
            <GuidelinesFolder rows={guidelines} reload={reload} setError={setError} setNotice={setNotice} />
          ) : active === "inputs" ? (
            <InputsFolder rows={inputs} />
          ) : (
            <ApprovedFolder rows={approved} reload={reload} setError={setError} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
