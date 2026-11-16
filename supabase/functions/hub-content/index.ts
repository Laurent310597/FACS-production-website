import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  buildLibraryPrompt,
  buildUserMessage,
  formatExamples,
  formatGuidelines,
  htmlToText,
  HUB_RESPONSE_SCHEMA,
  HUB_SYSTEM_PROMPT,
  MAX_BRIEF_CHARS,
  MAX_PASTED_CHARS,
  MAX_SOURCES,
  normalizeOutputs,
  pickExamples,
  selectGuidelines,
  validateInputPath,
  validateSourceUrl,
} from "../_shared/hub-content.ts";
import type { HubExample, HubGuideline, HubSource } from "../_shared/hub-content.ts";

// FACS Hub – Content Studio. Chỉ quản trị viên đã đăng nhập mới gọi được.
// Hàm này KHÔNG ghi vào bảng posts và KHÔNG gửi email: nó chỉ trả bản nháp để người dùng xem, sửa và tự lưu.

const MAX_FETCH_BYTES = 1_500_000;
const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

type AdminClient = ReturnType<typeof createClient<any>>;

/** Tải ảnh đầu vào từ bucket riêng tư hub-library và chuyển thành data URL cho mô hình đọc. */
async function loadInputImages(admin: AdminClient, raw: unknown): Promise<{ urls: string[]; warnings: string[] }> {
  const paths = (Array.isArray(raw) ? raw : []).map(validateInputPath).filter((p): p is string => !!p).slice(0, MAX_IMAGES);
  const urls: string[] = [];
  const warnings: string[] = [];
  for (const path of paths) {
    const { data, error } = await admin.storage.from("hub-library").download(path);
    if (error || !data) {
      warnings.push(`Không đọc được ảnh ${path.split("/").pop()}.`);
      continue;
    }
    if (data.size > MAX_IMAGE_BYTES || !/^image\/(png|jpeg|webp)$/.test(data.type)) {
      warnings.push(`Ảnh ${path.split("/").pop()} quá lớn hoặc sai định dạng.`);
      continue;
    }
    urls.push(`data:${data.type};base64,${toBase64(new Uint8Array(await data.arrayBuffer()))}`);
  }
  return { urls, warnings };
}

