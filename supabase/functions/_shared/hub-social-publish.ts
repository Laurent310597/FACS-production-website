import type { createClient } from "npm:@supabase/supabase-js@2";
import {
  escapeLinkedInText,
  friendlyError,
  graphBase,
  isJpegPath,
  linkedinVersion,
  validateSocialImagePath,
} from "./hub-social.ts";
import type { SocialPlatform } from "./hub-social.ts";

// Gọi API chính thức của Meta (Facebook Page, Instagram) và LinkedIn để đăng một bài.
// KHÔNG tự thử lại: nếu một lần gọi lỗi mơ hồ thì đánh dấu failed để người kiểm tra tay, tránh đăng trùng.

export type AdminClient = ReturnType<typeof createClient<any>>;

export type SocialPost = {
  id: string;
  account_id: string;
  platform: SocialPlatform;
  caption: string;
  image_path: string | null;
  link_url: string | null;
};

export type PublishResult = { externalId: string; externalUrl: string | null };

class PublishError extends Error {}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function signedImageUrl(admin: AdminClient, path: string): Promise<string> {
  const { data, error } = await admin.storage.from("hub-library").createSignedUrl(validateSocialImagePath(path), 3600);
  if (error || !data?.signedUrl) throw new PublishError("Không tạo được đường dẫn ảnh để gửi cho mạng xã hội.");
  return data.signedUrl;
}

async function downloadImage(admin: AdminClient, path: string): Promise<{ bytes: Uint8Array; type: string }> {
  const { data, error } = await admin.storage.from("hub-library").download(validateSocialImagePath(path));
  if (error || !data) throw new PublishError("Không đọc được ảnh của bài đăng trong thư viện.");
  return { bytes: new Uint8Array(await data.arrayBuffer()), type: data.type || "image/jpeg" };
}

async function metaCall(platform: SocialPlatform, url: string, params: Record<string, string>, method: "POST" | "GET" = "POST") {
  const target = new URL(url);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
  } else {
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(target, init);
  const body = await readBody(res);
  if (!res.ok) throw new PublishError(friendlyError(platform, res.status, body));
  return body as Record<string, unknown>;
}

async function publishFacebook(admin: AdminClient, post: SocialPost, pageId: string, token: string): Promise<PublishResult> {
  const base = graphBase(Deno.env.get("META_GRAPH_VERSION"));
  let out: Record<string, unknown>;
  if (post.image_path) {
    out = await metaCall("facebook", `${base}/${pageId}/photos`, {
      url: await signedImageUrl(admin, post.image_path),
      caption: post.caption,
      published: "true",
      access_token: token,
    });
  } else {
    const params: Record<string, string> = { message: post.caption, access_token: token };
    if (post.link_url) params.link = post.link_url;
    out = await metaCall("facebook", `${base}/${pageId}/feed`, params);
  }
  const id = String(out.post_id ?? out.id ?? "");
  if (!id) throw new PublishError("Facebook không trả về mã bài đăng. Hãy kiểm tra Fanpage xem bài đã lên chưa.");
  return { externalId: id, externalUrl: `https://www.facebook.com/${id}` };
}

async function publishInstagram(admin: AdminClient, post: SocialPost, igUserId: string, token: string): Promise<PublishResult> {
  if (!post.image_path) throw new PublishError("Instagram bắt buộc phải có ảnh.");
  if (!isJpegPath(post.image_path)) throw new PublishError("Instagram chỉ nhận ảnh JPEG. Hãy tải lại ảnh dạng .jpg.");
  const base = graphBase(Deno.env.get("META_GRAPH_VERSION"));
  const container = await metaCall("instagram", `${base}/${igUserId}/media`, {
    image_url: await signedImageUrl(admin, post.image_path),
    caption: post.caption,
    access_token: token,
  });
  const creationId = String(container.id ?? "");
  if (!creationId) throw new PublishError("Instagram không tạo được bản đăng.");

  // Chờ Instagram xử lý ảnh (thường ngay lập tức); tối đa ~30 giây.
  let ready = false;
  for (let i = 0; i < 10; i++) {
    const st = await metaCall("instagram", `${base}/${creationId}`, { fields: "status_code", access_token: token }, "GET");
    const code = String(st.status_code ?? "");
    if (code === "FINISHED") { ready = true; break; }
    if (code === "ERROR" || code === "EXPIRED") throw new PublishError("Instagram báo lỗi khi xử lý ảnh (kiểm tra định dạng JPEG và tỉ lệ khung 4:5 đến 1.91:1).");
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!ready) throw new PublishError("Instagram xử lý ảnh quá lâu. Hãy kiểm tra tài khoản Instagram trước khi đăng lại.");

  const published = await metaCall("instagram", `${base}/${igUserId}/media_publish`, { creation_id: creationId, access_token: token });
  const mediaId = String(published.id ?? "");
  if (!mediaId) throw new PublishError("Instagram không trả về mã bài đăng. Hãy kiểm tra tài khoản trước khi đăng lại.");
  let permalink: string | null = null;
  try {
    const info = await metaCall("instagram", `${base}/${mediaId}`, { fields: "permalink", access_token: token }, "GET");
    permalink = typeof info.permalink === "string" ? info.permalink : null;
  } catch {
    // Bài đã đăng; thiếu permalink không phải lỗi.
  }
  return { externalId: mediaId, externalUrl: permalink };
}

