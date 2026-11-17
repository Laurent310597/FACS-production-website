// Vẽ infographic theo nhận diện FACS lên <canvas> (1080 × 1350, tỉ lệ 4:5 dùng được cho Facebook, LinkedIn, Instagram).
// Dựng bằng mẫu cố định nên chữ tiếng Việt và số liệu luôn chính xác như nội dung đã duyệt.

import logoUrl from "../assets/facs-logo-full.png";

export const INFOGRAPHIC_SIZE = { width: 1080, height: 1350 };

// Các mẫu bố cục. "dark" là mẫu cũ; ba mẫu còn lại dựng theo infographic FACS đã phát hành (nền sáng, logo, chân trang navy).
export const INFOGRAPHIC_TEMPLATES = [
  { value: "cards", label: "Thẻ đánh số (nền sáng)" },
  { value: "rows", label: "Danh sách dòng (nền sáng)" },
  { value: "update", label: "Bản tin cập nhật (nền sáng)" },
  { value: "dark", label: "Nền tối (mẫu cũ)" },
];
export const DEFAULT_TEMPLATE = "cards";

let logoImage = null;
let logoPromise = null;
/** Tải logo FACS một lần; gọi trước khi vẽ để logo luôn có mặt trong ảnh xuất. */
export function preloadInfographicAssets() {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      logoImage = image;
      resolve(true);
    };
    image.onerror = () => resolve(false);
    image.src = logoUrl;
  });
  return logoPromise;
}

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

function drawDarkInfographic(canvas, data = {}) {
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


// ───────────────────────── Mẫu nền sáng theo nhận diện FACS ─────────────────────────
const INK = "#0A2A5E";
const BLUE = "#1456C8";
const SKY = "#EAF3FE";
const LINE = "#C9DDF5";
const DISCLAIMER =
  "Thông tin trong tài liệu này chỉ nhằm mục đích tham khảo và không cấu thành lời khuyên về kế toán, thuế, pháp lý hoặc chuyên môn. Nội dung này không đại diện cho quan điểm chính thức của FACS. Vui lòng tham vấn chuyên gia có chuyên môn trước khi ra quyết định.";

function drawLightFrame(ctx, width, height, { tag }) {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#FFFFFF");
  bg.addColorStop(1, "#EEF5FD");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  // Dải sóng xanh góc trên bên phải
  const wave = ctx.createLinearGradient(width * 0.55, 0, width, 120);
  wave.addColorStop(0, "#1A5BD0");
  wave.addColorStop(1, "#0A2A5E");
  ctx.fillStyle = wave;
  ctx.beginPath();
  ctx.moveTo(width * 0.62, 0);
  ctx.lineTo(width, 0);
  ctx.lineTo(width, 70);
  ctx.bezierCurveTo(width * 0.86, 40, width * 0.74, 34, width * 0.62, 0);
  ctx.fill();
  // Logo
  if (logoImage) {
    const h = 74;
    ctx.drawImage(logoImage, 56, 40, (logoImage.width / logoImage.height) * h, h);
  } else {
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("FACS", 56, 46);
  }
  if (tag) {
    ctx.font = `bold 22px ${FONT}`;
    const w = ctx.measureText(tag).width + 44;
    ctx.fillStyle = INK;
    roundRect(ctx, width - 56 - w, 58, w, 46, 23);
    ctx.fill();
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, width - 56 - w / 2, 82);
  }
}

