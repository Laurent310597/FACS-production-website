import { supabase } from "./supabaseClient";

// FACS Hub phần 4: giám sát và cấu hình AI Zalo. Dữ liệu do laptop đẩy lên bảng hub_zalo_*; lệnh gửi xuống qua bảng hub_zalo_commands.

export const ONLINE_MS = 3 * 60 * 1000;

export async function listDevices() {
  const { data, error } = await supabase
    .from("hub_zalo_devices")
    .select("id,name,heartbeat,last_seen_at,revoked_at,created_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

export const isOnline = (device) => !!device?.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < ONLINE_MS;

export async function createDevice(name) {
  const { data, error } = await supabase.rpc("hub_zalo_create_device", { p_name: name });
  if (error) throw new Error(error.message);
  return typeof data === "string" ? data : ""; // khóa chỉ hiện đúng một lần
}

export async function revokeDevice(id) {
  const { error } = await supabase.rpc("hub_zalo_revoke_device", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function listMirror(deviceId, kind, { limit = 200, convKey } = {}) {
  let query = supabase.from("hub_zalo_mirror").select("key,conv_key,ts,data").eq("device_id", deviceId).eq("kind", kind);
  if (convKey) query = query.eq("conv_key", convKey);
  const { data, error } = await query.order("ts", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listCommands(deviceId, limit = 20) {
  const { data, error } = await supabase
    .from("hub_zalo_commands")
    .select("id,type,payload,status,result,created_at")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function sendCommand(deviceId, type, payload) {
  const { error } = await supabase.from("hub_zalo_commands").insert({ device_id: deviceId, type, payload });
  if (error) throw new Error(error.message);
}

export const commandLabel = {
  set_config: "Đổi cấu hình",
  mute_conversation: "Tắt/bật AI cho hội thoại",
  resolve_item: "Đánh dấu việc xong",
  set_group: "Cập nhật nhóm",
};
export const commandStatusLabel = { pending: "Đang chờ laptop", delivered: "Laptop đã nhận", done: "Hoàn tất", failed: "Không thực hiện được" };
