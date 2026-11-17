import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  checkCaption,
  checkScheduledAt,
  isJpegPath,
  isPlatform,
  linkedinAuthorizeUrl,
  makeState,
  metaAuthorizeUrl,
  sha256Hex,
  validateSocialImagePath,
} from "../_shared/hub-social.ts";
import { runPublish } from "../_shared/hub-social-publish.ts";
import type { SocialPost } from "../_shared/hub-social-publish.ts";

// FACS Hub – quản lý kết nối mạng xã hội và bài đăng. Chỉ quản trị viên đã đăng nhập mới gọi được.
// Hàm này KHÔNG đụng vào bảng posts hay email Insights.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/(www\.)?facs\.vn$/,
  /^https:\/\/facs-production-website-[a-z0-9-]+-facs-s-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d{2,5}$/,
];

function allowedOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const extra = (Deno.env.get("HUB_ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(value)) || extra.includes(value) ? value : null;
}

function redirectUri(): string {
  return `${Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "")}/functions/v1/hub-social-callback`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth, error: authError } = token ? await admin.auth.getUser(token) : { data: { user: null }, error: new Error("no token") };
  if (authError || !auth.user) return json({ error: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." }, 401);
  const user = auth.user;

  try {
    const body = await req.json().catch(() => ({}));
    const metaId = (Deno.env.get("META_APP_ID") || "").trim();
    const metaSecret = (Deno.env.get("META_APP_SECRET") || "").trim();
    const liId = (Deno.env.get("LINKEDIN_CLIENT_ID") || "").trim();
    const liSecret = (Deno.env.get("LINKEDIN_CLIENT_SECRET") || "").trim();

    if (body.action === "status") {
      return json({
        meta_configured: !!(metaId && metaSecret),
        linkedin_configured: !!(liId && liSecret),
        cron_configured: !!(Deno.env.get("HUB_SOCIAL_CRON_SECRET") || "").trim(),
        redirect_uri: redirectUri(),
      });
    }

    if (body.action === "connect_start") {
      const platform = body.platform === "linkedin" ? "linkedin" : body.platform === "facebook" ? "facebook" : null;
      if (!platform) return json({ error: "Nền tảng không hợp lệ." }, 400);
      const origin = allowedOrigin(body.origin);
      if (!origin) return json({ error: "Địa chỉ trang quản trị chưa nằm trong danh sách cho phép." }, 400);
      if (platform === "facebook" && !(metaId && metaSecret)) return json({ error: "Chưa cấu hình META_APP_ID / META_APP_SECRET trong Supabase Edge Function Secrets." }, 503);
      if (platform === "linkedin" && !(liId && liSecret)) return json({ error: "Chưa cấu hình LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET trong Supabase Edge Function Secrets." }, 503);

      await admin.from("hub_social_oauth_states").delete().lt("expires_at", new Date().toISOString());
      const state = makeState(platform);
      const { error } = await admin.from("hub_social_oauth_states").insert({
        state_hash: await sha256Hex(state),
        platform,
        user_id: user.id,
        return_to: `${origin}/admin/hub/social`,
      });
      if (error) return json({ error: "Không tạo được phiên kết nối." }, 500);
      const url = platform === "facebook"
        ? metaAuthorizeUrl({ appId: metaId, redirectUri: redirectUri(), state, version: Deno.env.get("META_GRAPH_VERSION") })
        : linkedinAuthorizeUrl({ clientId: liId, redirectUri: redirectUri(), state });
      return json({ url });
    }

    if (body.action === "disconnect") {
      const id = String(body.account_id ?? "");
      const { data: account } = await admin.from("hub_social_accounts").select("id").eq("id", id).maybeSingle();
      if (!account) return json({ error: "Không tìm thấy tài khoản." }, 404);
      await admin.from("hub_social_credentials").delete().eq("account_id", id);
      await admin.from("hub_social_posts").update({ status: "cancelled", error: "Tài khoản đã gỡ kết nối.", updated_at: new Date().toISOString() }).eq("account_id", id).eq("status", "scheduled");
      await admin.from("hub_social_accounts").update({ status: "disconnected", last_error: null, updated_at: new Date().toISOString() }).eq("id", id);
      return json({ ok: true });
    }

    if (body.action === "cancel_post") {
      const { data, error } = await admin
        .from("hub_social_posts")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", String(body.id ?? ""))
        .in("status", ["draft", "scheduled", "failed"])
        .select("id");
      if (error || !data?.length) return json({ error: "Không huỷ được: bài đã đăng, đang đăng hoặc không tồn tại." }, 409);
      return json({ ok: true });
    }

    if (body.action === "save_post") {
      const mode = body.mode === "now" ? "now" : body.mode === "schedule" ? "schedule" : "draft";
      const { data: account } = await admin.from("hub_social_accounts").select("id,platform,status").eq("id", String(body.account_id ?? "")).maybeSingle();
      if (!account || !isPlatform(account.platform)) return json({ error: "Chưa chọn tài khoản đăng bài." }, 400);
      if (mode !== "draft" && account.status !== "connected") return json({ error: "Tài khoản này chưa kết nối hoặc đã hết hạn. Hãy kết nối lại." }, 409);

      let imagePath: string | null = null;
      if (body.image_path) {
        try {
          imagePath = validateSocialImagePath(body.image_path);
        } catch (e) {
          return json({ error: (e as Error).message }, 400);
        }
      }
      if (account.platform === "instagram" && imagePath && !isJpegPath(imagePath)) return json({ error: "Instagram chỉ nhận ảnh JPEG." }, 400);

      const checked = checkCaption(account.platform, body.caption, !!imagePath);
      if (!checked.ok) return json({ error: checked.error }, 400);

      let linkUrl: string | null = null;
      if (body.link_url) {
        try {
          const u = new URL(String(body.link_url));
          if (u.protocol !== "https:") throw new Error();
          linkUrl = u.toString();
        } catch {
          return json({ error: "Link đính kèm phải là địa chỉ https hợp lệ." }, 400);
        }
      }

      let scheduledAt: string | null = null;
      if (mode === "schedule") {
        const s = checkScheduledAt(body.scheduled_at);
        if (!s.ok) return json({ error: s.error }, 400);
        scheduledAt = s.at.toISOString();
      }

      const row = {
        content_item_id: body.content_item_id ? String(body.content_item_id) : null,
        account_id: account.id,
        platform: account.platform,
        caption: checked.caption,
        image_path: imagePath,
        link_url: linkUrl,
        scheduled_at: scheduledAt,
        status: mode === "schedule" ? "scheduled" : mode === "now" ? "publishing" : "draft",
        claimed_at: mode === "now" ? new Date().toISOString() : null,
        error: null,
        updated_at: new Date().toISOString(),
      };

      let saved: Record<string, unknown> | null = null;
      if (body.id) {
        const { data, error } = await admin
          .from("hub_social_posts")
          .update(row)
          .eq("id", String(body.id))
          .in("status", ["draft", "scheduled", "failed", "cancelled"])
          .select("*")
          .maybeSingle();
        if (error) return json({ error: "Không lưu được bài đăng." }, 500);
        if (!data) return json({ error: "Bài này đã đăng hoặc đang được đăng nên không thể sửa." }, 409);
        saved = data;
      } else {
        const { data, error } = await admin.from("hub_social_posts").insert({ ...row, created_by: user.id }).select("*").single();
        if (error) return json({ error: "Không lưu được bài đăng." }, 500);
        saved = data;
      }

      if (mode === "now") {
        const result = await runPublish(admin, saved as unknown as SocialPost);
        const { data: after } = await admin.from("hub_social_posts").select("*").eq("id", saved!.id as string).maybeSingle();
        return json({ post: after, published: result.ok, error: result.error ?? null }, result.ok ? 200 : 502);
      }
      return json({ post: saved });
    }

    return json({ error: "Hành động không được hỗ trợ." }, 400);
  } catch (error) {
    console.error("hub-social", (error as Error)?.message);
    return json({ error: "Có lỗi xảy ra khi xử lý. Vui lòng thử lại." }, 500);
  }
});
