export function emailReviewState(post, preview, nowMs) {
  const previewReady = Boolean(post?.id && preview?.post_id === post.id
    && preview.preview_hash && preview.preview_hash === post.email_notification_preview_hash);
  const testedAt = Date.parse(post?.email_notification_tested_at || "");
  const testReady = previewReady && Number.isFinite(testedAt)
    && testedAt <= nowMs && nowMs - testedAt <= 86400000
    && post.email_notification_test_hash === preview.preview_hash;
  const isPublic = post?.status === "published" && Boolean(post.published_at)
    && Date.parse(post.published_at) <= nowMs;
  return { previewReady, testReady, isPublic };
}

// Anchor workflow time to the server and a monotonic clock, not the PC clock.
export function workflowTime(anchor, monotonicNow) {
  return anchor.serverMs + Math.max(0, monotonicNow - anchor.monotonicMs);
}
