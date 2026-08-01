import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Globe2, Loader2, Pencil, Plus, Save, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { supabase } from "../../lib/supabaseClient";

const emptyForm = {
  name: "",
  domain: "",
  source_tier: "P2",
  source_kind: "reputable_legal_database",
  citation_allowed: true,
  is_active: true,
  coverage: "",
  notes: "",
};

const kindLabels = {
  official: "Cơ quan/nguồn chính thức",
  reputable_legal_database: "CSDL pháp luật uy tín",
  professional_reference: "Nguồn chuyên môn tham khảo",
};

function normalizeDomain(value) {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}
function sourceToForm(source) {
  return {
    ...emptyForm,
    ...source,
    coverage: Array.isArray(source.coverage) ? source.coverage.join(", ") : "",
  };
}

export default function AdminPublicAISourcesPage() {
  const [sources, setSources] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("public_ai_source_registry")
      .select("*")
      .order("source_tier", { ascending: true })
      .order("name", { ascending: true });
    if (fetchError) setError(`Không thể tải danh sách nguồn mở: ${fetchError.message}`);
    else setSources(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const counts = useMemo(() => ({
    active: sources.filter((item) => item.is_active && item.citation_allowed).length,
    official: sources.filter((item) => item.is_active && item.source_tier === "P1").length,
    secondary: sources.filter((item) => item.is_active && item.source_tier === "P2").length,
  }), [sources]);

  const update = (field, value) => setForm((current) => {
    if (field === "source_tier" && value === "P1") {
      return { ...current, source_tier: "P1", source_kind: "official" };
    }
    if (field === "source_tier" && value === "P2" && current.source_kind === "official") {
      return { ...current, source_tier: "P2", source_kind: "reputable_legal_database" };
    }
    return { ...current, [field]: value };
  });

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  };

  const edit = (source) => {
    setEditingId(source.id);
    setForm(sourceToForm(source));
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const domain = normalizeDomain(form.domain);
    if (!form.name.trim()) return setError("Vui lòng nhập tên nguồn.");
    if (!domain || !domain.includes(".")) return setError("Vui lòng nhập tên miền hợp lệ, không kèm đường dẫn.");
    if (form.source_tier === "P1" && form.source_kind !== "official") {
      return setError("Nguồn P1 phải là cơ quan hoặc cổng thông tin chính thức.");
    }
    if (form.source_tier === "P2" && form.source_kind === "official") {
      return setError("Nguồn chính thức phải được phân loại P1.");
    }

    setWorking("save");
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id || null;
    const payload = {
      name: form.name.trim(),
      domain,
      source_tier: form.source_tier,
      source_kind: form.source_kind,
      legal_authority: form.source_tier === "P1" && form.source_kind === "official",
      citation_allowed: Boolean(form.citation_allowed),
      is_active: Boolean(form.is_active),
      coverage: form.coverage.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30),
      notes: form.notes.trim() || null,
      updated_by: userId,
      ...(editingId ? {} : { created_by: userId }),
    };
    const result = editingId
      ? await supabase.from("public_ai_source_registry").update(payload).eq("id", editingId)
      : await supabase.from("public_ai_source_registry").insert(payload);
    if (result.error) setError(`Không thể lưu nguồn: ${result.error.message}`);
    else {
      setMessage("Đã cập nhật registry. GROQ chỉ được tìm kiếm trên các nguồn đang bật và cho phép trích dẫn.");
      await load();
      if (!editingId) setForm(emptyForm);
    }
    setWorking("");
  };

  const toggleActive = async (source) => {
    setWorking(source.id);
    setError("");
    const { data: sessionData } = await supabase.auth.getSession();
    const { error: updateError } = await supabase.from("public_ai_source_registry").update({
      is_active: !source.is_active,
      updated_by: sessionData.session?.user?.id || null,
    }).eq("id", source.id);
    if (updateError) setError(`Không thể đổi trạng thái nguồn: ${updateError.message}`);
    else await load();
    setWorking("");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300/80">Public GROQ Source Registry</div>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">Nguồn mở cho AI Tư vấn FACS</h1>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">GROQ web search chỉ được truy cập các tên miền đang bật trong registry này. P1 là nguồn chính thức; P2 là nguồn pháp lý/chuyên môn thứ cấp uy tín và không được trình bày như cơ quan ban hành.</p>
        </div>
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421]"><Plus size={18} />Thêm nguồn</button>
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-400/[0.06] px-5 py-4 text-sm text-red-200">{error}</div>}
      {message && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] px-5 py-4 text-sm text-emerald-100"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[["Nguồn đang dùng", counts.active], ["P1 chính thức", counts.official], ["P2 uy tín", counts.secondary]].map(([label, value]) => <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5"><div className="text-sm text-slate-500">{label}</div><div className="mt-2 text-3xl font-bold text-white">{value}</div></div>)}
      </div>

      <form onSubmit={save} className="mt-7 rounded-[28px] border border-cyan-200/15 bg-white/[0.035] p-6 md:p-7">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200"><Globe2 size={21} /></span><div><h2 className="text-xl font-bold">{editingId ? "Chỉnh sửa nguồn" : "Thêm tên miền được phép"}</h2><p className="mt-1 text-sm text-slate-500">Chỉ nhập tên miền, ví dụ: thuvienphapluat.vn. Không nhập URL bài viết.</p></div></div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="text-sm text-slate-400">Tên nguồn<input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-cyan-300/40" /></label>
          <label className="text-sm text-slate-400">Tên miền<input value={form.domain} onChange={(event) => update("domain", event.target.value)} placeholder="luatvietnam.vn" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-cyan-300/40" /></label>
          <label className="text-sm text-slate-400">Phân hạng<select value={form.source_tier} onChange={(event) => update("source_tier", event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none"><option value="P1">P1 — Chính thức</option><option value="P2">P2 — Thứ cấp uy tín</option></select></label>
          <label className="text-sm text-slate-400">Loại nguồn<select value={form.source_kind} onChange={(event) => update("source_kind", event.target.value)} disabled={form.source_tier === "P1"} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none disabled:opacity-60">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm text-slate-400 lg:col-span-2">Phạm vi chủ đề<input value={form.coverage} onChange={(event) => update("coverage", event.target.value)} placeholder="legal, tax, accounting, labour, compliance" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-cyan-300/40" /></label>
          <label className="text-sm text-slate-400 lg:col-span-2">Ghi chú quản trị<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows="3" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-white outline-none focus:border-cyan-300/40" /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.citation_allowed} onChange={(event) => update("citation_allowed", event.target.checked)} className="h-4 w-4 accent-cyan-400" />Cho phép trích dẫn</label>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(event) => update("is_active", event.target.checked)} className="h-4 w-4 accent-cyan-400" />Đang hoạt động</label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3"><button type="submit" disabled={working === "save"} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] disabled:opacity-50">{working === "save" ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}Lưu registry</button>{editingId && <button type="button" onClick={reset} className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-300">Hủy chỉnh sửa</button>}</div>
      </form>

      <section className="mt-7 rounded-[28px] border border-violet-200/15 bg-violet-300/[0.035] p-6">
        <div className="flex items-start gap-3"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-violet-200" /><div><h2 className="font-bold">Quy tắc citation</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Thư Viện Pháp Luật và LuatVietnam được phân loại P2: có thể hỗ trợ giải thích, phát hiện và dẫn link, nhưng không thay thế văn bản/cơ quan chính thức. Câu trả lời về nghĩa vụ, thời hạn, mức thuế hoặc hiệu lực cụ thể phải ưu tiên nguồn P1.</p></div></div>
      </section>

      <section className="mt-7">
        <h2 className="text-2xl font-bold">Danh sách nguồn mở</h2>
        <div className="mt-5 grid gap-4">
          {loading ? <div className="flex items-center gap-3 text-slate-400"><Loader2 size={18} className="animate-spin" />Đang tải...</div> : sources.map((source) => <article key={source.id} className={`rounded-[24px] border p-5 ${source.is_active ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-black/10 opacity-60"}`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${source.source_tier === "P1" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200" : "border-violet-300/20 bg-violet-300/[0.06] text-violet-200"}`}>{source.source_tier}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">{kindLabels[source.source_kind] || source.source_kind}</span>{source.citation_allowed && <span className="rounded-full border border-cyan-300/15 px-2.5 py-1 text-[11px] text-cyan-200">Citation enabled</span>}</div><h3 className="mt-3 text-lg font-bold">{source.name}</h3><a href={`https://${source.domain}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-cyan-300">{source.domain}<ExternalLink size={13} /></a>{source.notes && <p className="mt-2 text-sm text-slate-500">{source.notes}</p>}</div><div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => edit(source)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/15 px-4 py-2 text-sm text-cyan-100"><Pencil size={15} />Sửa</button><button type="button" disabled={working === source.id} onClick={() => toggleActive(source)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 disabled:opacity-40">{source.is_active ? <ToggleRight size={17} className="text-emerald-300" /> : <ToggleLeft size={17} />} {source.is_active ? "Đang bật" : "Đang tắt"}</button></div></div></article>)}
        </div>
      </section>
    </AdminLayout>
  );
}
