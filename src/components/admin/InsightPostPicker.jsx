import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, RotateCcw, Search, X } from "lucide-react";
import { emailStatusLabels } from "../../lib/emailNotifications";
import { formatVietnamDateTime, getPublicationState } from "../../lib/publication";
import { EMPTY_POST_FILTERS, INSIGHT_POST_PAGE_SIZE, publicationDateBounds, searchInsightPosts } from "../../lib/insightPostSearch";
import { supabase } from "../../lib/supabaseClient";

const publicationLabels = { draft: "Bản nháp", published: "Đã xuất bản", scheduled: "Đã lên lịch" };
const fieldClass = "mt-2 w-full min-w-0 rounded-xl border border-white/15 bg-[#081321] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/60 [color-scheme:dark]";

export default function InsightPostPicker({ selectedId, onSelect, onClose }) {
  const dialogRef = useRef(null);
  const [filters, setFilters] = useState(EMPTY_POST_FILTERS);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState({ rows: [], count: 0, loading: true, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        publicationDateBounds(filters.from, filters.to);
        const { data, count, error } = await searchInsightPosts(supabase, filters, page).abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        const lastPage = Math.max(0, Math.ceil((count || 0) / INSIGHT_POST_PAGE_SIZE) - 1);
        if (page > lastPage) { setPage(lastPage); return; }
        setResult({ rows: data || [], count: count || 0, loading: false, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ rows: [], count: 0, loading: false, error: error.message || "Không thể tải bài viết. Vui lòng thử lại." });
      }
    }, filters.keyword ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, page, retry]);

  const update = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
    setResult((current) => ({ ...current, loading: true, error: "" }));
  };
  const reset = () => {
    setFilters({ ...EMPTY_POST_FILTERS });
    setPage(0);
    setResult((current) => ({ ...current, loading: true, error: "" }));
  };
  const changePage = (next) => { setPage(next); setResult((current) => ({ ...current, loading: true })); };
  const pages = Math.max(1, Math.ceil(result.count / INSIGHT_POST_PAGE_SIZE));

  return (
    <dialog ref={dialogRef} aria-labelledby="insight-picker-title" onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-[28px] border border-cyan-200/25 bg-[#0d1b2b] p-0 text-white shadow-2xl backdrop:bg-[#020811]/85 backdrop:backdrop-blur-sm">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#0d1b2b] px-5 py-5 md:px-7">
        <div><h2 id="insight-picker-title" className="text-2xl font-bold">Tìm và chọn bài viết</h2><p className="mt-1 text-sm text-slate-300">Tìm trong tiêu đề và nội dung tiếng Việt, tiếng Anh.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng chọn bài viết" className="rounded-xl border border-white/15 p-2.5 text-slate-300 hover:text-white"><X size={20} /></button>
      </div>
      <div className="p-5 md:p-7">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-slate-300 md:col-span-2">Từ khóa
            <span className="relative mt-2 block"><Search size={17} className="absolute left-3 top-3 text-slate-400" /><input autoFocus value={filters.keyword} onChange={(event) => update("keyword", event.target.value)} placeholder="Ví dụ: thuế, hóa đơn, đầu tư..." className={`${fieldClass} !mt-0 pl-10`} /></span>
          </label>
          <label className="text-xs font-semibold text-slate-300">Trạng thái bài viết<select value={filters.publication} onChange={(event) => update("publication", event.target.value)} className={fieldClass}><option value="all">Tất cả trạng thái</option>{Object.entries(publicationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-300">Trạng thái email<select value={filters.email} onChange={(event) => update("email", event.target.value)} className={fieldClass}><option value="all">Tất cả trạng thái email</option>{Object.entries(emailStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="text-xs font-semibold text-slate-300">Ngày đăng từ<input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => update("from", event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-semibold text-slate-300">Ngày đăng đến<input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => update("to", event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-semibold text-slate-300">Sắp xếp<select value={filters.sort} onChange={(event) => update("sort", event.target.value)} className={fieldClass}><option value="newest">Ngày đăng mới nhất</option><option value="oldest">Ngày đăng cũ nhất</option></select></label>
          <button type="button" onClick={reset} className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-cyan-200/40"><RotateCcw size={16} /> Xóa bộ lọc</button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">Ngày đăng tính theo giờ Việt Nam, bao gồm cả ngày bắt đầu và kết thúc. Bài nháp chưa có ngày đăng chỉ xuất hiện khi không lọc ngày.</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300" aria-live="polite"><span>{result.loading ? "Đang tìm bài viết..." : `${result.count} bài viết phù hợp`}</span><span className="text-xs">Bộ lọc không thay đổi bài đang chọn.</span></div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/15" aria-busy={result.loading}>
          {result.loading ? <div className="flex min-h-52 items-center justify-center gap-3 text-slate-300"><Loader2 size={20} className="animate-spin text-cyan-300" /> Đang tải bài viết...</div>
            : result.error ? <div role="alert" className="p-6 text-sm text-red-200">{result.error}<button type="button" onClick={() => { setResult((current) => ({ ...current, loading: true })); setRetry((current) => current + 1); }} className="ml-3 underline">Thử lại</button></div>
              : !result.rows.length ? <div className="px-6 py-12 text-center text-sm text-slate-300">Không có bài viết phù hợp. Hãy đổi từ khóa hoặc xóa bộ lọc.</div>
                : <div className="divide-y divide-white/10">{result.rows.map((post) => {
                  const selected = post.id === selectedId;
                  return <button key={post.id} type="button" onClick={() => onSelect(post)} aria-label={`Chọn bài ${post.title_vi || post.title_en || "chưa có tiêu đề"}`} aria-pressed={selected}
                    className={`grid w-full gap-3 p-4 text-left transition hover:bg-cyan-300/10 md:grid-cols-[minmax(0,1fr)_160px_150px_85px] md:items-center ${selected ? "bg-cyan-300/10" : "bg-[#081321]/40"}`}>
                    <span className="min-w-0"><span className="block line-clamp-2 font-semibold text-white">{post.title_vi || post.title_en || "Bài viết chưa có tiêu đề"}</span>{post.title_en && post.title_vi && <span className="mt-1 block truncate text-xs text-slate-300">{post.title_en}</span>}<span className="mt-1 block line-clamp-1 text-xs text-slate-400">{post.excerpt_vi || post.excerpt_en || "Chưa có mô tả ngắn"}</span></span>
                    <span className="text-xs leading-relaxed text-slate-300">{post.published_at ? formatVietnamDateTime(post.published_at) : "Chưa có ngày đăng"}</span>
                    <span className="text-xs leading-relaxed"><span className="block text-cyan-100">{publicationLabels[getPublicationState(post)] || "Bản nháp"}</span><span className="mt-1 block text-slate-300">{emailStatusLabels[post.email_notification_status] || "Chưa cấu hình email"}</span></span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${selected ? "text-cyan-200" : "text-slate-200"}`}>{selected ? <><CheckCircle2 size={16} /> Đang chọn</> : <>Chọn bài <ChevronRight size={15} /></>}</span>
                  </button>;
                })}</div>}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span>{result.count ? `${page * INSIGHT_POST_PAGE_SIZE + 1}–${Math.min((page + 1) * INSIGHT_POST_PAGE_SIZE, result.count)} / ${result.count} bài viết` : "0 bài viết"}</span>
          <div className="flex items-center gap-3"><button type="button" aria-label="Trang bài viết trước" disabled={result.loading || page === 0} onClick={() => changePage(page - 1)} className="rounded-xl border border-white/15 p-2 disabled:opacity-30"><ChevronLeft size={18} /></button><span>Trang {page + 1}/{pages}</span><button type="button" aria-label="Trang bài viết sau" disabled={result.loading || page + 1 >= pages} onClick={() => changePage(page + 1)} className="rounded-xl border border-white/15 p-2 disabled:opacity-30"><ChevronRight size={18} /></button></div>
        </div>
      </div>
    </dialog>
  );
}
