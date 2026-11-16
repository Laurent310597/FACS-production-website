import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Check, Copy, Download, FileText, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { insightCategories, slugify } from "../../lib/insights";
import {
  archiveHubItem,
  createPostDraftFromHub,
  hubOutputOptions,
  invokeHubContent,
  listHubItems,
  loadHubItem,
  parseSourceUrls,
  sanitizeArticleHtml,
  saveHubItem,
} from "../../lib/hub";
import { downloadCanvasPng, drawInfographic } from "../../lib/hubInfographic";

const inputClass = "w-full rounded-2xl border border-white/10 bg-[#0d1726]/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/50";
const cardClass = "rounded-[26px] border border-white/10 bg-white/[0.035] p-5 lg:p-6";
const labelClass = "mb-2 block text-sm font-semibold text-slate-200";
const ghostButton = "inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-200/30 hover:text-white disabled:opacity-50";
const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-sm font-bold text-[#071421] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50";

const emptyOutputs = {
  website: { category: "business", title_vi: "", title_en: "", excerpt_vi: "", excerpt_en: "", content_vi: "", content_en: "", seo_description_vi: "", seo_description_en: "" },
  facebook: "",
  linkedin: "",
  instagram: "",
  infographic: { title: "", subtitle: "", points: [], stats: [], source_note: "" },
  review_notes: [],
};

const tabLabels = { website: "Website", facebook: "Facebook", linkedin: "LinkedIn", instagram: "Instagram", infographic: "Infographic" };

function InfographicPreview({ data, fileName }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    let active = true;
    const render = () => active && canvasRef.current && drawInfographic(canvasRef.current, data);
    render();
    // Vẽ lại khi font đã tải xong để đo chữ chính xác.
    document.fonts?.ready?.then(render);
    return () => {
      active = false;
    };
  }, [data]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full max-w-[420px] rounded-2xl border border-white/10" />
      <button type="button" className={`${ghostButton} mt-3`} onClick={() => downloadCanvasPng(canvasRef.current, fileName)}>
        <Download size={15} /> Tải ảnh PNG (1080 × 1350)
      </button>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className={ghostButton} onClick={copy} disabled={!text}>
      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Đã chép" : "Chép nội dung"}
    </button>
  );
}

