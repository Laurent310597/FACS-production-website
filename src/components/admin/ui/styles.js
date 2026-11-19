// Kiểu dáng dùng chung cho CMS (Đợt 2): 3 mức bo góc (8 / 12 / 20 px), nút và ô nhập cao 40 px.
// Trang nào cũng lấy từ đây để giao diện đồng bộ.

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60";

/** Nút chính: tối đa một nút mỗi màn hình. Khi khoá trông khác hẳn lúc dùng được. */
export const btnPrimary = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-[#160800] transition hover:bg-brand-hover active:bg-brand-press disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-ink-3 ${focus}`;

/** Nút phụ: viền, nền ô nhập. */
export const btnSecondary = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-cms-2 px-4 text-sm font-semibold text-ink-1 transition hover:border-cyan-300/50 hover:bg-cms-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;

/** Nút nhẹ: chỉ chữ, dùng trong hàng thao tác dày. */
export const btnGhost = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink-2 transition hover:bg-white/[0.06] hover:text-ink-1 disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;

/** Nút nguy hiểm (xoá). */
export const btnDanger = `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-40 ${focus}`;

export const card = "facs-card rounded-[20px] border border-cyan-300/[0.14] bg-cms-1 p-5 md:p-6";
export const input = "w-full min-h-10 rounded-xl border border-white/[0.1] bg-cms-2 px-3 py-2 text-sm text-ink-1 outline-none transition placeholder:text-[#6A7BA3] focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15";
export const label = "mb-1.5 block text-[13px] font-semibold text-ink-2";
export const badge = "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold";

/** Khối con bên trong thẻ: không viền, nền rất nhạt, để tránh cảm giác "thẻ chồng thẻ". */
export const subtle = "rounded-2xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.05]";
