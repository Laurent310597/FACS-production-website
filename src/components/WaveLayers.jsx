import { WAVE_HEIGHT, WAVE_SPAN } from "../lib/waveShapes";

/** Các lớp sóng chồng nhau (xa → gần). */
export default function WaveLayers({ layers, className = "" }) {
  return (
    <div className={className}>
      {layers.map((layer) => (
        <svg
          key={layer.id}
          className="facs-backdrop__wave"
          style={{ "--dur": layer.dur, "--dir": layer.dir || "normal" }}
          viewBox={`0 0 ${WAVE_SPAN} ${WAVE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`wave-${layer.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={layer.color} stopOpacity={layer.top} />
              <stop offset="1" stopColor={layer.color} stopOpacity={layer.top * 0.25} />
            </linearGradient>
          </defs>
          <path d={layer.area} fill={`url(#wave-${layer.id})`} />
          <path d={layer.crest} fill="none" stroke={layer.edge || layer.color} strokeOpacity={layer.line} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </svg>
      ))}
    </div>
  );
}
