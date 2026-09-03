import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const INTRO_DURATION = 4600;
const REDUCED_INTRO_DURATION = 3000;
const DEPARTURE_LEAD = 1050;
const SESSION_KEY = "facs_cinematic_intro_v1_seen";

const CAPABILITIES = [
  { code: "01", label: "Finance", className: "capability-finance" },
  { code: "02", label: "Tax", className: "capability-tax" },
  { code: "03", label: "Legal", className: "capability-legal" },
  { code: "04", label: "Operations", className: "capability-operations" },
];

function rotatePoint(point, rotationX, rotationY, rotationZ) {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return {
    x: x2 * cosZ - y1 * sinZ,
    y: x2 * sinZ + y1 * cosZ,
    z: z2,
  };
}

function easeInOut(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function CinematicField({ reducedMotion }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return undefined;

    let frameId;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetPointerX = 0;
    let targetPointerY = 0;
    const startedAt = performance.now();

    const particleCount = window.innerWidth < 720 ? 58 : 112;
    const particles = Array.from({ length: particleCount }, (_, index) => ({
      angle: (index / particleCount) * Math.PI * 2 + Math.random() * 0.36,
      radius: 90 + Math.random() * 330,
      depth: -260 + Math.random() * 520,
      speed: 0.3 + Math.random() * 0.75,
      size: 0.55 + Math.random() * 1.65,
      offset: Math.random() * Math.PI * 2,
    }));

    const ringColors = [
      [103, 232, 249],
      [45, 212, 191],
      [96, 165, 250],
      [129, 140, 248],
    ];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointer = (event) => {
      targetPointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.28;
      targetPointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 0.16;
    };

    const project = (point, focalLength, cameraDistance, zoom) => {
      const denominator = Math.max(120, cameraDistance - point.z);
      const scale = (focalLength / denominator) * zoom;
      return {
        x: width / 2 + point.x * scale,
        y: height / 2 + point.y * scale,
        scale,
        depth: point.z,
      };
    };

    const draw = (now) => {
      const elapsed = now - startedAt;
      const progress = reducedMotion ? 0.58 : Math.min(elapsed / INTRO_DURATION, 1);
      const arrival = easeOutCubic(clamp(progress / 0.34));
      const departure = easeInOut(clamp((progress - 0.77) / 0.23));
      const breathingWindow = clamp((progress - 0.28) / 0.44);
      const breathing = Math.sin(breathingWindow * Math.PI) * 0.022;
      const zoom = 0.72 + arrival * 0.27 + breathing + departure * 1.62;
      const focalLength = Math.min(width, height) * 0.92;
      const cameraDistance = 690;
      const baseRadius = Math.min(width, height) * 0.305;

      pointerX += (targetPointerX - pointerX) * 0.032;
      pointerY += (targetPointerY - pointerY) * 0.032;

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";

      particles.forEach((particle, index) => {
        const drift = reducedMotion ? 0 : elapsed * 0.00008 * particle.speed;
        const radius = particle.radius * (1.2 - arrival * 0.13 - departure * 0.17);
        const rawPoint = {
          x: Math.cos(particle.angle + drift) * radius,
          y: Math.sin(particle.angle * 1.21 + particle.offset) * radius * 0.54,
          z: particle.depth + Math.sin(particle.offset + drift * 7) * 72,
        };
        const rotated = rotatePoint(rawPoint, pointerY, pointerX, arrival * 0.055);
        const point = project(rotated, focalLength, cameraDistance, zoom);
        const alpha = Math.max(0.08, Math.min(0.7, 0.18 + point.scale * 0.48));
        context.beginPath();
        context.arc(point.x, point.y, particle.size * Math.max(0.55, point.scale), 0, Math.PI * 2);
        context.fillStyle = `rgba(103, 232, 249, ${alpha})`;
        context.fill();

        if (index % 7 === 0) {
          context.beginPath();
          context.moveTo(point.x, point.y);
          context.lineTo(width / 2, height / 2);
          context.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.07})`;
          context.lineWidth = 0.5;
          context.stroke();
        }
      });

      ringColors.forEach((color, ringIndex) => {
        const pointCount = window.innerWidth < 720 ? 42 : 68;
        const points = [];
        const ringRadius = baseRadius * (0.8 + ringIndex * 0.105);
        const spread = 1.16 - arrival * 0.11 - departure * 0.06;
        const rotation = elapsed * 0.000155 * (ringIndex % 2 === 0 ? 1 : -1);

        for (let index = 0; index <= pointCount; index += 1) {
          const angle = (index / pointCount) * Math.PI * 2;
          const rawPoint = {
            x: Math.cos(angle) * ringRadius * spread,
            y: Math.sin(angle) * ringRadius * spread,
            z: Math.sin(angle * 2 + ringIndex) * 18,
          };
          const rotated = rotatePoint(
            rawPoint,
            0.48 + ringIndex * 0.33 + pointerY,
            -0.42 + ringIndex * 0.28 + pointerX,
            rotation + ringIndex * 0.37,
          );
          points.push(project(rotated, focalLength, cameraDistance, zoom));
        }

        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.closePath();
        context.strokeStyle = `rgba(${color.join(", ")}, ${0.18 + ringIndex * 0.045})`;
        context.lineWidth = 0.75 + ringIndex * 0.14;
        context.shadowColor = `rgba(${color.join(", ")}, 0.55)`;
        context.shadowBlur = 9;
        context.stroke();

        const markerOffset = elapsed * 0.014 + ringIndex * 17;
        const markerIndex = Number.isFinite(markerOffset)
          ? Math.floor(((markerOffset % pointCount) + pointCount) % pointCount)
          : 0;
        const marker = points[markerIndex] || points[0];
        if (!marker) return;
        context.beginPath();
        context.arc(marker.x, marker.y, 2.2 + marker.scale * 1.4, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color.join(", ")}, 0.9)`;
        context.shadowBlur = 18;
        context.fill();
      });

      const glowRadius = Math.max(70, Math.min(width, height) * (0.095 + departure * 0.18));
      const glow = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        glowRadius,
      );
      glow.addColorStop(0, `rgba(165, 243, 252, ${0.16 + arrival * 0.12})`);
      glow.addColorStop(0.3, `rgba(34, 211, 238, ${0.1 + arrival * 0.08})`);
      glow.addColorStop(1, "rgba(14, 116, 144, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      context.shadowBlur = 0;
      context.globalCompositeOperation = "source-over";

      if (!reducedMotion && progress < 1) frameId = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="facs-cinematic-canvas" aria-hidden="true" />;
}

export default function CinematicIntro() {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const forceFullMotion = new URLSearchParams(location.search).get("motion") === "full";
  const motionReduced = Boolean(reducedMotion && !forceFullMotion);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined" || window.location.pathname !== "/") return false;
    const forcePreview = new URLSearchParams(window.location.search).get("intro") === "1";
    return forcePreview || window.sessionStorage.getItem(SESSION_KEY) !== "true";
  });
  const [departing, setDeparting] = useState(false);

  const finish = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "true");
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible || location.pathname !== "/") return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (motionReduced) {
      const reducedTimer = window.setTimeout(finish, REDUCED_INTRO_DURATION);
      return () => {
        window.clearTimeout(reducedTimer);
        document.body.style.overflow = originalOverflow;
      };
    }

    const departureTimer = window.setTimeout(() => setDeparting(true), INTRO_DURATION - DEPARTURE_LEAD);
    const finishTimer = window.setTimeout(finish, INTRO_DURATION);

    return () => {
      window.clearTimeout(departureTimer);
      window.clearTimeout(finishTimer);
      document.body.style.overflow = originalOverflow;
    };
  }, [finish, location.pathname, motionReduced, visible]);

  if (location.pathname !== "/") return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          key="facs-cinematic-intro"
          className={`facs-cinematic-intro${departing ? " is-departing" : ""}${forceFullMotion ? " is-force-motion" : ""}`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionReduced ? 0.18 : 0.72, ease: [0.65, 0, 0.35, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="FACS cinematic introduction"
        >
          <CinematicField reducedMotion={motionReduced} />
          <div className="facs-cinematic-grid" aria-hidden="true" />
          <div className="facs-cinematic-vignette" aria-hidden="true" />
          <div className="facs-cinematic-scanline" aria-hidden="true" />

          <motion.div
            className="facs-cinematic-signature"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: motionReduced ? 0 : 0.18 }}
          >
            <span>FACS.</span>
            <span>Strategic Advisory</span>
          </motion.div>

          <button type="button" className="facs-cinematic-skip" onClick={finish}>
            Skip intro
            <span aria-hidden="true">↗</span>
          </button>

          <div className="facs-cinematic-stage">
            <motion.svg
              className="facs-cinematic-connectors"
              viewBox="0 0 1200 780"
              preserveAspectRatio="none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: motionReduced ? 0.1 : 0.75, delay: motionReduced ? 0 : 0.72 }}
              aria-hidden="true"
            >
              {[
                "M 206 214 C 342 218, 414 304, 506 356",
                "M 994 214 C 858 218, 786 304, 694 356",
                "M 216 574 C 354 568, 426 494, 510 432",
                "M 984 574 C 846 568, 774 494, 690 432",
              ].map((path, index) => (
                <motion.path
                  key={path}
                  d={path}
                  pathLength={1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{
                    duration: motionReduced ? 0.1 : 0.9,
                    delay: motionReduced ? 0 : 0.72 + index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                />
              ))}
              <circle cx="506" cy="356" r="3" />
              <circle cx="694" cy="356" r="3" />
              <circle cx="510" cy="432" r="3" />
              <circle cx="690" cy="432" r="3" />
            </motion.svg>

            <div className="facs-cinematic-aperture" aria-hidden="true" />

            {CAPABILITIES.map((capability, index) => (
              <motion.div
                key={capability.label}
                className={`facs-cinematic-capability ${capability.className}`}
                initial={{ opacity: 0, scale: 0.84, y: 10, filter: "blur(7px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: motionReduced ? 0.1 : 0.72,
                  delay: motionReduced ? 0 : 0.5 + index * 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <div className="facs-cinematic-capability-card">
                  <span>{capability.code}</span>
                  <strong>{capability.label}</strong>
                </div>
              </motion.div>
            ))}

            <div className="facs-cinematic-core-anchor">
              <motion.div
                className="facs-cinematic-core"
                initial={{ opacity: 0, scale: 0.76, y: 14, filter: "blur(24px)" }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: motionReduced ? 0.1 : 1.08, delay: motionReduced ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="facs-cinematic-core-halo" aria-hidden="true" />
                <div className="facs-cinematic-logo">
                  FACS<span>.</span>
                </div>
                <motion.div
                  className="facs-cinematic-divider"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: motionReduced ? 0.1 : 0.55, delay: motionReduced ? 0 : 1.08 }}
                />
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionReduced ? 0.1 : 0.52, delay: motionReduced ? 0 : 1.18 }}
                >
                  Your Trusted Partner
                </motion.p>
              </motion.div>
            </div>
          </div>

          <motion.div
            className="facs-cinematic-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.75, delay: motionReduced ? 0 : 0.58, ease: [0.22, 1, 0.36, 1] }}
          >
            <span>Building clarity into every decision</span>
            <div className="facs-cinematic-progress" aria-hidden="true">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: (motionReduced ? REDUCED_INTRO_DURATION : INTRO_DURATION) / 1000, ease: "linear" }}
              />
            </div>
            <span>Vietnam · 2026</span>
          </motion.div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
