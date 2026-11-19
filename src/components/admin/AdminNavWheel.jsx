import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { ADMIN_NAV, activeGroupId, activeItemPath } from "./adminNav";

const STEP = 360 / ADMIN_NAV.length;
const RADIUS = 150; // bán kính vòng (px) trong khung 380 × 380
const SIZE = 380;
const mod = (n, m) => ((n % m) + m) % m;

/**
 * Menu vòng xoay: các nhóm chức năng xếp trên một vòng tròn. Xoay (cuộn chuột, phím ←/→, kéo, hoặc bấm vào nhóm)
 * để đưa một nhóm lên đỉnh vòng; danh sách chức năng của nhóm đó hiện ở khung bên cạnh.
 */
export default function AdminNavWheel({ open, onClose }) {
  const location = useLocation();
  const currentPath = activeItemPath(location.pathname);
  const startIndex = Math.max(0, ADMIN_NAV.findIndex((g) => g.id === activeGroupId(location.pathname)));
  const [rotation, setRotation] = useState(-startIndex * STEP);
  const [dragging, setDragging] = useState(false);
  const wheelRef = useRef(null);
  const drag = useRef(null);
  const lastWheel = useRef(0);
  const firstLink = useRef(null);
  const justDragged = useRef(false);

  const reduce = useReducedMotion();
  // Vòng quay theo lò xo: có quán tính, hơi vượt rồi dừng đúng nhóm.
  const spring = useSpring(rotation, { stiffness: 150, damping: 19, mass: 0.9 });
  const counter = useTransform(spring, (v) => -v);
  useEffect(() => {
    if (dragging || reduce) spring.jump(rotation);
    else spring.set(rotation);
  }, [rotation, dragging, reduce, spring]);
  // Vòng nghiêng nhẹ theo vị trí chuột (hiệu ứng 3D).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-1, 1], [9, -9]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-1, 1], [-11, 11]), { stiffness: 120, damping: 18 });
  const onTilt = (event) => {
    if (reduce) return;
    mx.set(Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2)));
    my.set(Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2)));
  };

  const selected = mod(Math.round(-rotation / STEP), ADMIN_NAV.length);
  const group = ADMIN_NAV[selected];

  const rotateTo = useCallback((index) => {
    setRotation((current) => {
      // Đi đường ngắn nhất tới nhóm được chọn.
      const target = -index * STEP;
      const turns = Math.round((current - target) / 360);
      return target + turns * 360;
    });
  }, []);
  const stepBy = useCallback((delta) => setRotation((r) => Math.round(r / STEP) * STEP - delta * STEP), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        stepBy(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        stepBy(-1);
      } else if (event.key === "Enter" && document.activeElement === wheelRef.current) {
        event.preventDefault();
        firstLink.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    wheelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, stepBy]);

  const onWheel = (event) => {
    const now = Date.now();
    if (now - lastWheel.current < 220 || Math.abs(event.deltaY) + Math.abs(event.deltaX) < 4) return;
    lastWheel.current = now;
    stepBy((event.deltaY || event.deltaX) > 0 ? 1 : -1);
  };

  const angleOf = (event) => {
    const box = wheelRef.current.getBoundingClientRect();
    return (Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2)) * 180) / Math.PI;
  };
  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    drag.current = { start: angleOf(event), base: rotation, moved: false };
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    let delta = angleOf(event) - drag.current.start;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    if (!drag.current.moved && Math.abs(delta) < 4) return;
    if (!drag.current.moved) {
      drag.current.moved = true;
      wheelRef.current.setPointerCapture?.(event.pointerId);
      setDragging(true);
    }
    setRotation(drag.current.base + delta);
  };
  const onPointerUp = () => {
    if (drag.current?.moved) {
      setRotation((r) => Math.round(r / STEP) * STEP); // bám vào nhóm gần nhất
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
    }
    drag.current = null;
    setDragging(false);
  };

  if (!open) return null;
  const GroupIcon = group.icon;

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020812]/85 p-4 backdrop-blur-xl"
      role="dialog" aria-modal="true" aria-label="Menu vòng xoay"
      onClick={onClose}
      onPointerMove={onTilt}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
    >
      <button type="button" onClick={onClose} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-slate-300 hover:text-white" aria-label="Đóng menu">
        <X size={20} />
      </button>

      <div className="flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-14" onClick={(e) => e.stopPropagation()}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          style={{ rotateX, rotateY, transformPerspective: 1000 }}
        >
          <div
            ref={wheelRef}
            tabIndex={0}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative shrink-0 touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            style={{ width: SIZE, height: SIZE, maxWidth: "88vw", maxHeight: "88vw", cursor: dragging ? "grabbing" : "grab" }}
            aria-label={`Nhóm đang chọn: ${group.label}. Dùng phím mũi tên để xoay, Enter để chọn chức năng.`}
          >
            {/* Vòng nền và kim chỉ ở đỉnh */}
            <div className="absolute inset-[22px] rounded-full border border-cyan-200/15 bg-[radial-gradient(circle,rgba(34,211,238,0.10),rgba(13,23,38,0.6)_62%)]" />
            <div className="absolute inset-[78px] rounded-full border border-dashed border-white/10" />
            <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[12px] border-x-transparent border-t-cyan-300" />

            <motion.div className="absolute inset-0" style={{ rotate: spring }}>
              {ADMIN_NAV.map((g, i) => {
                const angle = (i * STEP * Math.PI) / 180;
                const x = SIZE / 2 + RADIUS * Math.sin(angle);
                const y = SIZE / 2 - RADIUS * Math.cos(angle);
                const Icon = g.icon;
                const isSelected = i === selected;
                return (
                  <button
                    key={g.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => !justDragged.current && rotateTo(i)}
                    className="absolute flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}
                    aria-label={g.label}
                  >
                    <motion.span
                      className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border text-center transition-colors ${
                        isSelected ? "border-cyan-200 bg-cyan-300 text-[#071421] shadow-[0_0_40px_rgba(34,211,238,0.45)]" : "border-white/10 bg-[#0d1726] text-slate-300 hover:border-cyan-200/40 hover:text-white"
                      }`}
                      style={{ rotate: counter }}
                      animate={{ scale: isSelected ? 1.12 : 1 }}
                      whileHover={{ scale: isSelected ? 1.16 : 1.08 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Icon size={22} />
                      <span className="px-1 text-[9.5px] font-bold uppercase leading-tight tracking-wide">{g.label}</span>
                    </motion.span>
                  </button>
                );
              })}
            </motion.div>

            {/* Tâm vòng */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-200/20 bg-[#0b1423] text-center">
              <motion.span key={group.id} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 320, damping: 18 }}>
                <GroupIcon size={28} className="text-cyan-300" />
              </motion.span>
              <div className="mt-2 px-3 text-sm font-bold">{group.label}</div>
              <div className="text-xs text-slate-500">{group.items.length} chức năng</div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
            <button type="button" onClick={() => stepBy(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:text-white" aria-label="Nhóm trước">
              <ChevronLeft size={17} />
            </button>
            Cuộn chuột, kéo vòng hoặc dùng phím mũi tên để xoay
            <button type="button" onClick={() => stepBy(1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 hover:text-white" aria-label="Nhóm sau">
              <ChevronRight size={17} />
            </button>
          </div>
        </motion.div>

        <div key={group.id} className="w-full max-w-sm rounded-[28px] border border-cyan-200/15 bg-[#0d1726]/95 p-5">
          <div className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">{group.label}</div>
          <motion.ul className="mt-4 space-y-2" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
            {group.items.map((item, index) => {
              const Icon = item.icon;
              const active = item.to && item.to === currentPath;
              const className = `flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition ${
                active ? "bg-cyan-300 text-[#071421]" : "border border-white/10 text-slate-200 hover:border-cyan-200/40 hover:bg-white/[0.05] hover:text-white"
              }`;
              return (
                <motion.li key={item.to || item.href} variants={{ hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0 } }}>
                  {item.external ? (
                    <a ref={index === 0 ? firstLink : undefined} href={item.href} target="_blank" rel="noreferrer noopener" className={className} onClick={onClose}>
                      <Icon size={18} /> {item.label} <ExternalLink size={14} className="ml-auto opacity-60" />
                    </a>
                  ) : (
                    <Link ref={index === 0 ? firstLink : undefined} to={item.to} className={className} onClick={onClose}>
                      <Icon size={18} /> {item.label}
                    </Link>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        </div>
      </div>
    </motion.div>
  );
}