/** Đọc thư mục 1 (hướng dẫn đang bật) và thư mục 3 (bài đã duyệt dùng làm mẫu). Lỗi đọc thư viện không chặn việc tạo bài. */
async function loadLibrary(admin: AdminClient, outputs: ReturnType<typeof normalizeOutputs>, queryText: string) {
  const [guides, examples] = await Promise.all([
    admin.from("hub_guidelines").select("title,kind,applies_to,content").eq("is_active", true).order("sort_order").order("created_at"),
    admin
      .from("hub_approved_examples")
      .select("id,channel,title,category,content,approved_at")
      .eq("is_reference", true)
      .in("channel", outputs)
      .order("approved_at", { ascending: false })
      .limit(60),
  ]);
  if (guides.error) console.error("hub-content guidelines", guides.error.message);
  if (examples.error) console.error("hub-content examples", examples.error.message);
  const guidelineList = selectGuidelines((guides.data ?? []) as HubGuideline[], outputs);
  const exampleList = pickExamples((examples.data ?? []) as HubExample[], outputs, queryText);
  return {
    prompt: buildLibraryPrompt(formatGuidelines(guidelineList), formatExamples(exampleList)),
    guidelineCount: guidelineList.length,
    exampleCount: exampleList.length,
  };
}
const FETCH_TIMEOUT_MS = 12_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function fetchSource(raw: string): Promise<HubSource> {
  let url = validateSourceUrl(raw);
  let res: Response | null = null;
  // Tự theo dõi chuyển hướng để kiểm tra lại từng địa chỉ (chống chuyển hướng về mạng nội bộ).
  for (let hop = 0; hop < 4; hop++) {
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FACS-Hub/1.0; +https://facs.vn)", Accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = validateSourceUrl(new URL(res.headers.get("location")!, url).toString());
      await res.body?.cancel();
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error(`Không tải được ${url.hostname} (mã ${res?.status ?? "?"}). Hãy dán nội dung bài vào ô "Dán nội dung".`);
  const type = res.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml|text\/plain/i.test(type)) {
    await res.body?.cancel();
    throw new Error(`Link ${url.hostname} không phải trang văn bản (${type || "không rõ loại"}). Hãy dán nội dung vào ô "Dán nội dung".`);
  }
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    chunks.push(value);
    if (size > MAX_FETCH_BYTES) {
      await reader.cancel();
      break;
    }
  }
  const html = new TextDecoder("utf-8").decode(await new Blob(chunks).arrayBuffer());
  const { title, text } = /text\/plain/i.test(type) ? { title: "", text: html } : htmlToText(html);
  if (text.length < 200) throw new Error(`Không đọc được nội dung từ ${url.hostname} (trang có thể yêu cầu đăng nhập). Hãy dán nội dung vào ô "Dán nội dung".`);
  return { url: url.toString(), title, text };
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
    if (body.action !== "generate") return json({ error: "Hành động không được hỗ trợ." }, 400);

    const apiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
    if (!apiKey) return json({ error: "Chưa cấu hình OPENAI_API_KEY trong Supabase Edge Function Secrets." }, 503);
    const model = (Deno.env.get("HUB_OPENAI_MODEL") || "gpt-4.1-mini").trim();
    const dailyLimit = Number(Deno.env.get("HUB_DAILY_LIMIT") || 40);

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await admin.from("hub_generation_log").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= dailyLimit) return json({ error: `Đã đạt giới hạn ${dailyLimit} lượt tạo nội dung trong 24 giờ.` }, 429);

    const outputs = normalizeOutputs(body.outputs);
    const brief = String(body.brief ?? "").slice(0, MAX_BRIEF_CHARS);
    const pastedText = String(body.source_text ?? "").slice(0, MAX_PASTED_CHARS);
    const urls: string[] = (Array.isArray(body.source_urls) ? body.source_urls : [])
      .map((u: unknown) => String(u ?? "").trim())
      .filter(Boolean)
      .slice(0, MAX_SOURCES);
    const hasImages = Array.isArray(body.input_files) && body.input_files.length > 0;
    if (!urls.length && !hasImages && pastedText.trim().length < 80 && brief.trim().length < 40) {
      return json({ error: "Hãy nhập ít nhất một link, hoặc dán nội dung nguồn, hoặc mô tả yêu cầu chi tiết hơn." }, 400);
    }

    const sources: HubSource[] = [];
    const warnings: string[] = [];
    for (const raw of urls) {
      try {
        sources.push(await fetchSource(raw));
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
    const images = await loadInputImages(admin, body.input_files);
    warnings.push(...images.warnings);
    if ((urls.length || hasImages) && !sources.length && !images.urls.length && pastedText.trim().length < 80 && brief.trim().length < 40) {
      return json({ error: warnings.join(" ") || "Không đọc được nguồn nào." }, 422);
    }

    const library = await loadLibrary(admin, outputs, `${brief} ${sources.map((s) => s.title).join(" ")} ${pastedText.slice(0, 500)}`);
    const systemPrompt = library.prompt ? `${HUB_SYSTEM_PROMPT}\n\n${library.prompt}` : HUB_SYSTEM_PROMPT;
    const userText = buildUserMessage({ outputs, brief, pastedText, sources, imageCount: images.urls.length });
    const userContent = images.urls.length
      ? [{ type: "text", text: userText }, ...images.urls.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } }))]
      : userText;

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(110_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        max_completion_tokens: 6000,
        response_format: { type: "json_schema", json_schema: HUB_RESPONSE_SCHEMA },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });
    const payload = await ai.json().catch(() => null);
    if (!ai.ok) {
      console.error("hub-content openai error", ai.status, payload?.error?.type, payload?.error?.code);
      const reason = ai.status === 401 ? "API key không hợp lệ." : ai.status === 429 ? "Tài khoản OpenAI hết hạn mức hoặc đang bị giới hạn tốc độ." : "Dịch vụ AI tạm thời lỗi.";
      return json({ error: `Không tạo được nội dung: ${reason}` }, 502);
    }
    const choice = payload?.choices?.[0];
    if (choice?.message?.refusal) return json({ error: "AI từ chối yêu cầu này. Hãy điều chỉnh yêu cầu hoặc nguồn." }, 422);
    let result: unknown;
    try {
      result = JSON.parse(choice?.message?.content ?? "");
    } catch {
      return json({ error: choice?.finish_reason === "length" ? "Nội dung quá dài, hãy giảm số đầu ra hoặc rút gọn nguồn." : "AI trả về dữ liệu không hợp lệ, vui lòng thử lại." }, 502);
    }

    await admin.from("hub_generation_log").insert({ user_id: user.id, model, total_tokens: payload?.usage?.total_tokens ?? 0 });

    return json({
      result,
      outputs,
      sources: sources.map((s) => ({ url: s.url, title: s.title })),
      warnings,
      model,
      library: { guidelines: library.guidelineCount, examples: library.exampleCount },
      remaining_today: Math.max(0, dailyLimit - (count ?? 0) - 1),
    });
  } catch (error) {
    console.error("hub-content error", error instanceof Error ? error.message : error);
    return json({ error: "Có lỗi khi xử lý yêu cầu. Vui lòng thử lại." }, 500);
  }
});
