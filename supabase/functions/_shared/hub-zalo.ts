// Logic thuần cho FACS Hub phần 4 (đồng bộ AI Zalo): kiểm tra dữ liệu AI Zalo gửi lên.
// Kiểm thử bằng `npm run qa:hub-zalo`.

export const MIRROR_KINDS = ["conversation", "message", "lead", "handover", "group", "item", "security", "team", "config"] as const;
export type MirrorKind = (typeof MIRROR_KINDS)[number];

export const MAX_ROWS_PER_SYNC = 500;
export const MAX_ROW_BYTES = 24_000;
export const MAX_HEARTBEAT_BYTES = 4_000;
export const MAX_ACKS = 50;

export type MirrorRow = { kind: MirrorKind; key: string; conv_key: string | null; ts: number; data: Record<string, unknown> };

function isKind(value: unknown): value is MirrorKind {
  return typeof value === "string" && (MIRROR_KINDS as readonly string[]).includes(value);
}

/** Lọc các dòng hợp lệ; bỏ dòng sai thay vì làm hỏng cả lô. Trả về số dòng bị bỏ để báo lại cho thiết bị. */
export function sanitizeRows(input: unknown): { rows: MirrorRow[]; rejected: number } {
  const list = Array.isArray(input) ? input.slice(0, MAX_ROWS_PER_SYNC) : [];
  const rows: MirrorRow[] = [];
  let rejected = Array.isArray(input) ? Math.max(0, input.length - MAX_ROWS_PER_SYNC) : 0;
  for (const raw of list) {
    const r = raw as Record<string, unknown> | null;
    const key = typeof r?.key === "string" ? r.key : typeof r?.key === "number" ? String(r.key) : "";
    const data = r?.data;
    const ts = Number(r?.ts);
    if (!r || !isKind(r.kind) || !key || key.length > 120 || !data || typeof data !== "object" || Array.isArray(data) || !Number.isFinite(ts)) {
      rejected++;
      continue;
    }
    if (JSON.stringify(data).length > MAX_ROW_BYTES) {
      rejected++;
      continue;
    }
    const convKey = r.conv_key === null || r.conv_key === undefined ? null : String(r.conv_key).slice(0, 120);
    rows.push({ kind: r.kind, key, conv_key: convKey, ts: Math.trunc(ts), data: data as Record<string, unknown> });
  }
  return { rows, rejected };
}

/** Nhịp tim chỉ gồm trường trạng thái đơn giản; không nhận chuỗi dài hay dữ liệu lạ (vd. ảnh QR). */
export function sanitizeHeartbeat(input: unknown): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>).slice(0, 30)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) continue;
    if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (typeof v === "string") out[k] = v.slice(0, 120);
  }
  if (JSON.stringify(out).length > MAX_HEARTBEAT_BYTES) return {};
  return out;
}

export type Ack = { id: string; status: "done" | "failed"; result: string };

export function sanitizeAcks(input: unknown): Ack[] {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const acks: Ack[] = [];
  for (const raw of (Array.isArray(input) ? input : []).slice(0, MAX_ACKS)) {
    const r = raw as Record<string, unknown> | null;
    if (!r || typeof r.id !== "string" || !UUID.test(r.id) || (r.status !== "done" && r.status !== "failed")) continue;
    acks.push({ id: r.id, status: r.status, result: String(r.result ?? "").slice(0, 400) });
  }
  return acks;
}

/** Thiết bị coi là đang chạy nếu có nhịp tim trong vòng 3 phút. */
export function deviceOnline(lastSeenAt: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const t = new Date(lastSeenAt).getTime();
  return Number.isFinite(t) && now - t < 3 * 60_000;
}
