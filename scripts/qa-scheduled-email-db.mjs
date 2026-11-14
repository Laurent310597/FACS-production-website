process.on("uncaughtException", (e) => {
  console.error(e.message, e.where || "", e.detail || "");
  process.exit(1);
});
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url).pathname;
const db = new PGlite({ extensions: { citext } });
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create function auth.role() returns text language sql as $$select 'authenticated'::text$$;
create function auth.uid() returns uuid language sql as $$select null::uuid$$;
`);
let setup = readFileSync(root + "supabase/setup.sql", "utf8");
setup = setup
  .replace("create extension if not exists pgcrypto;", "")
  .split("-- Create a public bucket")[0];
setup = setup.slice(
  0,
  setup.indexOf("insert into storage.") >= 0
    ? setup.indexOf("insert into storage.")
    : undefined,
);
await db.exec(setup);
for (const name of [
  "v20.3-insight-email-notifications.sql",
  "v20.17-insight-email-safe-delivery.sql",
  "20261031162725_insight_email_server_permissions.sql",
  "20261102061916_insight_email_repeat_and_single_delivery.sql",
  "20261102072832_insight_individual_read_only_claim.sql",
  "20261102181131_insight_email_selected_delivery.sql",
  "20261114143825_scheduled_insight_email.sql",
]) {
  await db.exec(readFileSync(root + "supabase/migrations/" + name, "utf8"));
}
console.log("Schema and migration applied");
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const user = crypto.randomUUID();
const a = crypto.randomUUID(),
  b = crypto.randomUUID();
await db.query(
  `insert into insight_email_audience(id,email,status) values ($1,'a@example.com','subscribed'),($2,'b@example.com','subscribed')`,
  [a, b],
);
async function article() {
  const id = crypto.randomUUID();
  await db.query(
    `insert into posts(id,slug,title_vi,content_vi,status,published_at,email_delivery_mode) values($1::uuid,$1::text,'QA','Content','published',now()+interval '3 days','review_after_publish')`,
    [id],
  );
  await db.query(
    `update posts set email_notification_preview_hash='hash',email_notification_test_hash='hash',email_notification_tested_at=now() where id=$1`,
    [id],
  );
  return (
    await one("select to_jsonb(p) as post from posts p where id=$1", [id])
  ).post;
}
async function confirm(post, id = crypto.randomUUID()) {
  return (
    await one(
      `select confirm_insight_email_schedule($1,$2,$3,'hash',$4,$5,$6,$7) as result`,
      [
        post.id,
        user,
        id,
        post.updated_at,
        post.published_at,
        [a, b],
        ["a@example.com", "b@example.com"],
      ],
    )
  ).result;
}
let p = await article();
let schedule = await confirm(p);
assert.equal(schedule.status, "scheduled");
assert.equal((await confirm(p, schedule.id)).id, schedule.id);
assert.equal(
  (
    await one(`select claim_scheduled_insight_email($1,'hash') as result`, [
      schedule.id,
    ])
  ).result,
  null,
);
await assert.rejects(() => confirm(p), /duplicate key/);
await db.query("select cancel_insight_email_schedule($1,$2)", [
  p.id,
  schedule.id,
]);
assert.equal(
  (
    await one("select status from insight_email_schedules where id=$1", [
      schedule.id,
    ])
  ).status,
  "cancelled",
);
schedule = await confirm(p);
await db.query(`update posts set content_vi='Changed' where id=$1`, [p.id]);
assert.equal(
  (
    await one("select status from insight_email_schedules where id=$1", [
      schedule.id,
    ])
  ).status,
  "invalidated",
);
p = await article();
schedule = await confirm(p);
await db.query(
  `update posts set published_at=published_at+interval '1 hour' where id=$1`,
  [p.id],
);
assert.equal(
  (
    await one("select status from insight_email_schedules where id=$1", [
      schedule.id,
    ])
  ).status,
  "invalidated",
);
p = await article();
await db.query(
  `update posts set email_notification_tested_at=now()-interval '25 hours' where id=$1`,
  [p.id],
);
p = (await one("select to_jsonb(p) as post from posts p where id=$1", [p.id]))
  .post;
await assert.rejects(() => confirm(p), /24 giờ/);
p = await article();
schedule = await confirm(p);
// Move the clock of only this fixture: time travel is deliberately outside application APIs.
await db.exec("alter table posts disable trigger all");
await db.query(
  `update posts set published_at=now()-interval '1 minute',email_notification_tested_at=now()-interval '3 days' where id=$1`,
  [p.id],
);
await db.exec("alter table posts enable trigger all");
await db.query(
  "update insight_email_schedules set scheduled_at=(select published_at from posts where id=$1) where id=$2",
  [p.id, schedule.id],
);
await db.query(
  `update insight_email_audience set status='unsubscribed' where id=$1`,
  [b],
);
await db.exec("set role service_role");
let claim = (
  await one(`select claim_scheduled_insight_email($1,'hash') as result`, [
    schedule.id,
  ])
).result;
assert.deepEqual(claim.bcc, ["a@example.com"]);
assert.equal(
  (
    await one(`select claim_scheduled_insight_email($1,'hash') as result`, [
      schedule.id,
    ])
  ).result,
  null,
);
await db.query("select finalize_insight_email_delivery($1,$2,$3,null)", [
  p.id,
  claim.log_id,
  "fixture-message",
]);
assert.equal(
  (
    await one("select status from insight_email_schedules where id=$1", [
      schedule.id,
    ])
  ).status,
  "sent",
);
await db.exec("reset role");
await db.exec("set role authenticated");
await assert.rejects(
  () => db.query("select * from insight_email_schedules"),
  /permission denied/,
);
await assert.rejects(
  () =>
    db.query(`select claim_scheduled_insight_email($1,'hash')`, [schedule.id]),
  /permission denied/,
);
await db.exec("reset role");
console.log(
  "PASS confirmation, duplicate request, duplicate active schedule, no early send, cancel, content/time invalidation, review expiry at approval only, opt-out filtering, no duplicate claim, finalization and browser-role isolation",
);
await db.close();
