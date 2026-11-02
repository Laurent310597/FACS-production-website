import { useEffect, useState } from "react";
import { countEmailHistory, listEmailHistory, vietnamToday } from "../../lib/emailHistory";
import { publicationDateBounds } from "../../lib/insightPostSearch";
import { supabase } from "../../lib/supabaseClient";
import EmailPagination from "./EmailPagination";

export default function EmailSendHistory({ refresh }) {
  const [draft, setDraft] = useState(() => ({ from: vietnamToday(), to: vietnamToday() }));
  const [filters, setFilters] = useState(draft);
  const [counts, setCounts] = useState(null);
  const [logs, setLogs] = useState([]);
  const [count, setCount] = useState(0);
  const [details, setDetails] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setCounts(null);
    const load = async () => {
      try {
        const [summary, rows] = await Promise.all([
          countEmailHistory(supabase, filters),
          details ? listEmailHistory(supabase, filters, page, pageSize) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (rows?.error) throw new Error(rows.error.message);
        setCounts(summary);
        setLogs(rows?.data || []);
        setCount(rows?.count || 0);
        if (rows && page > 0 && page * pageSize >= rows.count) setPage(Math.max(0, Math.ceil(rows.count / pageSize) - 1));
      } catch (issue) {
        if (!cancelled) { setError(issue.message); setLogs([]); }
      } finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [filters, details, page, pageSize, refresh]);

  const apply = (event) => {
    event.preventDefault();
    try {
      if (!draft.from || !draft.to) throw new Error("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
      publicationDateBounds(draft.from, draft.to);
      setFilterError(""); setPage(0); setFilters({ ...draft });
    } catch (issue) { setFilterError(issue.message); }
  };
  const today = () => {
    const next = { from: vietnamToday(), to: vietnamToday() };
    setDraft(next); setFilters(next); setPage(0); setFilterError("");
  };
  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.035] p-5 md:p-7">
      <h2 className="text-xl font-semibold">Lịch sử gửi email</h2>
      <p className="mt-2 text-sm text-slate-400">Số lượt gửi trong ngày hoặc khoảng ngày đã chọn, theo giờ Việt Nam. Bao gồm gửi thử, gửi Audience và gửi riêng.</p>
      <form onSubmit={apply} className="mt-5 flex flex-wrap items-end gap-3">
        {[['from', 'Từ ngày'], ['to', 'Đến ngày']].map(([key, label]) => (
          <label key={key} className="text-sm text-slate-400">{label}
            <input type="date" required value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
              className="mt-2 block rounded-xl border border-white/10 bg-[#081321] px-3 py-2 text-white [color-scheme:dark]" />
          </label>
        ))}
        <button type="submit" className="rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-[#071421]">Lọc lịch sử</button>
        <button type="button" onClick={today} className="rounded-xl border border-white/10 px-4 py-2 text-slate-300">Hôm nay</button>
      </form>
      {filterError && <p role="alert" className="mt-3 text-sm text-red-200">{filterError}</p>}
      <p className="mt-4 text-xs text-slate-500">Đang xem: {filters.from.split('-').reverse().join('/')} – {filters.to.split('-').reverse().join('/')} (UTC+7)</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-200">Không thể tải lịch sử: {error}</p>}
      <div aria-live="polite" aria-busy={loading} className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[["total", "Tổng lượt gửi"], ["sent", "Đã chuyển Microsoft 365"], ["failed", "Gửi thất bại"], ["processing", "Đang xử lý"]].map(([key, label]) => (
          <div key={key} className="rounded-2xl border border-white/10 bg-[#081321]/60 p-4">
            <div className="text-xs text-slate-400">{label}</div><div className="mt-2 text-2xl font-semibold">{loading ? "…" : counts?.[key] ?? "—"}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Một lượt gửi có thể gồm nhiều người nhận Bcc. Microsoft 365 tiếp nhận yêu cầu gửi chưa xác nhận thư đã đến từng hộp thư; cần đối chiếu thư báo lỗi hoặc Message Trace.</p>
      <button type="button" aria-expanded={details} onClick={() => { setDetails((current) => !current); setPage(0); }}
        className="mt-4 rounded-xl border border-cyan-200/20 px-4 py-2 text-sm font-semibold text-cyan-100">{details ? "Ẩn chi tiết lượt gửi" : "Xem chi tiết lượt gửi"}</button>
      {details && <>
        <div className="mt-5 overflow-x-auto" aria-busy={loading}>
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500"><tr>{["Thời gian (VN)", "Bài viết", "Loại", "Trạng thái", "Bcc", "Lỗi"].map((label) => <th key={label} className="pb-3">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/10">
              {!loading && logs.map((log) => <tr key={log.id}>
                <td className="py-3 pr-3 text-slate-400">{new Date(log.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</td>
                <td className="max-w-48 truncate py-3 pr-3" title={log.posts?.title_vi || log.posts?.title_en}>{log.posts?.title_vi || log.posts?.title_en || "Kiểm tra hộp thư"}</td>
                <td className="py-3 pr-3">{log.delivery_type === "test" ? "Email thử" : log.delivery_scope === "single" ? "Gửi riêng" : log.delivery_scope === "selected" ? "Khách đã chọn" : "Audience"}</td>
                <td className={`py-3 pr-3 ${log.status === "failed" ? "text-red-200" : "text-emerald-200"}`}>{({ sent: "Đã chuyển Microsoft 365", failed: "Gửi thất bại", processing: "Đang xử lý", skipped: "Đã bỏ qua" })[log.status] || log.status}</td>
                <td className="py-3 pr-3 text-slate-400">{log.delivery_scope === "single" ? log.bcc_addresses?.[0] || "1 khách hàng" : log.bcc_count}</td>
                <td className="max-w-52 truncate py-3 text-red-200" title={log.error_message || ""}>{log.error_message || "—"}</td>
              </tr>)}
              {(loading || !logs.length) && <tr><td colSpan={6} className="py-8 text-center text-slate-500">{loading ? "Đang tải…" : "Không có lượt gửi trong khoảng ngày này."}</td></tr>}
            </tbody>
          </table>
        </div>
        <EmailPagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} label="lượt gửi" busy={loading} />
      </>}
    </section>
  );
}
