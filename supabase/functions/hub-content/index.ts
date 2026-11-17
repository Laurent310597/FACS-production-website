import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  buildLibraryPrompt,
  buildUserMessage,
  buildWebReadPrompt,
  extractUrls,
  formatExamples,
  formatGuidelines,
  htmlToText,
  HUB_RESPONSE_SCHEMA,
  HUB_SYSTEM_PROMPT,
  MAX_BRIEF_CHARS,
  MAX_PASTED_CHARS,
  MAX_SOURCES,
  meaningfulLength,
  normalizeOutputs,
  pickExamples,
  referenceImagePaths,
  sameSite,
  selectGuidelines,
  validateInputPath,
  validateSourceUrl,
  WEB_READ_FAILED,
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
    admin.from("hub_guidelines").select("title,kind,applies_to,content,images").eq("is_active", true).order("sort_order").order("created_at"),
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
    // Ảnh mẫu chỉ gửi khi cần tạo infographic (mỗi ảnh tốn thêm token đầu vào).
    referenceImages: outputs.includes("infographic") ? referenceImagePaths(guidelineList) : [],
  };
}

/**
 * Link bị trang nguồn chặn: nhờ OpenAI (công cụ web_search) mở giúp ĐÚNG MỘT LẦN, tối đa một lượt gọi công cụ.
 * Chỉ chấp nhận kết quả khi OpenAI có trích dẫn đúng tên miền được yêu cầu; nếu không thì coi như không đọc được.
 */
