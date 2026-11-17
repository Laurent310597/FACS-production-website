// Kiểm thử logic thuần của FACS Hub phần 4 (đồng bộ AI Zalo):  npm run qa:hub-zalo
import assert from "node:assert/strict";
import test from "node:test";
import { deviceOnline, sanitizeAcks, sanitizeHeartbeat, sanitizeRows } from "../supabase/functions/_shared/hub-zalo.ts";

test("lọc dòng đồng bộ: bỏ kind lạ, thiếu khóa, dữ liệu sai kiểu hoặc quá lớn", () => {
  const good = { kind: "conversation", key: 5, conv_key: 5, ts: 1700000000000.7, data: { a: 1 } };
  const { rows, rejected } = sanitizeRows([
    good,
    { kind: "secrets", key: "x", ts: 1, data: {} },
    { kind: "message", key: "", ts: 1, data: {} },
    { kind: "message", key: "1", ts: "abc", data: {} },
    { kind: "message", key: "1", ts: 1, data: [1] },
    { kind: "message", key: "1", ts: 1, data: { big: "x".repeat(25_000) } },
    { kind: "message", key: "k".repeat(121), ts: 1, data: {} },
    null,
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rejected, 7);
  assert.deepEqual(rows[0], { kind: "conversation", key: "5", conv_key: "5", ts: 1700000000000, data: { a: 1 } });
  assert.deepEqual(sanitizeRows("không phải mảng"), { rows: [], rejected: 0 });
});

test("giới hạn 500 dòng mỗi lần, phần dư được tính là bị bỏ", () => {
  const many = Array.from({ length: 520 }, (_, i) => ({ kind: "message", key: String(i), ts: i, data: {} }));
  const out = sanitizeRows(many);
  assert.equal(out.rows.length, 500);
  assert.equal(out.rejected, 20);
});

test("nhịp tim chỉ giữ trường đơn giản, cắt chuỗi dài", () => {
  const hb = sanitizeHeartbeat({ status: "connected", aiEnabled: true, tokensToday: 120, qrImage: { x: 1 }, "bad key": 1, long: "x".repeat(500), nothing: null });
  assert.deepEqual(Object.keys(hb).sort(), ["aiEnabled", "long", "nothing", "status", "tokensToday"]);
  assert.equal(hb.long.length, 120);
  assert.deepEqual(sanitizeHeartbeat([1, 2]), {});
  assert.deepEqual(sanitizeHeartbeat(null), {});
});

test("xác nhận lệnh: chỉ nhận id UUID và trạng thái hợp lệ", () => {
  const id = "123e4567-e89b-42d3-a456-426614174000";
  const acks = sanitizeAcks([{ id, status: "done", result: "ok" }, { id: "x", status: "done" }, { id, status: "weird" }, { id, status: "failed", result: "y".repeat(900) }]);
  assert.equal(acks.length, 2);
  assert.equal(acks[1].result.length, 400);
});

test("thiết bị online nếu có nhịp tim trong 3 phút", () => {
  const now = Date.parse("2026-11-17T10:00:00Z");
  assert.ok(deviceOnline("2026-11-17T09:58:00Z", now));
  assert.ok(!deviceOnline("2026-11-17T09:56:00Z", now));
  assert.ok(!deviceOnline(null, now));
  assert.ok(!deviceOnline("không phải ngày", now));
});
