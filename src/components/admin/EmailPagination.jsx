export default function EmailPagination({ count, page, pageSize, onPageChange, onPageSizeChange, label = "người", busy = false }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <nav aria-label={`Phân trang ${label}`} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <label className="flex items-center gap-2">
        <select aria-label={`Số ${label} mỗi trang`} value={pageSize} disabled={busy}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="rounded-xl border border-white/10 bg-[#081321] px-3 py-2 text-white">
          {[5, 10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        {label}/trang
      </label>
      <span>{count ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, count)} / ${count}` : "0 kết quả"}</span>
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || page === 0} onClick={() => onPageChange(page - 1)}
          aria-label={`Trang trước ${label}`} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Trước</button>
        <span>Trang {page + 1}/{pages}</span>
        <button type="button" disabled={busy || page + 1 >= pages} onClick={() => onPageChange(page + 1)}
          aria-label={`Trang sau ${label}`} className="rounded-xl border border-white/10 px-3 py-2 disabled:opacity-30">Sau</button>
      </div>
    </nav>
  );
}
