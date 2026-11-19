// Các mảng sóng chéo (từ góc phải trên xuống góc trái dưới) chồng lên nhau, trôi chậm và nhấp nhô nhịp nhàng.
// Dùng cho nền danh sách Insights và chân trang (soft = nhạt hơn).

const SPAN = 3200;
const H = 260;

// Một dải sóng (mảng) có mép trên và mép dưới đều uốn lượn; chu kỳ chia hết cho 1600 để trôi ngang liền mạch.
function ribbon(phase, amp, thick) {
  const top = [];
  const bottom = [];
  for (let x = 0; x <= SPAN; x += 20) {
    const t = (x / 1600) * 2 * Math.PI;
    const yTop = 70 - amp * Math.sin(2 * t + phase) - amp * 0.4 * Math.sin(5 * t + phase * 1.6);
    const yBot = yTop + thick + 22 * Math.sin(3 * t + phase * 0.7);
    top.push(`${x} ${yTop.toFixed(1)}`);
    bottom.push(`${x} ${yBot.toFixed(1)}`);
  }
  const crest = `M${top.join("L")}`;
  const area = `M${top.join("L")}L${bottom.reverse().join("L")}Z`;
  return { crest, area };
}

const BANDS = [
  { id: "d1", color: "#22D3EE", alpha: 0.13, line: 0.34, ...ribbon(0.2, 30, 120), dur: "120s", bob: "11s", offset: "4%" },
  { id: "d2", color: "#3B82F6", alpha: 0.16, line: 0.28, ...ribbon(1.7, 26, 140), dur: "95s", bob: "13s", offset: "19%", dir: "reverse" },
  { id: "d3", color: "#0EA5E9", alpha: 0.12, line: 0.3, ...ribbon(2.9, 34, 110), dur: "140s", bob: "9s", offset: "35%" },
  { id: "d4", color: "#6366F1", alpha: 0.1, line: 0.22, ...ribbon(4.1, 24, 130), dur: "105s", bob: "15s", offset: "51%", dir: "reverse" },
  { id: "d5", color: "#22D3EE", alpha: 0.12, line: 0.3, ...ribbon(5.3, 30, 120), dur: "130s", bob: "12s", offset: "67%" },
  { id: "d6", color: "#3B82F6", alpha: 0.14, line: 0.26, ...ribbon(0.9, 28, 140), dur: "110s", bob: "10s", offset: "82%", dir: "reverse" },
];

export default function DiagonalWaves({ soft = false }) {
  return (
    <div className={`ib-diag${soft ? " ib-diag--soft" : ""}`} aria-hidden="true">
      {BANDS.map((b) => (
        <div key={b.id} className="ib-diag__band" style={{ top: b.offset, "--bob": b.bob }}>
          <svg className="ib-diag__wave" style={{ "--dur": b.dur, "--dir": b.dir || "normal" }} viewBox={`0 0 ${SPAN} ${H}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`ib-${b.id}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={b.color} stopOpacity={b.alpha * 1.6} />
                <stop offset="1" stopColor={b.color} stopOpacity={b.alpha * 0.2} />
              </linearGradient>
            </defs>
            <path d={b.area} fill={`url(#ib-${b.id})`} />
            <path d={b.crest} fill="none" stroke={b.color} strokeOpacity={b.line} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      ))}
    </div>
  );
}
