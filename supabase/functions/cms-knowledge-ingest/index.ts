import { createClient } from "npm:@supabase/supabase-js@2";
import * as mammoth from "npm:mammoth@1.12.0";
import { extractText, getDocumentProxy } from "npm:unpdf@1.8.0";
import { cleanAIText } from "../_shared/ai.ts";
import { sha256 } from "../_shared/form-validation.ts";

const BUCKET = "cms-private-library";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_URL_BYTES = 8 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 600_000;
const DEFAULT_ORIGINS = [
  "https://facs.vn",
  "https://www.facs.vn",
  "https://facs-production-website.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "application/xhtml+xml",
  "application/json",
]);

function configuredOrigins() {
  const origins = Deno.env.get("FACS_AI_ALLOWED_ORIGINS")
    ?.split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return origins?.length ? origins : DEFAULT_ORIGINS;
}

function requestOrigin(req: Request) {
  return req.headers.get("origin")?.trim() || "";
}

function isAllowedOrigin(req: Request) {
  const origin = requestOrigin(req);
  return !origin || configuredOrigins().includes(origin.toLowerCase());
}

function corsHeaders(req: Request) {
  const origin = requestOrigin(req);
  const allowed = configuredOrigins();
  return {
    "Access-Control-Allow-Origin": origin && allowed.includes(origin.toLowerCase()) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}

function bearerToken(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

function blockedHostname(hostname: string) {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!value || value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local") || value.endsWith(".internal")) {
    return true;
  }
  if (value.includes(":")) return true;
  const ipv4 = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const parts = ipv4.slice(1).map(Number);
  if (parts.some((part) => part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

function safePublicUrl(value: unknown) {
  const raw = cleanAIText(value, 2_000);
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || blockedHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function contentType(value: string) {
  return value.split(";")[0].trim().toLowerCase();
}

function mimeFromName(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "text/html";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".txt")) return "text/plain";
  return "";
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    const lower = entity.toLowerCase();
    if (named[lower]) return named[lower];
    const radix = lower.startsWith("#x") ? 16 : 10;
    const digits = lower.startsWith("#x") ? lower.slice(2) : lower.slice(1);
    const codePoint = Number.parseInt(digits, radix);
    if (lower.startsWith("#") && Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
      && !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      return String.fromCodePoint(codePoint);
    }
    return " ";
  });
}

function normalizeExtractedText(value: string) {
  return value
    .replaceAll("\u0000", "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

function htmlText(html: string) {
  const withoutUnsafe = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|canvas|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return normalizeExtractedText(decodeEntities(withoutUnsafe));
}

function htmlTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanAIText(match ? decodeEntities(match[1].replace(/<[^>]+>/g, " ")) : "", 300);
}

async function extractDocument(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf") {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > 500) throw new Error("PDF vượt quá giới hạn 500 trang.");
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
    return normalizeExtractedText(text || "");
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);
    const result = await mammoth.extractRawText({ arrayBuffer });
    return normalizeExtractedText(result.value || "");
  }

  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (mimeType === "text/html" || mimeType === "application/xhtml+xml") return htmlText(decoded);
  if (mimeType === "application/json") {
    try {
      return normalizeExtractedText(JSON.stringify(JSON.parse(decoded), null, 2));
    } catch {
      throw new Error("File JSON không hợp lệ.");
    }
  }
  return normalizeExtractedText(decoded);
}

function chunksFromText(value: string) {
  const target = 4_800;
  const overlap = 350;
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < value.length && chunks.length < 160) {
    let end = Math.min(value.length, cursor + target);
    if (end < value.length) {
      const paragraphBreak = value.lastIndexOf("\n\n", end);
      const sentenceBreak = value.lastIndexOf(". ", end);
      const preferred = Math.max(paragraphBreak, sentenceBreak);
      if (preferred > cursor + 2_500) end = preferred + (preferred === sentenceBreak ? 1 : 0);
    }
    const chunk = value.slice(cursor, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= value.length) break;
    cursor = Math.max(cursor + 1, end - overlap);
  }
  return chunks;
}

