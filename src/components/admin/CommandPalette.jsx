import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, ExternalLink, Globe, Search } from "lucide-react";
import { ADMIN_NAV, PUBLIC_SITE_LINKS, foldVi } from "./adminNav";

function buildEntries() {
  const admin = ADMIN_NAV.flatMap((group) =>
    group.items.map((item) => ({
      key: item.to || item.href,
      label: item.label,
      hint: group.label,
      icon: item.icon,
      to: item.to,
      href: item.external ? item.href : null,
    })),
  );
  const site = PUBLIC_SITE_LINKS.map((link) => ({ key: `site:${link.href}`, label: link.label, hint: "Xem website", icon: Globe, href: link.href }));
  return [...admin, ...site].map((e) => ({ ...e, haystack: foldVi(`${e.label} ${e.hint}`) }));
}

/** Bảng lệnh tìm nhanh (Ctrl/⌘ + K): gõ để nhảy tới bất kỳ trang nào của CMS hoặc mở website. */
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const entries = useMemo(() => buildEntries(), []);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const results = useMemo(() => {
    const words = foldVi(query).split(/\s+/).filter(Boolean);
    return words.length ? entries.filter((e) => words.every((w) => e.haystack.includes(w))) : entries;
  }, [entries, query]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const close = () => {
    setQuery("");
    setIndex(0);
    onClose();
  };

  const run = (entry) => {
    if (!entry) return;
    close();
    if (entry.to) navigate(entry.to);
    else window.open(entry.href, "_blank", "noopener,noreferrer");
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-[#020409]/70 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={close}
          role="dialog" aria-modal="true" aria-label="Tìm nhanh trong CMS"
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-[20px] border border-cyan-300/20 bg-cms-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
              <Search size={18} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
                onKeyDown={onKeyDown}
                placeholder="Tìm trang: bài viết, nhắc công nợ, mốc pháp lý…"
                className="h-14 w-full bg-transparent text-[15px] text-ink-1 outline-none placeholder:text-[#6A7BA3]"
                role="combobox" aria-expanded="true" aria-controls="facs-cmdk-list" aria-activedescendant={results[index] ? `cmdk-${index}` : undefined}
              />
              <kbd className="rounded-md border border-white/[0.12] px-1.5 py-0.5 text-[11px] text-ink-3">Esc</kbd>
            </div>
            <ul ref={listRef} id="facs-cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-ink-3">Không có trang nào khớp “{query}”.</li>}
              {results.map((entry, i) => {
                const Icon = entry.icon;
                const active = i === index;
                return (
                  <li
                    key={entry.key}
                    id={`cmdk-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(entry)}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-cyan-300/[0.12] text-ink-1 shadow-[inset_3px_0_0_#FF6B35]" : "text-ink-2"}`}
                  >
                    <Icon size={17} className={active ? "text-cyan-200" : "text-ink-3"} />
                    <span className="font-semibold">{entry.label}</span>
                    <span className="text-xs text-ink-3">{entry.hint}</span>
                    <span className="ml-auto text-ink-3">{entry.to ? active && <CornerDownLeft size={15} /> : <ExternalLink size={14} />}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-white/[0.08] px-4 py-2.5 text-[11px] text-ink-3">
              <span><kbd className="font-sans">↑ ↓</kbd> chọn</span>
              <span><kbd className="font-sans">Enter</kbd> mở</span>
              <span className="ml-auto">Ctrl / ⌘ + K để mở lại</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
