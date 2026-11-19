// Khung chờ tải nhấp nháy (skeleton) thay cho chữ "Đang tải…".
export function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`facs-skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

/** Danh sách dạng dòng (bảng, hàng đợi). */
export function SkeletonRows({ rows = 5, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Đang tải">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className={`h-3.5 ${i % 2 ? "w-2/5" : "w-1/2"}`} />
            <Skeleton className={`h-3 ${i % 3 ? "w-3/4" : "w-2/3"}`} />
          </div>
          <Skeleton className="hidden h-7 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Lưới thẻ (nguồn, mốc pháp lý...). */
export function SkeletonCards({ count = 4, className = "grid gap-4 xl:grid-cols-2" }) {
  return (
    <div className={className} role="status" aria-label="Đang tải">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Khối form (cài đặt). */
export function SkeletonForm({ fields = 5 }) {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className={i === fields - 1 ? "h-32 w-full rounded-xl" : "h-10 w-full rounded-xl"} />
        </div>
      ))}
    </div>
  );
}