function drawLightFooter(ctx, width, height, data) {
  const top = height - 118;
  ctx.fillStyle = INK;
  ctx.fillRect(0, top, width, 118);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillStyle = WHITE;
  ctx.fillText("facs.vn", 56, top + 22);
  ctx.font = `20px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("contact@facs.vn", 56, top + 62);
  drawText(ctx, data.source_note ? `Nguồn: ${data.source_note}. ${DISCLAIMER}` : DISCLAIMER, 300, top + 18, { font: `16px ${FONT}`, color: MUTED, maxWidth: width - 300 - 56, lineHeight: 21, maxLines: 5 });
}

function drawLightTitle(ctx, data, y, { size = 60, line = 70, maxLines = 3 } = {}) {
  const pad = 56;
  const inner = INFOGRAPHIC_SIZE.width - pad * 2;
  let next = drawText(ctx, (data.title || "Tiêu đề infographic").toUpperCase(), pad, y, { font: `bold ${size}px ${FONT}`, color: INK, maxWidth: inner, lineHeight: line, maxLines });
  if (data.subtitle) next = drawText(ctx, data.subtitle, pad, next + 10, { font: `bold 32px ${FONT}`, color: BLUE, maxWidth: inner, lineHeight: 40, maxLines: 2 });
  ctx.fillStyle = BLUE;
  ctx.fillRect(pad, next + 16, 96, 6);
  return next + 44;
}

function drawLightStats(ctx, stats, y) {
  if (!stats.length) return y;
  const pad = 56;
  const gap = 20;
  const boxW = (INFOGRAPHIC_SIZE.width - pad * 2 - gap * (stats.length - 1)) / stats.length;
  stats.forEach((stat, i) => {
    const x = pad + i * (boxW + gap);
    ctx.fillStyle = SKY;
    roundRect(ctx, x, y, boxW, 124, 20);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    let size = 52;
    ctx.font = `bold ${size}px ${FONT}`;
    while (size > 28 && ctx.measureText(String(stat.value || "")).width > boxW - 30) {
      size -= 2;
      ctx.font = `bold ${size}px ${FONT}`;
    }
    drawText(ctx, stat.value, x + boxW / 2, y + 14 + (52 - size) / 2, { font: `bold ${size}px ${FONT}`, color: BLUE, maxWidth: boxW - 20, lineHeight: 56, maxLines: 1, align: "center" });
    drawText(ctx, stat.label, x + boxW / 2, y + 78, { font: `20px ${FONT}`, color: INK, maxWidth: boxW - 30, lineHeight: 25, maxLines: 2, align: "center" });
  });
  return y + 124 + 28;
}

function numberBadge(ctx, cx, cy, r, n) {
  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `bold ${Math.round(r * 1.05)}px ${FONT}`;
  ctx.fillStyle = WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy + 2);
}

/** Mẫu "cards": lưới thẻ đánh số 2 cột (như bản tin "4 điểm doanh nghiệp cần chú ý"). */
function drawCards(ctx, data, y, footerTop) {
  const pad = 56;
  const points = (data.points || []).filter((p) => p && (p.heading || p.detail)).slice(0, 5);
  if (!points.length) return;
  const gap = 22;
  const cols = 2;
  const rows = Math.ceil(points.length / cols);
  const cardW = (INFOGRAPHIC_SIZE.width - pad * 2 - gap) / cols;
  const avail = footerTop - 28 - y;
  const cardH = Math.min(300, (avail - gap * (rows - 1)) / rows);
  points.forEach((point, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    // Ý cuối lẻ thì trải rộng hết hàng
    const wide = points.length % 2 === 1 && i === points.length - 1;
    const w = wide ? cardW * 2 + gap : cardW;
    const x = pad + col * (cardW + gap);
    const top = y + row * (cardH + gap);
    ctx.fillStyle = WHITE;
    roundRect(ctx, x, top, w, cardH, 24);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    numberBadge(ctx, x + 50, top + 50, 26, i + 1);
    const headEnd = drawText(ctx, point.heading, x + 92, top + 24, { font: `bold 29px ${FONT}`, color: INK, maxWidth: w - 92 - 22, lineHeight: 35, maxLines: 2 });
    const detailTop = Math.max(headEnd, top + 80) + 8;
    const lines = Math.max(1, Math.floor((top + cardH - 16 - detailTop) / 28));
    drawText(ctx, point.detail, x + 24, detailTop, { font: `23px ${FONT}`, color: "#2D4468", maxWidth: w - 48, lineHeight: 28, maxLines: Math.min(6, lines) });
  });
}

/** Mẫu "rows": ô số màu navy bên trái, nội dung bên phải (như "5 sai lầm phổ biến khi sử dụng hóa đơn"). */
function drawRows(ctx, data, y, footerTop) {
  const pad = 56;
  const points = (data.points || []).filter((p) => p && (p.heading || p.detail)).slice(0, 5);
  if (!points.length) return;
  const gap = 16;
  const rowH = Math.min(190, (footerTop - 24 - y - gap * (points.length - 1)) / points.length);
  const inner = INFOGRAPHIC_SIZE.width - pad * 2;
  points.forEach((point, i) => {
    const top = y + i * (rowH + gap);
    ctx.fillStyle = WHITE;
    roundRect(ctx, pad, top, inner, rowH, 22);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = INK;
    roundRect(ctx, pad, top, 110, rowH, 22);
    ctx.fill();
    ctx.fillRect(pad + 80, top, 30, rowH);
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillStyle = WHITE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1), pad + 55, top + rowH / 2 + 2);
    const textX = pad + 138;
    const textW = inner - 138 - 24;
    const after = drawText(ctx, point.heading, textX, top + 18, { font: `bold 31px ${FONT}`, color: INK, maxWidth: textW, lineHeight: 37, maxLines: 1 });
    const lines = Math.max(1, Math.floor((top + rowH - 14 - (after + 6)) / 29));
    drawText(ctx, point.detail, textX, after + 6, { font: `24px ${FONT}`, color: "#2D4468", maxWidth: textW, lineHeight: 29, maxLines: Math.min(4, lines) });
  });
}

/** Mẫu "update": thanh tiêu đề xanh từng mục có chấm tròn + đường kẻ (như bản tin cập nhật pháp lý). */
function drawUpdate(ctx, data, y, footerTop) {
  const pad = 56;
  const points = (data.points || []).filter((p) => p && (p.heading || p.detail)).slice(0, 5);
  if (!points.length) return;
  const inner = INFOGRAPHIC_SIZE.width - pad * 2;
  ctx.fillStyle = SKY;
  roundRect(ctx, pad, y, inner, footerTop - 24 - y, 26);
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.stroke();
  const innerTop = y + 18;
  const slot = (footerTop - 24 - 18 - innerTop) / points.length;
  points.forEach((point, i) => {
    const top = innerTop + i * slot;
    if (i > 0) {
      ctx.strokeStyle = LINE;
      ctx.beginPath();
      ctx.moveTo(pad + 28, top - 4);
      ctx.lineTo(pad + inner - 28, top - 4);
      ctx.stroke();
    }
    numberBadge(ctx, pad + 62, top + 40, 24, i + 1);
    const textX = pad + 110;
    const textW = inner - 110 - 30;
    const after = drawText(ctx, point.heading, textX, top + 10, { font: `bold 31px ${FONT}`, color: INK, maxWidth: textW, lineHeight: 37, maxLines: 1 });
    const lines = Math.max(1, Math.floor((top + slot - 12 - (after + 6)) / 29));
    drawText(ctx, point.detail, textX, after + 6, { font: `24px ${FONT}`, color: "#2D4468", maxWidth: textW, lineHeight: 29, maxLines: Math.min(4, lines) });
  });
}

function drawLightInfographic(canvas, data, template) {
  const { width, height } = INFOGRAPHIC_SIZE;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  drawLightFrame(ctx, width, height, { tag: template === "update" ? "FACS TAX UPDATE" : "" });
  const stats = (data.stats || []).filter((s) => s && (s.value || s.label)).slice(0, 3);
  const points = (data.points || []).filter((p) => p && (p.heading || p.detail));
  const dense = points.length >= 4;
  let y = drawLightTitle(ctx, data, 150, { size: dense ? 52 : 60, line: dense ? 62 : 70, maxLines: dense ? 2 : 3 });
  y = drawLightStats(ctx, stats, y);
  const footerTop = height - 118;
  if (template === "rows") drawRows(ctx, data, y, footerTop);
  else if (template === "update") drawUpdate(ctx, data, y, footerTop);
  else drawCards(ctx, data, y, footerTop);
  drawLightFooter(ctx, width, height, data);
}

export function drawInfographic(canvas, data = {}, options = {}) {
  const wanted = options.template || data.template;
  const template = INFOGRAPHIC_TEMPLATES.some((t) => t.value === wanted) ? wanted : DEFAULT_TEMPLATE;
  if (template === "dark") return drawDarkInfographic(canvas, data);
  return drawLightInfographic(canvas, data, template);
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
