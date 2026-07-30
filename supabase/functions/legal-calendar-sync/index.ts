import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type Source = {
  id: string;
  name: string;
  domain: string;
  sync_url: string;
  source_tier: string;
  sync_mode: "manual" | "rss" | "link_scan" | "page_watch";
  last_content_hash?: string | null;
};

type Candidate = {
  source_id: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_published_at: string | null;
  content_hash: string;
  raw_metadata: Record<string, unknown>;
  status: "new";
  last_seen_at: string;
};

const KEYWORDS = [
  "lịch pháp lý",
  "thời hạn",
  "hạn nộp",
  "nghĩa vụ",
  "kê khai",
  "báo cáo",
  "quyết toán",
  "thuế",
  "bảo hiểm",
  "lao động",
  "an toàn",
  "môi trường",
  "phòng cháy",
  "legal calendar",
  "deadline",
  "filing",
  "compliance",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireAdmin(req: Request, admin: ReturnType<typeof createClient>) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("UNAUTHORIZED");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("UNAUTHORIZED");
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripMarkup(value: string) {
  return decodeEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function hasKeyword(value: string) {
  const normalized = value.toLocaleLowerCase("vi");
  return KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function safeSourceUrl(source: Source) {
  const url = new URL(source.sync_url);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const allowedDomain = source.domain.toLowerCase().replace(/^www\./, "");
  const isAllowedDomain = hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`);
  const isIpAddress = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
  const isLocal = hostname === "localhost" || hostname.endsWith(".local");
  if (url.protocol !== "https:" || !isAllowedDomain || isIpAddress || isLocal) {
    throw new Error("Nguồn bị từ chối vì không đáp ứng chính sách URL công khai HTTPS.");
  }
  return url;
}

function safeCandidateUrl(href: string, source: Source, base: URL) {
  try {
    const url = new URL(href, base);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowedDomain = source.domain.toLowerCase().replace(/^www\./, "");
    if (url.protocol !== "https:" || (hostname !== allowedDomain && !hostname.endsWith(`.${allowedDomain}`))) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractLinks(html: string, source: Source, base: URL) {
  const candidates: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const title = stripMarkup(match[2]).slice(0, 300);
    const url = safeCandidateUrl(match[1], source, base);
    if (!url || title.length < 12 || !hasKeyword(title) || seen.has(url)) continue;
    seen.add(url);
    candidates.push({ title, url });
    if (candidates.length >= 30) break;
  }
  return candidates;
}

function extractFeedEntries(xml: string, source: Source, base: URL) {
  const entries: Array<{ title: string; url: string; publishedAt: string | null }> = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks.slice(0, 50)) {
    const titleMatch = block.match(/<title\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = block.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*\/?>/i)
      || block.match(/<link\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const dateMatch = block.match(/<(pubDate|published|updated)\b[^>]*>([\s\S]*?)<\/\1>/i);
    const title = stripMarkup(titleMatch?.[1] || "").slice(0, 300);
    const url = safeCandidateUrl(stripMarkup(linkMatch?.[1] || ""), source, base);
    if (!url || title.length < 12 || !hasKeyword(title)) continue;
    const parsedDate = dateMatch?.[2] ? new Date(stripMarkup(dateMatch[2])) : null;
    entries.push({
      title,
      url,
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
    });
  }
  return entries;
}

function relevantPageFingerprint(html: string) {
  const visibleLines = decodeEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
      .replace(/<!--[\s\S]*?-->/g, "\n")
      .replace(/<[^>]+>/g, "\n"),
  )
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 8 && hasKeyword(line))
    .slice(0, 300)
    .join("\n");
  return visibleLines.length > 0 ? visibleLines : stripMarkup(html).slice(0, 100000);
}

async function fetchSource(source: Source) {
  let currentUrl = safeSourceUrl(source);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    for (let redirectCount = 0; redirectCount <= 2; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "Accept": source.sync_mode === "rss" ? "application/rss+xml, application/atom+xml, application/xml, text/xml" : "text/html, application/xhtml+xml",
          "User-Agent": "FACS-Legal-Calendar/1.0 (+https://facs.vn/legal-calendar)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        const nextUrl = location ? safeCandidateUrl(location, source, currentUrl) : null;
        if (!nextUrl) throw new Error("Nguồn chuyển hướng ra ngoài tên miền đã duyệt.");
        currentUrl = new URL(nextUrl);
        continue;
      }

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declaredLength = Number(response.headers.get("content-length") || "0");
      if (declaredLength > 2_000_000) throw new Error("Nguồn vượt giới hạn 2 MB.");
      const body = (await response.text()).slice(0, 2_000_000);
      return { body, finalUrl: currentUrl };
    }
    throw new Error("Nguồn chuyển hướng quá 2 lần.");
  } finally {
    clearTimeout(timeout);
  }
}

async function buildCandidates(source: Source, body: string, finalUrl: URL) {
  const now = new Date().toISOString();
  const results: Candidate[] = [];

  if (source.sync_mode === "page_watch") {
    const contentHash = await sha256(relevantPageFingerprint(body));
    if (source.last_content_hash && source.last_content_hash !== contentHash) {
      results.push({
        source_id: source.id,
        title: `Phát hiện thay đổi tại ${source.name}`,
        summary: "Trang theo dõi có thay đổi liên quan đến lịch, thời hạn hoặc nghĩa vụ tuân thủ. Vui lòng mở nguồn và rà soát trước khi tạo mốc pháp lý.",
        source_url: finalUrl.toString(),
        source_published_at: null,
        content_hash: contentHash,
        raw_metadata: { detection: "page_watch", source_tier: source.source_tier },
        status: "new",
        last_seen_at: now,
      });
    }
    return { results, contentHash };
  }

  const entries = source.sync_mode === "rss"
    ? extractFeedEntries(body, source, finalUrl)
    : extractLinks(body, source, finalUrl).map((item) => ({ ...item, publishedAt: null }));

  for (const entry of entries) {
    const contentHash = await sha256(`${entry.title}\n${entry.url}\n${entry.publishedAt || ""}`);
    results.push({
      source_id: source.id,
      title: entry.title,
      summary: null,
      source_url: entry.url,
      source_published_at: entry.publishedAt,
      content_hash: contentHash,
      raw_metadata: { detection: source.sync_mode, source_tier: source.source_tier },
      status: "new",
      last_seen_at: now,
    });
  }
  return { results, contentHash: await sha256(entries.map((entry) => `${entry.title}|${entry.url}`).join("\n")) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    if (String(body.action || "") !== "sync") return json({ error: "Action không hợp lệ." }, 400);
    const cronSecret = Deno.env.get("FACS_CRON_SECRET") || "";
    const cronAuthorized = Boolean(cronSecret && req.headers.get("x-facs-cron-secret") === cronSecret);
    if (!cronAuthorized) await requireAdmin(req, admin);

    const { data: sources, error: sourceError } = await admin
      .from("legal_calendar_sources")
      .select("id,name,domain,sync_url,source_tier,sync_mode,last_content_hash")
      .eq("is_active", true)
      .eq("sync_enabled", true)
      .neq("sync_mode", "manual")
      .order("source_tier");
    if (sourceError) throw new Error(`Không thể tải danh mục nguồn: ${sourceError.message}`);

    let candidatesCreated = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const source of (sources || []) as Source[]) {
      try {
        const fetched = await fetchSource(source);
        const built = await buildCandidates(source, fetched.body, fetched.finalUrl);
        if (built.results.length > 0) {
          const hashes = built.results.map((candidate) => candidate.content_hash);
          const { data: existing, error: existingError } = await admin
            .from("legal_calendar_candidates")
            .select("content_hash")
            .eq("source_id", source.id)
            .in("content_hash", hashes);
          if (existingError) throw new Error(existingError.message);

          const existingHashes = new Set((existing || []).map((candidate) => candidate.content_hash));
          const newCandidates = built.results.filter((candidate) => !existingHashes.has(candidate.content_hash));
          if (existingHashes.size > 0) {
            await admin
              .from("legal_calendar_candidates")
              .update({ last_seen_at: new Date().toISOString() })
              .eq("source_id", source.id)
              .in("content_hash", Array.from(existingHashes));
          }

          const { data: inserted, error: candidateError } = newCandidates.length > 0
            ? await admin.from("legal_calendar_candidates").insert(newCandidates).select("id")
            : { data: [], error: null };
          if (candidateError) throw new Error(candidateError.message);
          candidatesCreated += inserted?.length || 0;
        }

        const changed = Boolean(source.last_content_hash && source.last_content_hash !== built.contentHash);
        await admin.from("legal_calendar_sources").update({
          last_content_hash: built.contentHash,
          last_checked_at: new Date().toISOString(),
          last_sync_status: changed || built.results.length > 0 ? "ok" : "unchanged",
          last_error: null,
        }).eq("id", source.id);
        results.push({ source: source.name, status: "ok", detected: built.results.length });
      } catch (sourceFailure) {
        const message = sourceFailure instanceof Error ? sourceFailure.message : String(sourceFailure);
        await admin.from("legal_calendar_sources").update({
          last_checked_at: new Date().toISOString(),
          last_sync_status: "error",
          last_error: message.slice(0, 1000),
        }).eq("id", source.id);
        results.push({ source: source.name, status: "error", error: message });
      }
    }

    return json({
      ok: true,
      sources_checked: sources?.length || 0,
      candidates_created: candidatesCreated,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "UNAUTHORIZED") return json({ error: "Unauthorized" }, 401);
    return json({ error: message }, 500);
  }
});