export default function AdminHubContentPage() {
  const [urlsText, setUrlsText] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [brief, setBrief] = useState("");
  const [requested, setRequested] = useState(["website", "facebook", "linkedin"]);
  const [outputs, setOutputs] = useState(null);
  const [itemId, setItemId] = useState(null);
  const [postId, setPostId] = useState(null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState("website");
  const [language, setLanguage] = useState("vi");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [items, setItems] = useState([]);
  const [setupMissing, setSetupMissing] = useState(false);

  const refreshItems = useCallback(async () => {
    try {
      setItems(await listHubItems());
      setSetupMissing(false);
    } catch (listError) {
      if (/hub_content_items|schema cache|does not exist/i.test(listError.message)) setSetupMissing(true);
      else setError(listError.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    listHubItems()
      .then((rows) => active && setItems(rows))
      .catch((listError) => {
        if (!active) return;
        if (/hub_content_items|schema cache|does not exist/i.test(listError.message)) setSetupMissing(true);
        else setError(listError.message);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleTabs = useMemo(() => hubOutputOptions.map((o) => o.value).filter((name) => requested.includes(name)), [requested]);
  const currentTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];

  const toggleOutput = (value) => setRequested((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
  const updateOutput = (key, value) => setOutputs((current) => ({ ...current, [key]: value }));
  const updateWebsite = (field, value) => setOutputs((current) => ({ ...current, website: { ...current.website, [field]: value } }));
  const updateInfographic = (field, value) => setOutputs((current) => ({ ...current, infographic: { ...current.infographic, [field]: value } }));
  const updateListItem = (listName, index, field, value) =>
    setOutputs((current) => ({
      ...current,
      infographic: { ...current.infographic, [listName]: current.infographic[listName].map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)) },
    }));

  const resetForm = () => {
    setUrlsText("");
    setSourceText("");
    setBrief("");
    setOutputs(null);
    setItemId(null);
    setPostId(null);
    setTitle("");
    setWarnings([]);
    setError("");
    setNotice("");
  };

  const generate = async () => {
    if (!requested.length) {
      setError("Hãy chọn ít nhất một loại nội dung cần tạo.");
      return;
    }
    if (outputs && !window.confirm("Tạo lại sẽ thay thế nội dung đang hiển thị (kể cả phần anh/chị đã sửa). Tiếp tục?")) return;
    setGenerating(true);
    setError("");
    setNotice("");
    setWarnings([]);
    try {
      const data = await invokeHubContent({ source_urls: parseSourceUrls(urlsText), source_text: sourceText, brief, outputs: requested });
      const result = data.result || {};
      setOutputs({
        ...emptyOutputs,
        ...result,
        website: { ...emptyOutputs.website, ...(result.website || {}), content_vi: sanitizeArticleHtml(result.website?.content_vi), content_en: sanitizeArticleHtml(result.website?.content_en) },
        infographic: { ...emptyOutputs.infographic, ...(result.infographic || {}) },
        review_notes: result.review_notes || [],
      });
      setTitle(result.working_title || result.website?.title_vi || "");
      setWarnings(data.warnings || []);
      setPostId(null);
      setActiveTab(requested.includes("website") ? "website" : requested[0]);
      setNotice(`Đã tạo nội dung. Còn ${data.remaining_today ?? "?"} lượt trong 24 giờ.`);
    } catch (generateError) {
      setError(generateError.message);
    } finally {
      setGenerating(false);
    }
  };

  const save = async (overrides = {}) => {
    setSaving(true);
    setError("");
    try {
      const saved = await saveHubItem({
        id: itemId,
        title,
        source_urls: parseSourceUrls(urlsText),
        source_text: sourceText,
        brief,
        requested_outputs: requested,
        outputs,
        post_id: postId,
        ...overrides,
      });
      setItemId(saved.id);
      setNotice("Đã lưu bộ nội dung.");
      await refreshItems();
      return saved;
    } catch (saveError) {
      setError(saveError.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createDraft = async () => {
    if (!window.confirm("Tạo một BÀI NHÁP trong CMS Insights từ nội dung website này?\n\nBài chưa được đăng và chưa gửi email. Anh/chị rà soát, đăng và gửi email trong trình soạn bài như bình thường.")) return;
    setCreatingPost(true);
    setError("");
    try {
      const id = await createPostDraftFromHub(outputs.website);
      setPostId(id);
      await save({ post_id: id });
      setNotice("Đã tạo bài nháp trong CMS. Mở trình soạn bài để rà soát và đăng.");
    } catch (draftError) {
      setError(draftError.message);
    } finally {
      setCreatingPost(false);
    }
  };

  const openItem = async (id) => {
    setError("");
    setNotice("");
    try {
      const item = await loadHubItem(id);
      setItemId(item.id);
      setPostId(item.post_id);
      setTitle(item.title || "");
      setUrlsText((item.source_urls || []).join("\n"));
      setSourceText(item.source_text || "");
      setBrief(item.brief || "");
      const nextRequested = item.requested_outputs?.length ? item.requested_outputs : ["website"];
      setRequested(nextRequested);
      setOutputs({ ...emptyOutputs, ...(item.outputs || {}), website: { ...emptyOutputs.website, ...(item.outputs?.website || {}) }, infographic: { ...emptyOutputs.infographic, ...(item.outputs?.infographic || {}) } });
      setActiveTab(nextRequested[0]);
      setWarnings([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (openError) {
      setError(openError.message);
    }
  };

  const archive = async (id) => {
    if (!window.confirm("Lưu trữ bộ nội dung này? (Bài nháp trong CMS, nếu có, vẫn được giữ nguyên.)")) return;
    try {
      await archiveHubItem(id);
      if (id === itemId) resetForm();
      await refreshItems();
    } catch (archiveError) {
      setError(archiveError.message);
    }
  };

  const website = outputs?.website;
  const infographic = outputs?.infographic;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">FACS Hub</div>
            <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em]">Tạo nội dung</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Gửi link bài báo, văn bản hoặc ghi chú. Trợ lý soạn bài website song ngữ, bài mạng xã hội và infographic để anh/chị rà soát. Không có gì được đăng hay gửi email tự động từ trang này.
            </p>
          </div>
          {outputs && (
            <button type="button" className={ghostButton} onClick={resetForm}>
              <RefreshCw size={15} /> Bắt đầu bộ mới
            </button>
          )}
        </div>

        {setupMissing && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            FACS Hub chưa được kích hoạt trên Supabase. Cần chạy migration <code>20261116160000_facs_hub_content_studio.sql</code> và triển khai Edge Function <code>hub-content</code> — xem file <code>HUONG-DAN-FACS-HUB.md</code>.
          </div>
        )}
        {error && <div className="rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{error}</div>}
        {notice && !error && <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">{notice}</div>}
        {warnings.length > 0 && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
            <div className="font-semibold">Một số nguồn không đọc được:</div>
            <ul className="mt-1 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        )}

        <div className={cardClass}>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Link nguồn (tối đa 3, mỗi dòng một link)</span>
              <textarea value={urlsText} onChange={(e) => setUrlsText(e.target.value)} rows={3} className={inputClass} placeholder="https://..." />
            </label>
            <label className="block">
              <span className={labelClass}>Yêu cầu cho trợ lý</span>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} maxLength={2000} className={inputClass} placeholder="Ví dụ: nhấn mạnh tác động với doanh nghiệp SME, giọng văn ngắn gọn, kêu gọi liên hệ FACS để rà soát." />
            </label>
            <label className="block lg:col-span-2">
              <span className={labelClass}>Dán nội dung (dùng khi link không đọc được, hoặc nội dung từ file/ảnh infographic)</span>
              <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={4} maxLength={20000} className={inputClass} placeholder="Dán văn bản nguồn vào đây…" />
            </label>
          </div>
          <div className="mt-5">
            <span className={labelClass}>Nội dung cần tạo</span>
            <div className="flex flex-wrap gap-2">
              {hubOutputOptions.map((option) => {
                const active = requested.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleOutput(option.value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${active ? "border-cyan-300 bg-cyan-300/15 text-cyan-100" : "border-white/10 text-slate-400 hover:text-white"}`}
                  >
                    {active ? "✓ " : ""}{option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} onClick={generate} disabled={generating || setupMissing}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {generating ? "Đang soạn (30–90 giây)…" : outputs ? "Tạo lại" : "Tạo nội dung"}
            </button>
            <span className="text-xs text-slate-500">Bài được viết mới theo góc nhìn FACS và có ghi nguồn; không chép lại bài gốc.</span>
          </div>
        </div>

        {outputs && (
          <div className={cardClass}>
            <label className="block">
              <span className={labelClass}>Tên bộ nội dung</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={inputClass} />
            </label>

            {outputs.review_notes?.length > 0 && (
              <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={16} /> Cần chuyên gia kiểm tra trước khi đăng</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">{outputs.review_notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-b border-white/10 pb-3">
              {visibleTabs.map((name) => (
                <button key={name} type="button" onClick={() => setActiveTab(name)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${currentTab === name ? "bg-cyan-300 text-[#071421]" : "text-slate-300 hover:bg-white/[0.07]"}`}>
                  {tabLabels[name]}
                </button>
              ))}
            </div>

            {currentTab === "website" && (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex rounded-xl border border-white/10 p-1">
                    {["vi", "en"].map((code) => (
                      <button key={code} type="button" onClick={() => setLanguage(code)} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${language === code ? "bg-white/15 text-white" : "text-slate-400"}`}>
                        {code === "vi" ? "Tiếng Việt" : "English"}
                      </button>
                    ))}
                  </div>
                  <select value={website.category} onChange={(e) => updateWebsite("category", e.target.value)} className={`${inputClass} w-auto`}>
                    {insightCategories.map((category) => <option key={category.value} value={category.value}>{category.vi}</option>)}
                  </select>
                </div>
                <label className="block">
                  <span className={labelClass}>Tiêu đề</span>
                  <input value={website[`title_${language}`]} onChange={(e) => updateWebsite(`title_${language}`, e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className={labelClass}>Tóm tắt</span>
                  <textarea value={website[`excerpt_${language}`]} onChange={(e) => updateWebsite(`excerpt_${language}`, e.target.value)} rows={2} className={inputClass} />
                </label>
                <div>
                  <span className={labelClass}>Nội dung (xem trước — chỉnh sửa chi tiết trong trình soạn bài của CMS sau khi tạo bài nháp)</span>
                  <div
                    className="max-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-white p-6 text-[15px] leading-7 text-slate-800 [&_a]:text-cyan-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-3 [&_ul]:list-disc"
                    dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(website[`content_${language}`]) || "<p>(chưa có nội dung)</p>" }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {postId ? (
                    <Link to={`/admin/posts/${postId}/edit`} className={primaryButton}><FileText size={16} /> Mở bài nháp trong CMS</Link>
                  ) : (
                    <button type="button" className={primaryButton} onClick={createDraft} disabled={creatingPost}>
                      {creatingPost ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Tạo bài nháp trong CMS
                    </button>
                  )}
                  <span className="text-xs text-slate-500">Bài nháp chưa đăng và chưa gửi email. Đăng bài, hẹn giờ và gửi email vẫn làm trong trình soạn bài như hiện tại.</span>
                </div>
              </div>
            )}

            {["facebook", "linkedin", "instagram"].includes(currentTab) && (
              <div className="mt-5 space-y-3">
                <textarea value={outputs[currentTab] || ""} onChange={(e) => updateOutput(currentTab, e.target.value)} rows={12} className={inputClass} />
                <div className="flex flex-wrap items-center gap-3">
                  <CopyButton text={outputs[currentTab]} />
                  <span className="text-xs text-slate-500">{(outputs[currentTab] || "").length} ký tự · Hẹn giờ đăng trực tiếp sẽ có ở Phần 3 của Hub; hiện tại chép nội dung để đăng tay.</span>
                </div>
              </div>
            )}

            {currentTab === "infographic" && (
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
                <div className="space-y-4">
                  <label className="block"><span className={labelClass}>Tiêu đề</span><input value={infographic.title} onChange={(e) => updateInfographic("title", e.target.value)} className={inputClass} /></label>
                  <label className="block"><span className={labelClass}>Phụ đề</span><input value={infographic.subtitle} onChange={(e) => updateInfographic("subtitle", e.target.value)} className={inputClass} /></label>
                  {infographic.stats.length > 0 && (
                    <div>
                      <span className={labelClass}>Số liệu nổi bật</span>
                      <div className="space-y-2">
                        {infographic.stats.map((stat, index) => (
                          <div key={`stat-${index}`} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2">
                            <input value={stat.value} onChange={(e) => updateListItem("stats", index, "value", e.target.value)} className={inputClass} aria-label={`Số liệu ${index + 1}`} />
                            <input value={stat.label} onChange={(e) => updateListItem("stats", index, "label", e.target.value)} className={inputClass} aria-label={`Chú thích số liệu ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className={labelClass}>Các ý chính</span>
                    <div className="space-y-3">
                      {infographic.points.map((point, index) => (
                        <div key={`point-${index}`} className="space-y-2">
                          <input value={point.heading} onChange={(e) => updateListItem("points", index, "heading", e.target.value)} className={inputClass} aria-label={`Ý ${index + 1}`} />
                          <textarea value={point.detail} onChange={(e) => updateListItem("points", index, "detail", e.target.value)} rows={2} className={inputClass} aria-label={`Diễn giải ý ${index + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <label className="block"><span className={labelClass}>Nguồn</span><input value={infographic.source_note} onChange={(e) => updateInfographic("source_note", e.target.value)} className={inputClass} /></label>
                </div>
                <InfographicPreview data={infographic} fileName={`facs-infographic-${slugify(infographic.title || title) || "moi"}.png`} />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
              <button type="button" className={ghostButton} onClick={() => save()} disabled={saving}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu bộ nội dung
              </button>
            </div>
          </div>
        )}

        <div className={cardClass}>
          <h2 className="text-lg font-bold">Bộ nội dung đã lưu</h2>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Chưa có bộ nội dung nào.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <button type="button" onClick={() => openItem(item.id)} className="min-w-0 flex-1 text-left">
                    <div className="truncate font-semibold text-white hover:text-cyan-200">{item.title || "Nội dung chưa đặt tên"}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(item.updated_at).toLocaleString("vi-VN")} · {(item.requested_outputs || []).map((name) => tabLabels[name] || name).join(", ")}
                      {item.post_id ? " · đã có bài nháp CMS" : ""}
                    </div>
                  </button>
                  <button type="button" className={ghostButton} onClick={() => archive(item.id)} aria-label={`Lưu trữ ${item.title}`}>
                    <Archive size={15} /> Lưu trữ
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
