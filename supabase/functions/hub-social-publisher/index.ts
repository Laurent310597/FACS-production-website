import { createClient } from "npm:@supabase/supabase-js@2";
import { runPublish } from "../_shared/hub-social-publish.ts";
import type { SocialPost } from "../_shared/hub-social-publish.ts";

// Chạy mỗi phút bằng pg_cron (cùng cách với lịch email Insights). Chỉ đăng các bài admin đã "Duyệt & hẹn giờ".
// Bảo vệ bằng header x-facs-cron-secret, đối chiếu với khóa nằm trong Supabase Vault (qua hàm hub_social_verify_cron); không dùng JWT của người dùng.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const given = (req.headers.get("x-facs-cron-secret") || "").trim();
  const { data: allowed } = given ? await admin.rpc("hub_social_verify_cron", { p_token: given }) : { data: false };
  if (allowed !== true) return json({ error: "Unauthorized" }, 401);

  const stuck = await admin.rpc("hub_social_release_stuck");
  const { data: due, error } = await admin.rpc("hub_social_claim_due", { p_limit: 5 });
  if (error) {
    console.error("hub-social-publisher claim", error.message);
    return json({ error: "claim failed" }, 500);
  }

  const results: { id: string; ok: boolean }[] = [];
  for (const post of (due ?? []) as SocialPost[]) {
    const r = await runPublish(admin, post);
    results.push({ id: post.id, ok: r.ok });
  }
  return json({ released_stuck: stuck.data ?? 0, processed: results.length, results });
});
