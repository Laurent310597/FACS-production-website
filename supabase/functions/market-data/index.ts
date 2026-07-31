import { corsHeaders } from "../_shared/cors.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
const numberFrom = (value: string | undefined) => Number(String(value || "").replaceAll(".", "").replace(",", ".").replace(/[^0-9.-]/g, "")) || null;

async function vcbRates() {
  const response = await fetch("https://www.vietcombank.com.vn/ExchangeRates/ExrateXML.aspx", { headers: { "User-Agent": "FACS-Market-Monitor/1.0" } });
  if (!response.ok) throw new Error(`VCB ${response.status}`);
  const xml = await response.text();
  const rates = [...xml.matchAll(/<Exrate\s+CurrencyCode="([^"]+)"\s+CurrencyName="([^"]*)"\s+Buy="([^"]*)"\s+Transfer="([^"]*)"\s+Sell="([^"]*)"\s*\/>/g)].map((match) => ({ code: match[1], name: match[2], cash_buy: numberFrom(match[3]), transfer_buy: numberFrom(match[4]), sell: numberFrom(match[5]) }));
  if (!rates.length) throw new Error("VCB response format changed");
  return rates.filter((item) => ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "CNY", "KRW"].includes(item.code));
}

async function sbvCentralRate() {
  const response = await fetch("https://sbv.gov.vn/vi/t%E1%BB%B7-gi%C3%A1", { headers: { "User-Agent": "FACS-Market-Monitor/1.0" } });
  if (!response.ok) throw new Error(`SBV ${response.status}`);
  const html = await response.text();
  const match = html.match(/1\s*Đô la Mỹ\s*=\s*<\/[^>]+>\s*<[^>]+>\s*([0-9.]+)\s*VND/i) || html.match(/Tỷ giá trung tâm[\s\S]{0,1500}?([0-9]{2}\.[0-9]{3})\s*VND/i);
  if (!match) throw new Error("SBV response format changed");
  return numberFrom(match[1]);
}

async function goldData() {
  const [globalResponse, sjcResponse] = await Promise.all([
    fetch("https://api.gold-api.com/price/XAU"),
    fetch("https://sjc.com.vn/giavang/textContent.php", { headers: { "User-Agent": "FACS-Market-Monitor/1.0" } }),
  ]);
  const global = globalResponse.ok ? await globalResponse.json() : null;
  const sjcText = sjcResponse.ok ? await sjcResponse.text() : "";
  const values = [...sjcText.matchAll(/([0-9]{2,3}(?:[.,][0-9]{3})+(?:[.,][0-9]+)?)/g)].map((match) => numberFrom(match[1])).filter((value): value is number => Boolean(value && value > 1_000_000));
  return { world_usd_oz: Number(global?.price) || null, sjc_buy: values[0] || null, sjc_sell: values[1] || null };
}

async function indexQuote(symbol: string, label: string) {
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`${label} ${response.status}`);
  const chart = (await response.json())?.chart?.result?.[0];
  const closes = (chart?.indicators?.quote?.[0]?.close || []).filter((value: unknown) => typeof value === "number");
  const current = Number(chart?.meta?.regularMarketPrice ?? closes.at(-1)) || null;
  const previous = Number(chart?.meta?.chartPreviousClose ?? closes.at(-2)) || null;
  return { label, value: current, change: current && previous ? current - previous : null, change_percent: current && previous ? ((current - previous) / previous) * 100 : null, history: closes.slice(-22) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const [vcb, sbv, gold, indices] = await Promise.allSettled([
    vcbRates(),
    sbvCentralRate(),
    goldData(),
    Promise.all([indexQuote("^VNINDEX", "VN-Index"), indexQuote("^HASTC", "HNX-Index")]),
  ]);
  return json({
    updated_at: new Date().toISOString(),
    vcb: vcb.status === "fulfilled" ? vcb.value : null,
    sbv_central_rate: sbv.status === "fulfilled" ? sbv.value : null,
    gold: gold.status === "fulfilled" ? gold.value : null,
    indices: indices.status === "fulfilled" ? indices.value : [],
    source_status: { vcb: vcb.status, sbv: sbv.status, gold: gold.status, indices: indices.status },
  });
});
