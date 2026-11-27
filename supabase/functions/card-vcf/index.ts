// Thẻ danh thiếp số: tệp danh bạ (.vcf) luôn theo thông tin mới nhất mà chủ thẻ tự cập nhật.
// Công khai (chỉ đọc thông tin đã hiển thị trên thẻ), không cần đăng nhập. Dùng chung hàm tạo vCard với trang thẻ.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildVCard } from "../../../src/lib/digitalCard.js";

const SITE = "https://facs.vn";
const MAX_PHOTO_BYTES = 1_500_000;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function loadPhoto(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get("content-type") || "").startsWith("image/jpeg")) return "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length <= MAX_PHOTO_BYTES ? toBase64(bytes) : "";
  } catch {
    return "";
  }
}

const asciiName = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");

Deno.serve(async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").toLowerCase();
  const lang = url.searchParams.get("lang") === "en" ? "en" : "vi";
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return new Response("Not found", { status: 404 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: card } = await admin
    .from("digital_cards")
    .select("slug,name,title_vi,title_en,phone,email,photo_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!card) return Response.redirect(`${SITE}/card/${slug}/${lang === "vi" ? "contact.vcf" : "contact-en.vcf"}`, 302);

  const photoUrl = card.photo_path
    ? `${supabaseUrl}/storage/v1/object/public/card-photos/${card.photo_path}`
    : `${SITE}/card/${slug}.jpg`;
  const photo = await loadPhoto(photoUrl);
  const vcf = buildVCard(
    { slug, name: card.name, title: card.title_en, titleVi: card.title_vi, phone: card.phone, email: card.email },
    lang,
    photo,
  );
  const file = `${asciiName(card.name) || slug}-FACS.vcf`;
  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});