async function readViaOpenAI(admin: AdminClient, apiKey: string, model: string, userId: string, url: string): Promise<HubSource | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        store: false,
        tools: [{ type: "web_search" }],
        max_tool_calls: 1,
        max_output_tokens: 3500,
        input: buildWebReadPrompt(url),
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("hub-content web read error", res.status, payload?.error?.type, payload?.error?.code);
      return null;
    }
    await admin.from("hub_generation_log").insert({ user_id: userId, model: `${model}+web_search`, total_tokens: payload?.usage?.total_tokens ?? 0 });
    let text = "";
    const cited: string[] = [];
    for (const item of payload?.output ?? []) {
      if (item?.type !== "message") continue;
      for (const part of item.content ?? []) {
        if (part?.type !== "output_text") continue;
        text += part.text ?? "";
        for (const a of part.annotations ?? []) if (a?.type === "url_citation" && a.url) cited.push(String(a.url));
      }
    }
    text = text.trim();
    if (text.includes(WEB_READ_FAILED) || text.length < 300) return null;
    if (!cited.some((c) => sameSite(c, url))) return null; // không có bằng chứng đã đọc đúng trang → không dùng
    return { url, title: text.split("\n")[0].replace(/^[#*\s]+/, "").slice(0, 200), text };
  } catch (error) {
    console.error("hub-content web read failed", error instanceof Error ? error.message : error);
    return null;
  }
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
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = validateSourceUrl(new URL(res.headers.get("location")!, url).toString());
      await res.body?.cancel();
      continue;
    }
    break;
  }
  if (!res || !res.ok) {
    const blocked = res?.status === 403 || res?.status === 401 || res?.status === 429;
    throw new Error(
      blocked
        ? `Trang ${url.hostname} chặn việc đọc tự động (mã ${res?.status}). Hãy mở bài, chép phần chữ của bài viết và dán vào ô "Dán nội dung".`
        : `Không tải được ${url.hostname} (mã ${res?.status ?? "?"}). Hãy chép phần chữ của bài viết và dán vào ô "Dán nội dung".`,
    );
  }
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
    const rawPasted = String(body.source_text ?? "").slice(0, MAX_PASTED_CHARS);
    // Ô "Dán nội dung" chỉ chứa link (không có chữ của bài) thì coi các link đó là link nguồn, không phải nội dung.
    const pastedIsOnlyLinks = meaningfulLength(rawPasted) < 80;
    const pastedText = pastedIsOnlyLinks ? "" : rawPasted;
    const urls: string[] = [
      ...new Set([
        ...(Array.isArray(body.source_urls) ? body.source_urls : []).map((u: unknown) => String(u ?? "").trim()).filter(Boolean),
        ...(pastedIsOnlyLinks ? extractUrls(rawPasted) : []),
      ]),
    ].slice(0, MAX_SOURCES);
    const hasImages = Array.isArray(body.input_files) && body.input_files.length > 0;
    if (!urls.length && !hasImages && pastedText.trim().length < 80 && brief.trim().length < 40) {
      return json({ error: "Hãy nhập ít nhất một link, hoặc dán nội dung nguồn, hoặc mô tả yêu cầu chi tiết hơn." }, 400);
    }

    const sources: HubSource[] = [];
    const warnings: string[] = [];
    const webRead: string[] = [];
    for (const raw of urls) {
      let target: URL;
      try {
        target = validateSourceUrl(raw);
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
        continue;
      }
      try {
        sources.push(await fetchSource(raw));
      } catch {
        // Hub không đọc trực tiếp được → nhờ OpenAI đọc, đúng một lần cho mỗi link, không thử lại.
        const viaOpenAI = await readViaOpenAI(admin, apiKey, model, user.id, target.toString());
        if (viaOpenAI) {
          sources.push(viaOpenAI);
          webRead.push(target.hostname);
        } else {
          warnings.push(`Không đọc được link ${target.hostname}, kể cả khi nhờ OpenAI đọc (đã thử 1 lần, không thử thêm). Hãy mở bài, chép phần chữ và dán vào ô "Dán nội dung".`);
        }
      }
    }
    const images = await loadInputImages(admin, body.input_files);
    warnings.push(...images.warnings);
    // Người dùng có gửi link/ảnh nhưng không đọc được cái nào và cũng không có nội dung dán:
    // dừng lại, KHÔNG để AI tự viết từ tiêu đề hay đường dẫn (dễ bịa số liệu, quy định).
    if ((urls.length || hasImages) && !sources.length && !images.urls.length && pastedText.trim().length < 80) {
      return json({ error: `${warnings.join(" ") || "Không đọc được nguồn nào."} Chưa tạo nội dung vì không có tài liệu nguồn để viết.` }, 422);
    }

    const library = await loadLibrary(admin, outputs, `${brief} ${sources.map((s) => s.title).join(" ")} ${pastedText.slice(0, 500)}`);
    const systemPrompt = library.prompt ? `${HUB_SYSTEM_PROMPT}\n\n${library.prompt}` : HUB_SYSTEM_PROMPT;
    const refs = await loadInputImages(admin, library.referenceImages);
    const userText = buildUserMessage({ outputs, brief, pastedText, sources, imageCount: images.urls.length, referenceImageCount: refs.urls.length });
    const allImages = [...images.urls, ...refs.urls];
    const userContent = allImages.length
      ? [{ type: "text", text: userText }, ...allImages.map((url) => ({ type: "image_url", image_url: { url, detail: "high" } }))]
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

    if (webRead.length && result && typeof result === "object") {
      const r = result as { review_notes?: string[] };
      r.review_notes = [
        `Nguồn ${webRead.join(", ")} được đọc gián tiếp qua OpenAI vì trang chặn Hub: hãy đối chiếu mọi số liệu, ngày tháng với bài gốc trước khi đăng.`,
        ...(Array.isArray(r.review_notes) ? r.review_notes : []),
      ];
    }

    return json({
      result,
      outputs,
      sources: sources.map((s) => ({ url: s.url, title: s.title })),
      warnings,
      model,
      library: { guidelines: library.guidelineCount, examples: library.exampleCount, reference_images: refs.urls.length },
      web_reads: webRead,
      remaining_today: Math.max(0, dailyLimit - (count ?? 0) - 1),
    });
  } catch (error) {
    console.error("hub-content error", error instanceof Error ? error.message : error);
    return json({ error: "Có lỗi khi xử lý yêu cầu. Vui lòng thử lại." }, 500);
  }
});