async function publishLinkedIn(admin: AdminClient, post: SocialPost, personId: string, token: string): Promise<PublishResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Linkedin-Version": linkedinVersion(Deno.env.get("HUB_LINKEDIN_VERSION")),
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
  const author = `urn:li:person:${personId}`;
  let imageUrn: string | null = null;

  if (post.image_path) {
    const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", {
      method: "POST",
      headers,
      body: JSON.stringify({ initializeUploadRequest: { owner: author } }),
    });
    const initBody = (await readBody(init)) as { value?: { uploadUrl?: string; image?: string } };
    if (!init.ok || !initBody?.value?.uploadUrl || !initBody.value.image) throw new PublishError(friendlyError("linkedin", init.status, initBody));
    const img = await downloadImage(admin, post.image_path);
    const put = await fetch(initBody.value.uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": img.type },
      body: img.bytes,
    });
    if (!put.ok) throw new PublishError(friendlyError("linkedin", put.status, await readBody(put)));
    imageUrn = initBody.value.image;
  }

  const payload: Record<string, unknown> = {
    author,
    commentary: escapeLinkedInText(post.caption),
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (imageUrn) payload.content = { media: { id: imageUrn } };
  else if (post.link_url) payload.content = { article: { source: post.link_url, title: post.caption.split("\n")[0].slice(0, 100) } };

  const res = await fetch("https://api.linkedin.com/rest/posts", { method: "POST", headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new PublishError(friendlyError("linkedin", res.status, await readBody(res)));
  const urn = res.headers.get("x-restli-id") || res.headers.get("x-linkedin-id") || "";
  if (!urn) throw new PublishError("LinkedIn không trả về mã bài đăng. Hãy kiểm tra trang cá nhân trước khi đăng lại.");
  return { externalId: urn, externalUrl: `https://www.linkedin.com/feed/update/${urn}` };
}

/**
 * Đăng một bài đã được 'claim' (status=publishing) và ghi kết quả vào DB.
 * Luôn kết thúc ở published hoặc failed; không bao giờ để lại publishing.
 */
export async function runPublish(admin: AdminClient, post: SocialPost): Promise<{ ok: boolean; error?: string }> {
  const fail = async (message: string, accountPatch?: Record<string, unknown>) => {
    await admin.from("hub_social_posts").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", post.id);
    if (accountPatch) await admin.from("hub_social_accounts").update({ ...accountPatch, updated_at: new Date().toISOString() }).eq("id", post.account_id);
    return { ok: false, error: message };
  };

  try {
    const { data: account } = await admin.from("hub_social_accounts").select("id,platform,external_id,status,token_expires_at").eq("id", post.account_id).maybeSingle();
    if (!account) return await fail("Tài khoản mạng xã hội đã bị gỡ kết nối.");
    if (account.platform !== post.platform) return await fail("Bài đăng và tài khoản không cùng nền tảng.");
    if (account.token_expires_at && new Date(account.token_expires_at).getTime() < Date.now()) {
      return await fail("Mã kết nối đã hết hạn. Hãy kết nối lại tài khoản rồi đăng lại.", { status: "expired", last_error: "Mã kết nối đã hết hạn." });
    }
    const { data: cred } = await admin.from("hub_social_credentials").select("access_token").eq("account_id", post.account_id).maybeSingle();
    if (!cred?.access_token) return await fail("Thiếu mã kết nối. Hãy kết nối lại tài khoản.", { status: "error" });

    let result: PublishResult;
    if (post.platform === "facebook") result = await publishFacebook(admin, post, account.external_id, cred.access_token);
    else if (post.platform === "instagram") result = await publishInstagram(admin, post, account.external_id, cred.access_token);
    else result = await publishLinkedIn(admin, post, account.external_id, cred.access_token);

    await admin
      .from("hub_social_posts")
      .update({
        status: "published",
        external_post_id: result.externalId,
        external_url: result.externalUrl,
        error: null,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof PublishError ? error.message : "Lỗi không xác định khi đăng bài. Hãy kiểm tra mạng xã hội xem bài đã lên chưa trước khi đăng lại.";
    if (!(error instanceof PublishError)) console.error("hub-social publish", post.id, (error as Error)?.message);
    const expired = /hết hạn|bị thu hồi/.test(message);
    return await fail(message, expired ? { status: "expired", last_error: message } : undefined);
  }
}
