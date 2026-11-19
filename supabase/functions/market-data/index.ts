import { corsHeaders } from "../_shared/cors.ts";

// Dữ liệu thị trường cho tiện ích /tools/rates-and-gold.
// Nguồn (đã kiểm tra truy cập được từ máy chủ Supabase):
// – Tỷ giá: API JSON chính thức của Vietcombank (dự phòng: XML cũ của VCB).
// – Vàng: giá thế giới gold-api.com; vàng miếng SJC theo bảng giá công bố của PNJ.
// – Chỉ số chứng khoán: dữ liệu biểu đồ ngày của DNSE/Entrade (VN-Index, HNX-Index, VN30, UPCoM).
// Mỗi nguồn lỗi tạm thời sẽ trả về giá trị đã lưu gần nhất (kèm thời điểm), không để trống.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=120" },
  });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 FACS-Market-Monitor/2.0";
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "CNY", "KRW"];

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { "User-Agent": UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(timer);
  }
}

const num = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

const vnDate = (offsetDays = 0) => {
  const d = new Date(Date.now() + 7 * 3600 * 1000 - offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
};

async function vcbRates() {
  // 1) API JSON chính thức (thử hôm nay, nếu chưa có thì hôm trước).
  for (const offset of [0, 1, 2]) {
    try {
      const res = await fetchWithTimeout(`https://www.vietcombank.com.vn/api/exchangerates?date=${vnDate(offset)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const body = await res.json();
      const rows = (body?.Data || [])
        .map((r: Record<string, unknown>) => ({
          code: String(r.currencyCode || "").trim(),
          name: String(r.currencyName || "").trim(),
          cash_buy: num(r.cash),
          transfer_buy: num(r.transfer),
          sell: num(r.sell),
        }))
        .filter((r: { code: string; sell: number | null }) => CURRENCIES.includes(r.code) && r.sell);
      if (rows.length) return { rows, as_of: body?.UpdatedDate || null };
    } catch {
      // thử ngày trước / nguồn dự phòng
    }
  }
  // 2) Dự phòng: XML cũ (số dạng 16,793.14 – dấu phẩy là phân cách hàng nghìn).
  const res = await fetchWithTimeout("https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx", { headers: { Accept: "application/xml,text/xml,*/*" } });
  if (!res.ok) throw new Error(`VCB ${res.status}`);
  const xml = await res.text();
  const n = (v: string) => num(v.replaceAll(",", "").replace("-", ""));
  const rows = [...xml.matchAll(/<Exrate\s+CurrencyCode="([^"]+)"\s+CurrencyName="([^"]*)"\s+Buy="([^"]*)"\s+Transfer="([^"]*)"\s+Sell="([^"]*)"\s*\/>/g)]
    .map((m) => ({ code: m[1].trim(), name: m[2].trim(), cash_buy: n(m[3]), transfer_buy: n(m[4]), sell: n(m[5]) }))
    .filter((r) => CURRENCIES.includes(r.code) && r.sell);
  if (!rows.length) throw new Error("VCB format changed");
  return { rows, as_of: null };
}

async function worldGold() {
  const res = await fetchWithTimeout("https://api.gold-api.com/price/XAU");
  if (!res.ok) throw new Error(`gold-api ${res.status}`);
  const body = await res.json();
  const price = num(body?.price);
  if (!price) throw new Error("gold-api empty");
  return price;
}

async function sjcGold() {
  // Bảng giá PNJ (đơn vị: nghìn đồng/chỉ) → quy đổi VND/lượng (1 lượng = 10 chỉ).
  const res = await fetchWithTimeout("https://edge-api.pnj.io/ecom-frontend/v1/get-gold-price?zone=00", { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`PNJ ${res.status}`);
  const body = await res.json();
  const item = (body?.data || []).find((r: Record<string, unknown>) => String(r.masp || "").toUpperCase() === "SJC");
  const a = num(item?.giamua);
  const b = num(item?.giaban);
  if (!a || !b) throw new Error("SJC price missing");
  return { sjc_buy: Math.min(a, b) * 10000, sjc_sell: Math.max(a, b) * 10000 };
}

async function indexSeries(symbol: string, label: string) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 45 * 86400;
  const res = await fetchWithTimeout(`https://services.entrade.com.vn/chart-api/v2/ohlcs/index?from=${from}&to=${to}&symbol=${symbol}&resolution=1D`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  const body = await res.json();
  const closes: number[] = (body?.c || []).filter((v: unknown) => typeof v === "number");
  if (closes.length < 2) throw new Error(`${label} empty`);
  const current = closes.at(-1) as number;
  const previous = closes.at(-2) as number;
  const lastTs = (body?.t || []).at(-1);
  return {
    label,
    value: current,
    change: current - previous,
    change_percent: ((current - previous) / previous) * 100,
    history: closes.slice(-22),
    as_of: lastTs ? new Date(lastTs * 1000).toISOString() : null,
  };
}

// ── Bộ nhớ đệm (bảng market_data_cache, chỉ service role) ──
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function readCache(): Promise<Record<string, any>> {
  if (!SB_URL || !SB_KEY) return {};
  try {
    const res = await fetch(`${SB_URL}/rest/v1/market_data_cache?id=eq.1&select=payload`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    if (!res.ok) return {};
    const rows = await res.json();
    return rows?.[0]?.payload || {};
  } catch {
    return {};
  }
}

async function writeCache(payload: Record<string, unknown>) {
  if (!SB_URL || !SB_KEY) return;
  try {
    await fetch(`${SB_URL}/rest/v1/market_data_cache?on_conflict=id`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: 1, payload, updated_at: new Date().toISOString() }),
    });
  } catch {
    // Không lưu được bộ nhớ đệm thì vẫn trả dữ liệu mới.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const now = new Date().toISOString();
  const [cache, vcb, world, sjc, indices] = await Promise.all([
    readCache(),
    vcbRates().then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e: String(e?.message || e) })),
    worldGold().then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e: String(e?.message || e) })),
    sjcGold().then((v) => ({ ok: true as const, v }), (e) => ({ ok: false as const, e: String(e?.message || e) })),
    Promise.allSettled([
      indexSeries("VNINDEX", "VN-Index"),
      indexSeries("HNX", "HNX-Index"),
      indexSeries("VN30", "VN30"),
      indexSeries("UPCOM", "UPCoM-Index"),
    ]),
  ]);

  const times: Record<string, string | null> = { ...(cache.source_updated || {}) };
  const status: Record<string, string> = {};
  const pick = <T,>(key: string, result: { ok: true; v: T } | { ok: false; e: string }, cached: T | undefined) => {
    if (result.ok) {
      times[key] = now;
      status[key] = "fulfilled";
      return result.v;
    }
    status[key] = cached != null ? "cached" : "rejected";
    console.warn(`[market-data] ${key}: ${result.e}`);
    return cached ?? null;
  };

  const vcbValue = pick("vcb", vcb, cache.vcb ? { rows: cache.vcb, as_of: cache.vcb_as_of ?? null } : undefined);
  const worldValue = pick("gold_world", world, cache.gold?.world_usd_oz ?? undefined);
  const sjcValue = pick("gold_sjc", sjc, cache.gold?.sjc_buy ? { sjc_buy: cache.gold.sjc_buy, sjc_sell: cache.gold.sjc_sell } : undefined);

  const cachedIndices: any[] = cache.indices || [];
  const indexList = (indices as PromiseSettledResult<any>[]).map((r, i) => {
    const label = ["VN-Index", "HNX-Index", "VN30", "UPCoM-Index"][i];
    if (r.status === "fulfilled") return { ...r.value, cached: false };
    const old = cachedIndices.find((x) => x.label === label);
    return old ? { ...old, cached: true } : null;
  }).filter(Boolean);
  const anyIndexFresh = (indices as PromiseSettledResult<any>[]).some((r) => r.status === "fulfilled");
  if (anyIndexFresh) times.indices = now;
  status.indices = anyIndexFresh ? "fulfilled" : indexList.length ? "cached" : "rejected";

  const gold = { world_usd_oz: worldValue ?? null, sjc_buy: sjcValue?.sjc_buy ?? null, sjc_sell: sjcValue?.sjc_sell ?? null };
  const payload = {
    vcb: vcbValue?.rows ?? null,
    vcb_as_of: vcbValue?.as_of ?? null,
    gold,
    indices: indexList.map(({ cached: _c, ...rest }) => rest),
    source_updated: times,
  };

  if (Object.values(status).some((s) => s === "fulfilled")) await writeCache(payload);

  return json({
    updated_at: now,
    ...payload,
    indices: indexList,
    source_status: { vcb: status.vcb, gold: status.gold_world === "fulfilled" || status.gold_sjc === "fulfilled" ? "fulfilled" : status.gold_world, gold_world: status.gold_world, gold_sjc: status.gold_sjc, indices: status.indices },
  });
});
