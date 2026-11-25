import AnimatedCounter from "../AnimatedCounter";

/**
 * Khối minh hoạ bên phải phần đầu trang (Giới thiệu, Dịch vụ): đọc theo thứ tự
 * thông điệp chính → số liệu → phạm vi tư vấn; khoảng cách đều, biểu tượng cùng kiểu, cỡ chữ theo cấp bậc.
 */
function IconBadge({ icon: Icon, size = 22, className = "" }) {
  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-400/10 text-cyan-300 ${className}`}>
      <Icon size={size} strokeWidth={1.9} />
    </span>
  );
}

export default function HeroInsightPanel({ feature, stats, scope }) {
  return (
    <div className="site-card flex flex-col gap-5 rounded-[36px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl sm:p-6 lg:p-7">
      {/* 1. Thông điệp chính */}
      <div className="site-card rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-cyan-500/[0.14] via-cyan-500/[0.06] to-blue-500/[0.12] p-7 lg:p-8">
        <IconBadge icon={feature.icon} size={24} />
        <div className="font-heading mt-6 text-2xl font-bold leading-snug text-balance lg:text-[1.75rem]">{feature.title}</div>
        <p className="mt-3 leading-relaxed text-slate-400 text-pretty">{feature.desc}</p>
      </div>

      {/* 2. Số liệu */}
      <div className="grid grid-cols-2 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="site-card site-tile flex flex-col rounded-3xl border border-white/10 bg-[#111827]/80 p-6">
            <IconBadge icon={stat.icon} />
            <AnimatedCounter value={stat.value} className="mt-5 block text-4xl font-bold leading-none" />
            <div className="mt-2 text-sm text-slate-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 3. Phạm vi tư vấn */}
      <div className="site-card flex items-center gap-5 rounded-3xl border border-white/10 bg-[#111827]/80 p-6">
        <IconBadge icon={scope.icon} />
        <div className="min-w-0">
          <div className="font-heading text-xl font-bold leading-snug">{scope.title}</div>
          <div className="mt-1 text-sm text-slate-400">{scope.subtitle}</div>
        </div>
      </div>
    </div>
  );
}
