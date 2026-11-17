// Kiểm thử logic thuần của FACS Hub phần 3 (mạng xã hội):  npm run qa:hub-social
import assert from "node:assert/strict";
import test from "node:test";
import {
  checkCaption, checkScheduledAt, escapeLinkedInText, friendlyError, graphBase, instagramRatioOk, isJpegPath,
  linkedinAuthorizeUrl, linkedinVersion, makeState, metaAuthorizeUrl, platformFromState, safeEqual, sha256Hex, validateSocialImagePath,
} from "../supabase/functions/_shared/hub-social.ts";

const ID = "123e4567-e89b-42d3-a456-426614174000";

test("đường dẫn ảnh chỉ nhận social/<uuid>/<tên>.png|jpg", () => {
  assert.equal(validateSocialImagePath(`social/${ID}/a-b_1.jpg`), `social/${ID}/a-b_1.jpg`);
  for (const bad of [`inputs/${ID}/a.png`, `social/${ID}/../x.png`, `social/x/a.png`, `social/${ID}/a.gif`, `social/${ID}/a/b.png`, "", null, 5])
    assert.throws(() => validateSocialImagePath(bad), undefined, String(bad));
  assert.ok(isJpegPath("x/y.JPEG") && !isJpegPath("x/y.png"));
});

test("kiểm tra nội dung: trống, quá dài, Instagram cần ảnh và ≤30 hashtag", () => {
  assert.equal(checkCaption("facebook", "   ", false).ok, false);
  assert.equal(checkCaption("linkedin", "a".repeat(3001), false).ok, false);
  assert.equal(checkCaption("linkedin", "a".repeat(3000), false).ok, true);
  assert.equal(checkCaption("instagram", "xin chào", false).ok, false);
  assert.equal(checkCaption("instagram", "xin chào", true).ok, true);
  assert.equal(checkCaption("instagram", Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" "), true).ok, false);
  const ok = checkCaption("facebook", " a\r\nb ", false);
  assert.ok(ok.ok && ok.caption === "a\nb");
});

test("giờ hẹn: phải ở tương lai ≥1 phút và ≤1 năm", () => {
  const now = new Date("2026-11-17T00:00:00Z");
  assert.equal(checkScheduledAt("2026-11-17T00:00:30Z", now).ok, false);
  assert.equal(checkScheduledAt("2026-11-17T00:05:00Z", now).ok, true);
  assert.equal(checkScheduledAt("2028-01-01T00:00:00Z", now).ok, false);
  assert.equal(checkScheduledAt("khong-phai-gio", now).ok, false);
  assert.equal(checkScheduledAt(undefined, now).ok, false);
});

test("LinkedIn: escape ký tự đặc biệt, giữ #hashtag", () => {
  assert.equal(escapeLinkedInText("Hạn nộp (31/01) *quan trọng* #nhansu #HR_2026 a|b"), "Hạn nộp \\(31/01\\) \\*quan trọng\\* #nhansu #HR\\_2026 a\\|b");
  assert.equal(escapeLinkedInText("A # B"), "A \\# B");
  assert.equal(escapeLinkedInText("x\\y {z} [w] <v> ~u @t"), "x\\\\y \\{z\\} \\[w\\] \\<v\\> \\~u \\@t");
});

test("URL xác thực và phiên bản API có giá trị mặc định an toàn", () => {
  assert.equal(graphBase(undefined), "https://graph.facebook.com/v25.0");
  assert.equal(graphBase("v26.0"), "https://graph.facebook.com/v26.0");
  assert.equal(graphBase("../evil"), "https://graph.facebook.com/v25.0");
  assert.equal(linkedinVersion("202701"), "202701");
  assert.equal(linkedinVersion("abc"), "202608");
  const meta = new URL(metaAuthorizeUrl({ appId: "1", redirectUri: "https://x.supabase.co/functions/v1/hub-social-callback", state: "facebook.abc" }));
  assert.equal(meta.searchParams.get("state"), "facebook.abc");
  assert.ok(meta.searchParams.get("scope").includes("instagram_content_publish"));
  const li = new URL(linkedinAuthorizeUrl({ clientId: "c", redirectUri: "https://x/cb", state: "linkedin.abc" }));
  assert.equal(li.searchParams.get("scope"), "openid profile w_member_social");
});

test("state: sinh ngẫu nhiên, nhận biết nền tảng, băm ổn định", async () => {
  const a = makeState("facebook"), b = makeState("facebook");
  assert.notEqual(a, b);
  assert.equal(platformFromState(a), "facebook");
  assert.equal(platformFromState(makeState("linkedin")), "linkedin");
  assert.equal(platformFromState("twitter.abc"), null);
  assert.equal((await sha256Hex("abc")).length, 64);
});

test("so sánh secret và tỉ lệ ảnh Instagram", () => {
  assert.ok(safeEqual("abc", "abc") && !safeEqual("abc", "abd") && !safeEqual("", "") && !safeEqual("a", "ab"));
  assert.ok(instagramRatioOk(1080, 1350) && instagramRatioOk(1080, 1080) && instagramRatioOk(1910, 1000));
  assert.ok(!instagramRatioOk(1000, 2000) && !instagramRatioOk(3000, 1000) && !instagramRatioOk(0, 10));
});

test("thông báo lỗi dễ hiểu và không lộ token", () => {
  assert.match(friendlyError("facebook", 400, { error: { code: 190, message: "x" } }), /hết hạn/);
  assert.match(friendlyError("linkedin", 426, ""), /phiên bản/);
  assert.match(friendlyError("linkedin", 403, ""), /w_member_social/);
  const leaked = friendlyError("facebook", 500, "access_token=EAAB1234567890abcdefXYZ boom");
  assert.ok(!leaked.includes("EAAB1234567890abcdefXYZ"));
});
