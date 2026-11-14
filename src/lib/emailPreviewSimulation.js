import { buildInsightEmail } from "../../supabase/functions/_shared/email-template.ts";
import { selectedAudienceIds, selectedAudienceSnapshot } from "../../supabase/functions/_shared/insight-selection.ts";
import { canSelectContact, loadEmailAudience } from "./emailAudience";
import { emailReviewState } from "./insightEmailWorkflow";
import { supabase } from "./supabaseClient";

const simulations = new Map();
const sender = "infor@facs.vn";
const to = ["tunguyen@facs.vn"];
const cc = ["yendoan@facs.vn", "thanhhuynh@facs.vn"];

function recipients(bcc, copies = cc) {
  return { sender, to, cc: copies, bcc, bcc_count: bcc.length, total_recipients: 1 + copies.length + bcc.length };
}

async function recipientSnapshot(ids, { allowEmpty = false } = {}) {
  const contacts = (await loadEmailAudience(supabase)).filter(canSelectContact);
  if (allowEmpty && !contacts.length) return { contacts: [], bcc: [] };
  const selected = selectedAudienceIds(ids?.length ? ids : contacts.map((contact) => contact.id));
  return selectedAudienceSnapshot(selected, contacts.filter((contact) => selected.includes(contact.id)));
}

export async function simulateInsightEmail(action, body) {
  if (action === "oauth_status") return { connected: true, mailbox_email: sender };
  if (action === "test" && !body.post_id) return { ok: true, to: to[0] };

  const { data: source, error } = await supabase.from("posts").select("*").eq("id", body.post_id).single();
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  const state = simulations.get(source.id) || {};
  if (state.sourceVersion !== source.updated_at) {
    if (state.schedule?.status === "scheduled") state.schedule = { ...state.schedule, status: "invalidated" };
    state.sourceVersion = source.updated_at;
    state.review = {};
    state.plan = null;
  }
  simulations.set(source.id, state);

  if (action === "simulate_publication_time") {
    const time = Date.parse(body.published_at);
    if (!Number.isFinite(time) || time <= Date.now()) throw new Error("Chọn giờ đăng trong tương lai.");
    state.publishedAt = new Date(time).toISOString();
    state.review = {};
    state.plan = null;
    if (state.schedule?.status === "scheduled") state.schedule = { ...state.schedule, status: "invalidated" };
  }

  const post = {
    ...source,
    email_notification_previewed_at: null,
    email_notification_preview_hash: null,
    email_notification_tested_at: null,
    email_notification_test_hash: null,
    ...state.review,
    ...(state.publishedAt ? {
      published_at: state.publishedAt,
      status: "published",
      email_delivery_mode: "review_after_publish",
      email_notification_status: "awaiting_review",
    } : {}),
  };
  const hash = JSON.stringify([source.updated_at, post.status, post.published_at]);
  const response = () => ({ post, schedule: state.schedule || null, server_now: now });
  if (["workflow_status", "simulate_publication_time"].includes(action)) return response();

  if (action === "simulate_due") {
    if (state.schedule?.status !== "scheduled") throw new Error("Hãy xác nhận lịch trước.");
    const { bcc } = await recipientSnapshot(undefined, { allowEmpty: true });
    const eligible = state.schedule.bcc_addresses.filter((address) => bcc.includes(address));
    state.schedule = {
      ...state.schedule,
      status: eligible.length ? "sent" : "failed",
      ...(eligible.length ? {} : { error_message: "Không còn người nhận đủ điều kiện." }),
    };
    return response();
  }

  if (action === "cancel_schedule") {
    if (state.schedule?.id !== body.schedule_id || state.schedule?.status !== "scheduled") {
      throw new Error("Lịch này không còn chờ gửi.");
    }
    state.schedule = { ...state.schedule, status: "cancelled" };
    return response();
  }

  if (["preview", "preview_single", "preview_selected"].includes(action)) {
    const single = action === "preview_single";
    const snapshot = await recipientSnapshot(single ? [body.audience_id] : body.audience_ids, { allowEmpty: action === "preview" });
    const mail = buildInsightEmail(post, "https://facs.vn");
    if (action === "preview") {
      state.review = { ...state.review, email_notification_previewed_at: now, email_notification_preview_hash: hash };
      Object.assign(post, state.review);
    }
    return {
      ...response(), post_id: post.id, preview_hash: hash, subject: mail.subject, body_html: mail.html,
      recipients: recipients(snapshot.bcc, single ? [] : cc),
      ...(single ? { contact: snapshot.contacts[0] } : { contacts: snapshot.contacts }),
    };
  }

  if (action === "test") {
    if (post.email_notification_preview_hash !== hash) throw new Error("Hãy xem trước lại nội dung.");
    state.review = { ...state.review, email_notification_tested_at: now, email_notification_test_hash: hash };
    Object.assign(post, state.review);
    return response();
  }

  const review = emailReviewState(post, { post_id: post.id, preview_hash: hash }, Date.parse(now));
  if (action === "prepare_schedule" || action === "confirm_schedule") {
    if (review.isPublic || post.status !== "published" || !post.published_at || post.email_delivery_mode === "disabled"
      || !review.testReady || state.schedule?.status === "scheduled") {
      throw new Error("Hãy chọn bài hẹn đăng, xem trước và gửi thử rồi xác nhận lịch.");
    }
    const snapshot = await recipientSnapshot(body.audience_ids);
    if (action === "prepare_schedule") {
      state.plan = { ...response(), ...snapshot, scheduled_at: post.published_at, preview_hash: hash, request_id: crypto.randomUUID() };
      return state.plan;
    }
    if (body.confirmation_text !== "SCHEDULE-AUDIENCE" || body.request_id !== state.plan?.request_id
      || body.preview_hash !== hash || body.scheduled_at !== post.published_at
      || JSON.stringify(snapshot.bcc) !== JSON.stringify(body.expected_bcc)) {
      throw new Error("Giờ đăng, nội dung hoặc danh sách Bcc đã thay đổi. Hãy xác nhận lại.");
    }
    state.schedule = { id: body.request_id, status: "scheduled", scheduled_at: post.published_at, bcc_addresses: snapshot.bcc };
    state.plan = null;
    return response();
  }

  if (["confirm_send", "confirm_single", "confirm_selected"].includes(action)) {
    const single = action === "confirm_single";
    if (!review.isPublic || (!single && !review.testReady)) throw new Error("Bài chưa đủ điều kiện gửi.");
    const { bcc } = await recipientSnapshot(single ? [body.audience_id] : body.audience_ids);
    return { ...response(), recipients: recipients(bcc, single ? [] : cc) };
  }

  throw new Error("Thao tác này không có trong preview.");
}