async function readLimitedBody(response: Response, maxBytes: number) {
  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw new Error("Nội dung URL vượt quá giới hạn 8 MB.");
    return bytes;
  }

  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("FACS URL size limit exceeded").catch(() => undefined);
        throw new Error("Nội dung URL vượt quá giới hạn 8 MB.");
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

async function fetchPublicDocument(initialUrl: URL) {
  let current = initialUrl;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf,text/plain,text/markdown,text/csv,application/json;q=0.9,*/*;q=0.1",
        "User-Agent": "FACS-CMS-Knowledge/20.19 (+https://facs.vn)",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Nguồn URL chuyển hướng nhưng không cung cấp địa chỉ đích.");
      const next = safePublicUrl(new URL(location, current).href);
      if (!next) throw new Error("Nguồn URL chuyển hướng tới địa chỉ không được phép.");
      current = next;
      continue;
    }
    if (!response.ok) throw new Error(`Không thể tải URL (HTTP ${response.status}).`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_URL_BYTES) throw new Error("Nội dung URL vượt quá giới hạn 8 MB.");
    const bytes = await readLimitedBody(response, MAX_URL_BYTES);
    const declaredMimeType = contentType(response.headers.get("content-type") || "");
    const mimeType = SUPPORTED_MIME_TYPES.has(declaredMimeType) ? declaredMimeType : mimeFromName(current.pathname);
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) throw new Error(`Định dạng URL chưa được hỗ trợ: ${mimeType || "không xác định"}.`);
    return { bytes, mimeType, finalUrl: current.href };
  }
  throw new Error("Nguồn URL chuyển hướng quá nhiều lần.");
}

async function updateError(
  // deno-lint-ignore no-explicit-any
  admin: any,
  documentId: string,
  userId: string,
  error: unknown,
) {
  const message = cleanAIText(error instanceof Error ? error.message : error, 1_000);
  await admin.from("cms_knowledge_documents").update({
    status: "error",
    extraction_error: message,
    updated_by: userId,
  }).eq("id", documentId);
  return message;
}

Deno.serve(async (req) => {
  if (!isAllowedOrigin(req)) return json(req, { error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 30_000) return json(req, { error: "Request is too large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const token = bearerToken(req);
  if (!supabaseUrl || !serviceKey) return json(req, { error: "CMS knowledge backend is not configured." }, 503);
  if (!token) return json(req, { error: "Vui lòng đăng nhập lại CMS." }, 401);

  // deno-lint-ignore no-explicit-any
  const admin: any = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(req, { error: "Phiên đăng nhập CMS không hợp lệ." }, 401);

  const body = await req.json().catch(() => ({}));
  const action = body?.action === "ingest_file" ? "ingest_file" : body?.action === "ingest_url" ? "ingest_url" : "";
  if (!action) return json(req, { error: "Yêu cầu nhập thư viện không hợp lệ." }, 400);

  const rateKey = await sha256(`cms-knowledge:${user.id}:${serviceKey.slice(0, 24)}`);
  const { data: allowed, error: rateError } = await admin.rpc("check_form_submission_rate_limit", {
    p_ip_hash: rateKey,
    p_limit: 30,
    p_window_minutes: 60,
  });
  if (rateError) return json(req, { error: "Không thể kiểm tra giới hạn nhập thư viện." }, 500);
  if (!allowed) return json(req, { error: "Đã vượt giới hạn nhập thư viện trong giờ này." }, 429);

  const tags = Array.isArray(body?.tags)
    ? body.tags.map((item: unknown) => cleanAIText(item, 80)).filter(Boolean).slice(0, 30)
    : [];
  const requestedTitle = cleanAIText(body?.title, 300);
  let documentId = "";

  try {
    let title = requestedTitle;
    let sourceUrl: string | null = null;
    let storagePath: string | null = null;
    let fileName: string | null = null;
    let mimeType = "";
    let fileSizeBytes = 0;
    let bytes: Uint8Array;

    if (action === "ingest_url") {
      const url = safePublicUrl(body?.url);
      if (!url) return json(req, { error: "URL phải là địa chỉ HTTPS công khai và hợp lệ." }, 400);
      const fetched = await fetchPublicDocument(url);
      bytes = fetched.bytes;
      mimeType = fetched.mimeType;
      fileSizeBytes = bytes.byteLength;
      sourceUrl = fetched.finalUrl;
      if (!title && (mimeType === "text/html" || mimeType === "application/xhtml+xml")) {
        title = htmlTitle(new TextDecoder().decode(bytes));
      }
      if (!title) title = url.hostname;
    } else {
      storagePath = cleanAIText(body?.storage_path, 1_000);
      fileName = cleanAIText(body?.file_name, 300);
      const requestedMimeType = contentType(cleanAIText(body?.mime_type, 200));
      mimeType = SUPPORTED_MIME_TYPES.has(requestedMimeType) ? requestedMimeType : mimeFromName(fileName);
      if (!storagePath.startsWith(`${user.id}/`)) return json(req, { error: "Đường dẫn file không thuộc phiên quản trị hiện tại." }, 403);
      if (!SUPPORTED_MIME_TYPES.has(mimeType)) return json(req, { error: `Định dạng file chưa được hỗ trợ: ${mimeType || "không xác định"}.` }, 400);
      const { data: fileData, error: downloadError } = await admin.storage.from(BUCKET).download(storagePath);
      if (downloadError || !fileData) throw new Error(`Không thể đọc file đã upload: ${downloadError?.message || "không tìm thấy file"}.`);
      fileSizeBytes = fileData.size;
      if (fileSizeBytes > MAX_FILE_BYTES) throw new Error("File vượt quá giới hạn 15 MB.");
      bytes = new Uint8Array(await fileData.arrayBuffer());
      if (!title) title = fileName || "Tài liệu CMS";
    }

    const insertPayload = {
      title,
      source_type: action === "ingest_url" ? "url" : "file",
      source_url: sourceUrl,
      storage_bucket: action === "ingest_file" ? BUCKET : null,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: mimeType,
      file_size_bytes: fileSizeBytes,
      status: "processing",
      tags,
      created_by: user.id,
      updated_by: user.id,
    };
    const { data: document, error: insertError } = await admin
      .from("cms_knowledge_documents")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insertError || !document?.id) throw new Error(`Không thể tạo bản ghi thư viện: ${insertError?.message || "unknown"}.`);
    documentId = document.id;

    const text = await extractDocument(bytes, mimeType);
    if (text.length < 40) {
      throw new Error(mimeType === "application/pdf"
        ? "PDF không có đủ lớp văn bản để trích xuất; file scan cần OCR trước khi upload."
        : "Tài liệu không có đủ nội dung văn bản để lập chỉ mục.");
    }
    const chunks = chunksFromText(text);
    if (!chunks.length) throw new Error("Không thể chia nội dung thành các đoạn tìm kiếm.");
    const contentHash = await sha256(text);
    const rows = chunks.map((content, chunkIndex) => ({
      document_id: documentId,
      chunk_index: chunkIndex,
      content,
      token_estimate: Math.ceil(content.length / 4),
    }));
    for (let offset = 0; offset < rows.length; offset += 50) {
      const { error: chunkError } = await admin.from("cms_knowledge_chunks").insert(rows.slice(offset, offset + 50));
      if (chunkError) throw new Error(`Không thể lập chỉ mục tài liệu: ${chunkError.message}.`);
    }
    const { error: activateError } = await admin.from("cms_knowledge_documents").update({
      status: "active",
      extraction_error: null,
      content_hash: contentHash,
      source_url: sourceUrl,
      updated_by: user.id,
    }).eq("id", documentId);
    if (activateError) throw new Error(`Không thể kích hoạt tài liệu: ${activateError.message}.`);

    return json(req, {
      ok: true,
      document_id: documentId,
      title,
      status: "active",
      chunks: chunks.length,
      characters: text.length,
      source_type: action === "ingest_url" ? "url" : "file",
    });
  } catch (error) {
    const message = documentId ? await updateError(admin, documentId, user.id, error) : cleanAIText(error instanceof Error ? error.message : error, 1_000);
    console.error("CMS knowledge ingestion failed", message);
    return json(req, { error: message || "Không thể nhập tài liệu vào thư viện." }, 500);
  }
});
