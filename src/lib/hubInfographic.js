// Vẽ infographic theo nhận diện FACS lên <canvas> (1080 × 1350, tỉ lệ 4:5 dùng được cho Facebook, LinkedIn, Instagram).
// Dựng bằng mẫu cố định nên chữ tiếng Việt và số liệu luôn chính xác như nội dung đã duyệt.

export const INFOGRAPHIC_SIZE = { width: 1080, height: 1350 };

const NAVY = "#0B1F3A";
const NAVY_SOFT = "#13294B";
const CYAN = "#22D3EE";
const WHITE = "#FFFFFF";
const MUTED = "#B8C4D6";
const FONT = 'Cambria, "Times New Roman", Georgia, serif';

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trim()}…`;
    return kept;
  }
  return lines;
}

function drawText(ctx, text, x, y, { font, color, maxWidth, lineHeight, maxLines = 3, align = "left" }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawInfographic(canvas, data = {}) {
  const { width, height } = INFOGRAPHIC_SIZE;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const pad = 72;
  const inner = width - pad * 2;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = CYAN;
  ctx.fillRect(0, 0, width, 14);

  // Thương hiệu
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("FACS", pad, 58);
  const brandWidth = ctx.measureText("FACS").width;
  ctx.fillStyle = CYAN;
  ctx.fillText(".", pad + brandWidth, 58);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = "right";
  ctx.fillText("Financial & Accounting Consulting Services", width - pad, 76);

  // Tiêu đề
  const stats = (data.stats || []).filter((s) => s && (s.value || s.label)).slice(0, 3);
  const points = (data.points || []).filter((p) => p && (p.heading || p.detail)).slice(0, 5);
  // Nhiều nội dung thì thu gọn phần đầu để các ý chính đủ chỗ hiển thị 2 dòng diễn giải.
  const dense = stats.length > 0 && points.length >= 4;
  let y = 150;
  y = drawText(ctx, data.title || "Tiêu đề infographic", pad, y, { font: `bold ${dense ? 54 : 64}px ${FONT}`, color: WHITE, maxWidth: inner, lineHeight: dense ? 64 : 76, maxLines: dense ? 2 : 3 });
  if (data.subtitle) y = drawText(ctx, data.subtitle, pad, y + 12, { font: `${dense ? 28 : 30}px ${FONT}`, color: MUTED, maxWidth: inner, lineHeight: dense ? 36 : 40, maxLines: dense ? 2 : 3 });
  y += dense ? 22 : 30;
  ctx.fillStyle = CYAN;
  ctx.fillRect(pad, y, 120, 6);
  y += dense ? 30 : 40;

  // Số liệu nổi bật
  if (stats.length) {
    const gap = 24;
    const boxW = (inner - gap * (stats.length - 1)) / stats.length;
    stats.forEach((stat, index) => {
      const x = pad + index * (boxW + gap);
      ctx.fillStyle = NAVY_SOFT;
      roundRect(ctx, x, y, boxW, 156, 22);
      ctx.fill();
      // Thu nhỏ cỡ chữ cho tới khi con số vừa khung (không cắt bớt số liệu).
      let size = 58;
      ctx.font = `bold ${size}px ${FONT}`;
      while (size > 30 && ctx.measureText(String(stat.value || "")).width > boxW - 36) {
        size -= 2;
        ctx.font = `bold ${size}px ${FONT}`;
      }
      drawText(ctx, stat.value, x + boxW / 2, y + 22 + (58 - size) / 2, { font: `bold ${size}px ${FONT}`, color: CYAN, maxWidth: boxW - 20, lineHeight: 64, maxLines: 1, align: "center" });
      drawText(ctx, stat.label, x + boxW / 2, y + 92, { font: `23px ${FONT}`, color: WHITE, maxWidth: boxW - 36, lineHeight: 28, maxLines: 2, align: "center" });
    });
    y += 156 + 32;
  }

  // Các ý chính: chia đều phần chiều cao còn lại
  const footerTop = height - 130;
  if (points.length) {
    const slot = Math.min(190, (footerTop - y) / points.length);
    const compact = slot < 150;
    const headSize = compact ? 31 : 36;
    const headLine = compact ? 38 : 44;
    const detailSize = compact ? 24 : 27;
    const detailLine = compact ? 30 : 35;
    const detailLines = Math.max(1, Math.min(3, Math.floor((slot - headLine - 14) / detailLine)));
    const radius = compact ? 28 : 34;
    points.forEach((point, index) => {
      const top = y + index * slot;
      ctx.fillStyle = CYAN;
      ctx.beginPath();
      ctx.arc(pad + 34, top + radius + 2, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold ${compact ? 28 : 34}px ${FONT}`;
      ctx.fillStyle = NAVY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), pad + 34, top + radius + 4);
      const textX = pad + 96;
      const after = drawText(ctx, point.heading, textX, top + 2, { font: `bold ${headSize}px ${FONT}`, color: WHITE, maxWidth: inner - 96, lineHeight: headLine, maxLines: 1 });
      drawText(ctx, point.detail, textX, after + 2, { font: `${detailSize}px ${FONT}`, color: MUTED, maxWidth: inner - 96, lineHeight: detailLine, maxLines: detailLines });
    });
  }

  // Chân trang
  ctx.fillStyle = NAVY_SOFT;
  ctx.fillRect(0, footerTop + 20, width, height - footerTop - 20);
  drawText(ctx, data.source_note ? `Nguồn: ${data.source_note}` : "", pad, footerTop + 40, { font: `22px ${FONT}`, color: MUTED, maxWidth: inner - 200, lineHeight: 28, maxLines: 2 });
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("facs.vn", width - pad, footerTop + 46);
}

export function downloadCanvasPng(canvas, fileName = "facs-infographic.png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Không xuất được ảnh."));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      resolve();
    }, "image/png");
  });
}
