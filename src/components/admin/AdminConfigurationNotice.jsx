import { Database, FileCode2, KeyRound } from "lucide-react";

export default function AdminConfigurationNotice() {
  return (
    <main data-no-translate className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(0,183,255,0.12),transparent_30%),linear-gradient(135deg,#0d1726_0%,#101b2f_48%,#132238_100%)] px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-cyan-200/15 bg-white/[0.045] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">FACS Insights CMS</div>
        <h1 className="mt-4 text-3xl font-bold md:text-5xl">Cần kết nối Supabase trước khi đăng nhập</h1>
        <p className="mt-5 leading-relaxed text-slate-300">
          Phần quản trị đã được cài đặt trong website. Bạn chỉ cần tạo một Supabase project, chạy file SQL và thêm hai biến môi trường theo hướng dẫn đi kèm source.
        </p>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {[
            [Database, "1. Tạo database", "Chạy file supabase/setup.sql trong SQL Editor."],
            [KeyRound, "2. Tạo admin", "Tạo user thủ công trong Authentication > Users."],
            [FileCode2, "3. Thêm biến môi trường", "Thêm URL và Publishable Key vào Vercel."],
          ].map(([Icon, title, description]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-black/10 p-5">
              <Icon className="text-cyan-300" size={22} />
              <div className="mt-4 font-semibold">{title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-400">{description}</div>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-4 text-sm leading-relaxed text-amber-100/90">
          Website công khai vẫn hoạt động bình thường trong thời gian chưa kết nối; ba bài mẫu hiện tại sẽ tiếp tục được hiển thị.
        </p>
      </div>
    </main>
  );
}
