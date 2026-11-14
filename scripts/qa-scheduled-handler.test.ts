function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
Deno.test(
  "scheduled handler validates approval and scheduler authentication before dispatch",
  async () => {
    const previousFetch = globalThis.fetch;
    const previousServe = Deno.serve;
    const keys = [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "MICROSOFT_TENANT_ID",
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ];
    const prior = keys.map((key) => Deno.env.get(key));
    keys.forEach((key) =>
      Deno.env.set(
        key,
        key === "SUPABASE_URL" ? "https://qa.invalid" : "fixture",
      ),
    );
    let handler: (request: Request) => Promise<Response>;
    Deno.serve = ((callback: typeof handler) => {
      handler = callback;
      return {};
    }) as typeof Deno.serve;
    const post: Record<string, any> = {
      id: crypto.randomUUID(),
      title_vi: "Scheduled",
      content_vi: "Reviewed",
      slug: "scheduled",
      status: "published",
      email_delivery_mode: "review_after_publish",
      published_at: new Date(Date.now() + 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    const contact = {
      id: crypto.randomUUID(),
      email: "scheduled@example.com",
      status: "subscribed",
    };
    const requestId = crypto.randomUUID();
    let schedule: any = null;
    let submitted = 0;
    let confirmArgs: any;
    const response = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
      );
      if (url.hostname === "login.microsoftonline.com") return response({ access_token: "fixture" });
    const body = init.body ? JSON.parse(String(init.body)) : {};
      if (url.pathname === "/auth/v1/user")
        return response({ id: crypto.randomUUID(), aud: "authenticated" });
      if (url.pathname === "/rest/v1/posts") {
        if (init.method === "PATCH") Object.assign(post, body);
        return response(post);
      }
      if (url.pathname === "/rest/v1/insight_email_audience")
        return response([contact]);
      if (url.pathname === "/rest/v1/insight_email_schedules")
        return response(schedule?.status === "scheduled" ? [schedule] : []);
      if (url.pathname.endsWith("/rpc/confirm_insight_email_schedule")) {
        confirmArgs = body;
        schedule = {
          id: body.p_request_id,
          post_id: post.id,
          status: "scheduled",
        };
        return response(schedule);
      }
      if (url.pathname.endsWith("/rpc/cancel_insight_email_schedule")) {
        schedule.status = "cancelled";
        return response(null);
      }
      if (url.pathname.endsWith("/rpc/verify_insight_schedule_token"))
        return response(body.p_token === "valid-scheduler-fixture");
      if (url.pathname.endsWith("/rpc/claim_scheduled_insight_email")) {
        if (schedule.status !== "scheduled") return response(null);
        schedule.status = "processing";
        return response({
          post,
          request_id: schedule.id,
          log_id: crypto.randomUUID(),
          status: "processing",
          audience_id: null,
          bcc: [contact.email],
          cc: ["yendoan@facs.vn", "thanhhuynh@facs.vn"],
        });
      }
      if (url.pathname.endsWith("/rpc/finalize_insight_email_delivery")) {
        schedule.status = "sent";
        return response(null);
      }
      if (url.hostname === "login.microsoftonline.com")
        return response({ access_token: "fixture" });
      if (url.hostname === "graph.microsoft.com") {
        check(body.message.bccRecipients.length === 1, "only approved Bcc");
        check(
          body.message.bccRecipients[0].emailAddress.address === contact.email,
          "correct Bcc",
        );
        submitted++;
        return new Response(null, { status: 202 });
      }
      throw new Error(`Unexpected fixture request ${url.pathname}`);
    };
    try {
      await import("../supabase/functions/insight-email/index.ts?scheduled-tests");
      const call = async (body: any, cron?: string) =>
        handler(
          new Request("https://qa.invalid/functions/v1/insight-email", {
            method: "POST",
            headers:
              cron === undefined
                ? {
                    authorization: "Bearer fixture",
                    "Content-Type": "application/json",
                  }
                : {
                    "x-facs-cron-secret": cron,
                    "Content-Type": "application/json",
                  },
            body: JSON.stringify(body),
          }),
        );
      const preview = await (
        await call({ action: "preview", post_id: post.id })
      ).json();
      const plan = await (
        await call({ action: "prepare_schedule", post_id: post.id })
      ).json();
      check(plan.bcc[0] === contact.email, "prepare exact audience");
      check(Number(submitted) === 0, "prepare must not send");
      let result = await call({
        action: "confirm_schedule",
        post_id: post.id,
        confirmation_text: "wrong",
      });
      check(result.status === 500, "requires explicit confirmation");
      result = await call({
        action: "confirm_schedule",
        post_id: post.id,
        confirmation_text: "SCHEDULE-AUDIENCE",
        preview_hash: "stale",
      });
      check(result.status === 500, "reject stale hash");
      result = await call({
        action: "confirm_schedule",
        post_id: post.id,
        confirmation_text: "SCHEDULE-AUDIENCE",
        preview_hash: preview.preview_hash,
        request_id: requestId,
        scheduled_at: post.published_at,
        expected_updated_at: post.updated_at,
        audience_ids: [contact.id],
        expected_bcc: [contact.email],
      });
      check(result.ok, "confirm calls database approval transaction");
      check(
        confirmArgs.p_scheduled_at === post.published_at,
        "exact publication time passed",
      );
      check(Number(submitted) === 0, "confirm must not send");
      result = await call({ action: "process_scheduled" }, "wrong");
      check(result.status === 401, "unauthorized scheduler rejected");
      result = await call(
        { action: "process_scheduled" },
        "valid-scheduler-fixture",
      );
      check(
        result.ok && Number(submitted) === 1 && schedule.status === "sent",
        "approved due claim sent and finalized",
      );
      await call({ action: "process_scheduled" }, "valid-scheduler-fixture");
      check(Number(submitted) === 1, "repeat tick must not resend");
    } finally {
      globalThis.fetch = previousFetch;
      Deno.serve = previousServe;
      keys.forEach((key, index) =>
        prior[index] === undefined
          ? Deno.env.delete(key)
          : Deno.env.set(key, prior[index]!),
      );
    }
  },
);
