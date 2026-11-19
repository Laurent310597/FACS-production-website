import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CalendarRange, CornerDownLeft, FileText, Layers, Loader2, Search } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { getServiceContent, services } from "../../data/services";
import { industries } from "../../data/industries";
import { fallbackPosts, getLocalizedPost } from "../../lib/insights";
import { fallbackLegalEvents, formatLegalDate, getLocalizedLegalEvent } from "../../lib/legalCalendar";
import { supabase } from "../../lib/supabaseClient";
import { siteNavItems, siteResourceItems } from "./siteLinks";

const fold = (text = "") => text.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

// Bài viết và mốc pháp lý chỉ tải khi mở ô tìm lần đầu (giữ lại cho các lần sau).
let remoteCache = null;
async function loadRemote() {
  if (remoteCache) return remoteCache;
  if (!supabase) {
    remoteCache = { posts: fallbackPosts, events: fallbackLegalEvents };
    return remoteCache;
  }
  const [posts, events] = await Promise.all([
    supabase.from("posts").select("*").eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(200),
    supabase.from("legal_calendar_events").select("*").eq("status", "published").eq("verification_status", "verified").order("event_date", { ascending: true }).limit(400),
  ]);
  remoteCache = { posts: posts.data || [], events: events.data || [] };
  return remoteCache;
}

/** Ô Tìm nhanh của website (Ctrl/⌘ + K): trang, dịch vụ, lĩnh vực, tiện ích, bài Insights, mốc Lịch pháp lý. */
export default function SiteSearch({ open, onClose }) {
  const { language } = useLanguage();
  const isVi = language === "vi";
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [remote, setRemote] = useState(remoteCache);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    if (!remoteCache) {
      loadRemote()
        .then(setRemote)
        .catch(() => setRemote({ posts: [], events: [] }));
    }
    return () => clearTimeout(t);
  }, [open]);

  const loading = open && !remote;

  const entries = useMemo(() => {
    const pageHint = isVi ? "Trang" : "Page";
    const list = [
      ...siteNavItems(isVi).map(([to, label]) => ({ key: to, to, label, hint: pageHint, icon: Layers })),
      ...services.map((s) => ({ key: `s-${s.slug}`, to: `/services/${s.slug}`, label: getServiceContent(s, isVi).title, hint: isVi ? "Dịch vụ" : "Service", icon: s.icon })),
      ...industries.map((i) => ({ key: `i-${i.slug}`, to: `/industries/${i.slug}`, label: isVi ? i.titleVi : i.title, hint: isVi ? "Lĩnh vực" : "Industry", icon: i.icon })),
      ...siteResourceItems(isVi).map(([to, label, , icon]) => ({ key: `r-${to}`, to, label, hint: isVi ? "Tiện ích" : "Resource", icon })),
    ];
    for (const post of remote?.posts || []) {
      const p = getLocalizedPost(post, language);
      if (p.slug) list.push({ key: `p-${post.id || p.slug}`, to: `/insights/${p.slug}`, label: p.title, hint: "Insights", icon: FileText, extra: p.excerpt });
    }
    for (const ev of remote?.events || []) {
      const e = getLocalizedLegalEvent(ev, language);
      if (e.title) list.push({ key: `e-${ev.id || e.title}-${ev.event_date}`, to: "/legal-calendar", label: e.title, hint: formatLegalDate(ev.event_date, language), icon: CalendarRange, extra: e.summary });
    }
    return list.map((e) => ({ ...e, haystack: fold(`${e.label} ${e.hint} ${e.extra || ""}`) }));
  }, [remote, language, isVi]);

  const results = useMemo(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const found = words.length ? entries.filter((e) => words.every((w) => e.haystack.includes(w))) : entries.slice(0, 8 + services.length);
    return found.slice(0, 40);
  }, [entries, query]);

  const close = () => {
    setQuery("");
    setIndex(0);
    onClose();
  };
  const run = (entry) => {
    if (!entry) return;
    close();
    navigate(entry.to);
  };
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[index]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-[#030913]/70 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
          role="dialog" aria-modal="true" aria-label={isVi ? "Tìm nhanh trên website FACS" : "Search FACS website"}
        >
          <motion.div
            className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-cyan-200/20 bg-[#0d1726]/97 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_80px_rgba(34,211,238,0.12)]"
            initial={{ opacity: 0, y: -14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-5">
              <Search size={19} className="text-cyan-300" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
                onKeyDown={onKeyDown}
                placeholder={isVi ? "Tìm dịch vụ, bài Insights, mốc pháp lý…" : "Search services, Insights, legal deadlines…"}
                className="h-16 w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500 focus-visible:outline-none"
                role="combobox" aria-expanded="true" aria-controls="site-search-list"
              />
              {loading && <Loader2 size={17} className="animate-spin text-slate-500" />}
              <kbd className="rounded-md border border-white/[0.14] px-1.5 py-0.5 text-[11px] text-slate-400">Esc</kbd>
            </div>
            <ul ref={listRef} id="site-search-list" role="listbox" className="max-h-[56vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-10 text-center text-sm text-slate-400">{isVi ? `Không tìm thấy kết quả cho “${query}”.` : `No results for “${query}”.`}</li>}
              {results.map((entry, i) => {
                const Icon = entry.icon || Layers;
                const active = i === index;
                return (
                  <li
                    key={entry.key}
                    data-index={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(entry)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${active ? "bg-cyan-400/[0.12] text-white shadow-[inset_3px_0_0_#22D3EE]" : "text-slate-300"}`}
                  >
                    <Icon size={18} className={active ? "text-cyan-300" : "text-slate-500"} />
                    <span className="min-w-0 truncate font-semibold">{entry.label}</span>
                    <span className="shrink-0 text-xs text-slate-500">{entry.hint}</span>
                    <span className="ml-auto shrink-0 text-slate-500">{active && <CornerDownLeft size={15} />}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-white/[0.08] px-5 py-3 text-[11px] text-slate-500">
              <span>↑ ↓ {isVi ? "chọn" : "move"}</span>
              <span>Enter {isVi ? "mở" : "open"}</span>
              <span className="ml-auto">Ctrl / ⌘ + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
