import { useEffect, useMemo, useState } from "react";
import { Briefcase, CalendarClock, Copy, Edit3, FilePlus2, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { getEmploymentTypeLabel, getLocalizedJob, getWorkplaceTypeLabel, slugify } from "../../lib/careers";
import { formatVietnamDateTime, getPublicationState } from "../../lib/publication";
import { supabase } from "../../lib/supabaseClient";

const statusStyles = {
  published: "bg-emerald-300/10 text-emerald-200",
  scheduled: "bg-violet-300/10 text-violet-200",
  draft: "bg-amber-300/10 text-amber-200",
};

const statusLabels = {
  published: "Đã xuất bản",
  scheduled: "Đã lên lịch",
  draft: "Bản nháp",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("job_posts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    setJobs(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialJobs = async () => {
      const { data, error: fetchError } = await supabase
        .from("job_posts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (fetchError) setError(fetchError.message);
      setJobs(data || []);
      setLoading(false);
    };

    loadInitialJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredJobs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const publicationState = getPublicationState(job, now);
      const matchesStatus = status === "all" || publicationState === status;
      const searchText = `${job.title_vi || ""} ${job.title_en || ""} ${job.department_vi || ""} ${job.department_en || ""} ${job.slug || ""}`.toLowerCase();
      return matchesStatus && (!normalized || searchText.includes(normalized));
    });
  }, [jobs, query, status, now]);

  const deleteJob = async (job) => {
    const title = getLocalizedJob(job, "vi").title;
    if (!window.confirm(`Bạn có chắc muốn xóa vị trí “${title}”?`)) return;

    const { error: deleteError } = await supabase.from("job_posts").delete().eq("id", job.id);
    if (deleteError) {
      window.alert(`Không thể xóa vị trí: ${deleteError.message}`);
      return;
    }
    setJobs((current) => current.filter((item) => item.id !== job.id));
  };

  const duplicateJob = async (job) => {
    const baseTitle = job.title_vi || job.title_en || "Bản sao";
    const baseSlug = `${slugify(baseTitle)}-copy`;
    const copyNumbers = jobs
      .map((item) => item.slug?.match(new RegExp(`^${baseSlug}-(\\d+)$`)))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    const copyNumber = Math.max(0, ...copyNumbers) + 1;
    const { data: sessionData } = await supabase.auth.getSession();

    const payload = {
      slug: `${baseSlug}-${copyNumber}`,
      title_vi: job.title_vi ? `${job.title_vi} - Bản sao` : null,
      title_en: job.title_en ? `${job.title_en} - Copy` : null,
      summary_vi: job.summary_vi,
      summary_en: job.summary_en,
      content_vi: job.content_vi,
      content_en: job.content_en,
      department_vi: job.department_vi,
      department_en: job.department_en,
      location_vi: job.location_vi,
      location_en: job.location_en,
      employment_type: job.employment_type,
      workplace_type: job.workplace_type,
      application_deadline: job.application_deadline,
      status: "draft",
      published_at: null,
      created_by: sessionData.session?.user?.id || null,
    };

    const { error: duplicateError } = await supabase.from("job_posts").insert(payload);
    if (duplicateError) {
      window.alert(`Không thể nhân bản vị trí: ${duplicateError.message}`);
      return;
    }
    fetchJobs();
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Quản lý tuyển dụng</div>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Danh sách vị trí tuyển dụng</h1>
          <p className="mt-2 text-sm text-slate-400">Tạo, lưu nháp, hẹn giờ hoặc đăng ngay JD trên trang Careers.</p>
        </div>
        <Link to="/admin/jobs/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-[#071421] transition hover:-translate-y-0.5 hover:bg-cyan-200">
          <FilePlus2 size={18} /> Tạo JD mới
        </Link>
      </div>

      <div className="mt-7 grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[1fr_auto]">
        <label className="flex items-center rounded-2xl border border-white/10 bg-[#081321]/70 px-4 focus-within:border-cyan-300/35">
          <Search size={18} className="text-slate-500" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo chức danh, phòng ban hoặc đường dẫn..." className="w-full bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#081321] px-4 py-3 text-sm text-white outline-none">
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="draft">Bản nháp</option>
        </select>
      </div>

      <div className="mt-6 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035]">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" /></div>
        ) : error ? (
          <div className="p-8 text-red-200">Không thể tải dữ liệu tuyển dụng: {error}</div>
        ) : filteredJobs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="text-xl font-semibold">Chưa có vị trí tuyển dụng phù hợp</div>
            <p className="mt-2 text-sm text-slate-400">Hãy tạo JD đầu tiên hoặc thay đổi bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredJobs.map((job) => {
              const localized = getLocalizedJob(job, "vi");
              const publicationState = getPublicationState(job, now);

              return (
                <article key={job.id} className="grid gap-4 p-5 transition hover:bg-white/[0.025] md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/8 text-cyan-200">
                    <Briefcase size={23} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-cyan-300/10 px-3 py-1 font-semibold text-cyan-200">{localized.department || "Chưa phân phòng ban"}</span>
                      <span className={`rounded-full px-3 py-1 font-semibold ${statusStyles[publicationState]}`}>{statusLabels[publicationState]}</span>
                    </div>
                    <h2 className="mt-3 truncate text-lg font-semibold text-white">{localized.title}</h2>
                    <div className="mt-1 truncate text-sm text-slate-500">{getEmploymentTypeLabel(job.employment_type, "vi")} · {getWorkplaceTypeLabel(job.workplace_type, "vi")} · /careers/{job.slug}</div>
                    {publicationState === "scheduled" && (
                      <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-violet-200">
                        <CalendarClock size={14} /> Tự động đăng lúc {formatVietnamDateTime(job.published_at)} (UTC+7)
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:justify-end">
                    <button type="button" onClick={() => duplicateJob(job)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Nhân bản"><Copy size={17} /></button>
                    <Link to={`/admin/jobs/${job.id}/edit`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-cyan-200/30 hover:text-cyan-200" title="Chỉnh sửa"><Edit3 size={17} /></Link>
                    <button type="button" onClick={() => deleteJob(job)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:border-red-300/30 hover:text-red-200" title="Xóa"><Trash2 size={17} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
