import { createClient } from "npm:@supabase/supabase-js@2";
import { graphBase, platformFromState, sha256Hex } from "../_shared/hub-social.ts";

// Nhận mã trả về từ Facebook/LinkedIn sau khi quản trị viên đồng ý kết nối, đổi lấy token và lưu ở bảng chỉ server đọc được.
// Công khai (verify_jwt = false) vì trình duyệt được chuyển hướng tới đây; mọi thứ được bảo vệ bằng state dùng một lần.

type Admin = ReturnType<typeof createClient<any>>;

function back(returnTo: string | null, params: Record<string, string>): Response {
  const fallback = "https://facs.vn/admin/hub/social";
  let target: URL;
  try {
    target = new URL(returnTo || fallback);
  } catch {
    target = new URL(fallback);
  }
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v.slice(0, 300));
  return new Response(null, { status: 302, headers: { Location: target.toString(), "Cache-Control": "no-store" } });
}

async function readJson(res: Response): Promise<Record<string, any>> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}

async function upsertAccount(
  admin: Admin,
  userId: string | null,
  a: { platform: "facebook" | "instagram" | "linkedin"; external_id: string; display_name: string; token: string; expires_at: string | null },
) {
  const { data, error } = await admin
    .from("hub_social_accounts")
    .upsert(
      {
        platform: a.platform,
        external_id: a.external_id,
        display_name: a.display_name,
        status: "connected",
        token_expires_at: a.expires_at,
        last_error: null,
        connected_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "platform,external_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error("Không lưu được tài khoản.");
  const { error: credError } = await admin
    .from("hub_social_credentials")
    .upsert({ account_id: data.id, access_token: a.token, refresh_token: null, updated_at: new Date().toISOString() }, { onConflict: "account_id" });
  if (credError) throw new Error("Không lưu được mã kết nối.");
}

async function connectFacebook(admin: Admin, code: string, userId: string | null, redirect: string): Promise<number> {
  const appId = (Deno.env.get("META_APP_ID") || "").trim();
  const secret = (Deno.env.get("META_APP_SECRET") || "").trim();
  const base = graphBase(Deno.env.get("META_GRAPH_VERSION"));
  if (!appId || !secret) throw new Error("Thiếu cấu hình Meta.");

  const short = await readJson(await fetch(`${base}/oauth/access_token?${new URLSearchParams({ client_id: appId, redirect_uri: redirect, client_secret: secret, code })}`));
  if (!short.access_token) throw new Error("Meta không cấp mã kết nối. Hãy thử kết nối lại.");
  const long = await readJson(await fetch(`${base}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: secret, fb_exchange_token: short.access_token })}`));
  const userToken = long.access_token || short.access_token;

  const pages = await readJson(await fetch(`${base}/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "50", access_token: userToken })}`));
  const list = Array.isArray(pages.data) ? pages.data : [];
  if (!list.length) throw new Error("Không thấy Fanpage nào. Khi đồng ý kết nối hãy chọn Fanpage FACS và cấp đủ quyền.");

  let count = 0;
  for (const page of list) {
    if (!page?.id || !page?.access_token) continue;
    await upsertAccount(admin, userId, { platform: "facebook", external_id: String(page.id), display_name: String(page.name ?? page.id), token: page.access_token, expires_at: null });
    count++;
    const ig = page.instagram_business_account;
    if (ig?.id) {
      await upsertAccount(admin, userId, { platform: "instagram", external_id: String(ig.id), display_name: ig.username ? `@${ig.username}` : String(ig.id), token: page.access_token, expires_at: null });
      count++;
    }
  }
  if (!count) throw new Error("Meta không trả về quyền truy cập Fanpage.");
  return count;
}

async function connectLinkedIn(admin: Admin, code: string, userId: string | null, redirect: string): Promise<number> {
  const clientId = (Deno.env.get("LINKEDIN_CLIENT_ID") || "").trim();
  const secret = (Deno.env.get("LINKEDIN_CLIENT_SECRET") || "").trim();
  if (!clientId || !secret) throw new Error("Thiếu cấu hình LinkedIn.");

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, client_id: clientId, client_secret: secret, redirect_uri: redirect }).toString(),
  });
  const token = await readJson(tokenRes);
  if (!tokenRes.ok || !token.access_token) throw new Error("LinkedIn không cấp mã kết nối. Hãy thử kết nối lại.");
  if (!String(token.scope ?? "").includes("w_member_social")) {
    throw new Error("LinkedIn chưa cấp quyền đăng bài (w_member_social). Hãy thêm sản phẩm 'Share on LinkedIn' cho app LinkedIn rồi kết nối lại.");
  }

  const infoRes = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
  const info = await readJson(infoRes);
  if (!infoRes.ok || !info.sub) throw new Error("Không đọc được hồ sơ LinkedIn.");

  const expiresAt = new Date(Date.now() + Number(token.expires_in || 5_184_000) * 1000).toISOString();
  await upsertAccount(admin, userId, { platform: "linkedin", external_id: String(info.sub), display_name: String(info.name ?? "LinkedIn cá nhân"), token: token.access_token, expires_at: expiresAt });
  return 1;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error_description") || url.searchParams.get("error");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!state || !platformFromState(state)) return back(null, { error: "Phiên kết nối không hợp lệ." });

  const hash = await sha256Hex(state);
  const { data: row } = await admin.from("hub_social_oauth_states").select("platform,user_id,return_to,expires_at").eq("state_hash", hash).maybeSingle();
  await admin.from("hub_social_oauth_states").delete().eq("state_hash", hash); // dùng một lần
  if (!row) return back(null, { error: "Phiên kết nối không tồn tại hoặc đã dùng rồi. Hãy bấm Kết nối lại." });
  if (new Date(row.expires_at).getTime() < Date.now()) return back(row.return_to, { error: "Phiên kết nối đã hết hạn. Hãy bấm Kết nối lại." });
  if (denied) return back(row.return_to, { error: `Kết nối bị từ chối: ${denied}` });
  if (!code) return back(row.return_to, { error: "Không nhận được mã từ nền tảng." });

  const redirect = `${Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "")}/functions/v1/hub-social-callback`;
  try {
    const count = row.platform === "facebook"
      ? await connectFacebook(admin, code, row.user_id, redirect)
      : await connectLinkedIn(admin, code, row.user_id, redirect);
    return back(row.return_to, { connected: row.platform, count: String(count) });
  } catch (error) {
    console.error("hub-social-callback", row.platform, (error as Error)?.message);
    return back(row.return_to, { error: (error as Error)?.message || "Kết nối thất bại." });
  }
});
