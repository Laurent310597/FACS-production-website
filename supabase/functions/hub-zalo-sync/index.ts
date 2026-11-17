import { createClient } from "npm:@supabase/supabase-js@2";
import { sanitizeAcks, sanitizeHeartbeat, sanitizeRows } from "../_shared/hub-zalo.ts";

// FACS Hub – cổng đồng bộ cho AI Zalo chạy trên laptop. Thiết bị xác thực bằng khóa riêng (header x-facs-device-key),
// KHÔNG dùng khóa service-role. Mỗi lần gọi: đẩy dữ liệu lên, nhận lệnh đang chờ, báo kết quả lệnh đã chạy.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const key = (req.headers.get("x-facs-device-key") || "").trim();
  const { data: deviceId } = key ? await admin.rpc("hub_zalo_verify_device", { p_key: key }) : { data: null };
  if (!deviceId) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action !== "sync") return json({ error: "Unsupported action" }, 400);

    // 1) Báo kết quả các lệnh đã chạy
    const acks = sanitizeAcks(body.acks);
    for (const ack of acks) {
      await admin
        .from("hub_zalo_commands")
        .update({ status: ack.status, result: ack.result, done_at: new Date().toISOString() })
        .eq("id", ack.id)
        .eq("device_id", deviceId)
        .eq("status", "delivered");
    }

    // 2) Nhận dữ liệu mới
    const { rows, rejected } = sanitizeRows(body.rows);
    if (rows.length) {
      const nowIso = new Date().toISOString();
      const { error } = await admin.from("hub_zalo_mirror").upsert(
        rows.map((r) => ({ device_id: deviceId, kind: r.kind, key: r.key, conv_key: r.conv_key, ts: r.ts, data: r.data, updated_at: nowIso })),
        { onConflict: "device_id,kind,key" },
      );
      if (error) {
        console.error("hub-zalo-sync upsert", error.message);
        return json({ error: "Không lưu được dữ liệu." }, 500);
      }
    }

    // 3) Nhịp tim + dọn dữ liệu cũ (tối đa 6 giờ một lần)
    const { data: device } = await admin.from("hub_zalo_devices").select("last_pruned_at").eq("id", deviceId).maybeSingle();
    await admin
      .from("hub_zalo_devices")
      .update({ heartbeat: sanitizeHeartbeat(body.heartbeat), last_seen_at: new Date().toISOString() })
      .eq("id", deviceId);
    if (!device?.last_pruned_at || Date.now() - new Date(device.last_pruned_at).getTime() > 6 * 3600_000) {
      await admin.rpc("hub_zalo_prune", { p_device: deviceId });
    }

    // 4) Giao lệnh đang chờ
    const { data: commands } = await admin.rpc("hub_zalo_claim_commands", { p_device: deviceId, p_limit: 20 });
    return json({
      ok: true,
      accepted: rows.length,
      rejected,
      commands: (commands ?? []).map((c: { id: string; type: string; payload: unknown }) => ({ id: c.id, type: c.type, payload: c.payload })),
    });
  } catch (error) {
    console.error("hub-zalo-sync", (error as Error)?.message);
    return json({ error: "Có lỗi xảy ra khi đồng bộ." }, 500);
  }
});
