import type { MailAddress } from "./microsoft-graph.ts";

export type InsightDeliveryClaim = {
  duplicate?: boolean;
  post: Record<string, any>;
  log_id: string;
  status: string;
  request_id: string;
  audience_id: string | null;
  bcc: string[];
  cc: string[];
};

type DeliveryDependencies = {
  send: (recipients: { bcc: MailAddress[]; cc: MailAddress[]; dedupeKey: string }) => Promise<{ message_id?: string; thread_id?: string }>;
  finalize: (result: { message_id?: string; thread_id?: string }) => Promise<void>;
  fail: (message: string) => Promise<void>;
};

// SQL claims snapshot the exact recipients and serialize sends for an article.
// A retry of the same request must never call the mail provider again.
export async function deliverInsightClaim(claim: InsightDeliveryClaim, deps: DeliveryDependencies) {
  if (claim.duplicate) {
    if (claim.status !== "sent") throw new Error("Lượt gửi này đã được ghi nhận. Hãy kiểm tra nhật ký trước khi tạo lượt gửi mới.");
    return { status: "sent", bcc_count: claim.bcc.length, already_processed: true };
  }
  if (!claim.bcc.length || (claim.audience_id && claim.bcc.length !== 1)) {
    throw new Error("Danh sách người nhận không khớp với phạm vi gửi đã xác nhận.");
  }
  let accepted = false;
  try {
    const result = await deps.send({
      bcc: claim.bcc.map((email) => ({ mail_address: email })),
      cc: claim.cc.map((email) => ({ mail_address: email })),
      dedupeKey: `facs-insight-${claim.request_id}`,
    });
    accepted = true;
    await deps.finalize(result);
    return { status: "sent", bcc_count: claim.bcc.length, already_processed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (accepted) {
      // Keep the claim processing if Graph accepted a send but finalization failed.
      throw new Error(`${message}. Microsoft 365 đã nhận email; cần đối chiếu Sent Items trước khi gửi lại.`);
    }
    await deps.fail(message);
    throw error;
  }
}
