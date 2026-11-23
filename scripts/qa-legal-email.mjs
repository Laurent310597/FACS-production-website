// Kiểm thử mẫu email lịch pháp lý theo tháng:  npm run qa:legal-email
import assert from "node:assert/strict";
import test from "node:test";
import { buildLegalCalendarEmail, legalEmailContentHash, monthLabels, parseMonth, sortLegalEvents } from "../supabase/functions/_shared/legal-calendar-email.ts";

const base = { id: "a", event_date: "2026-12-21", category: "tax", title_vi: "Khai thuế tháng 11", title_en: "Monthly tax filing", summary_vi: "Nộp hồ sơ", summary_en: "File returns", legal_basis_vi: "Điều 44", legal_basis_en: "Article 44", official_source_url: "https://example.gov.vn/x" };

test("tháng: chấp nhận YYYY-MM, tính ngày cuối tháng (kể cả năm nhuận), từ chối sai định dạng", () => {
  assert.deepEqual(parseMonth("2026-12"), { key: "2026-12", year: 2026, month: 12, first: "2026-12-01", last: "2026-12-31" });
  assert.equal(parseMonth("2028-02").last, "2028-02-29");
  assert.equal(parseMonth("2026-02").last, "2026-02-28");
  for (const bad of ["2026-13", "2026-1", "12/2026", "", null, "2026-12; drop"]) assert.throws(() => parseMonth(bad));
  assert.deepEqual(monthLabels("2026-12"), { vi: "tháng 12/2026", en: "December 2026" });
});

test("sắp xếp theo ngày rồi lĩnh vực rồi tiêu đề", () => {
  const sorted = sortLegalEvents([
    { ...base, id: "3", event_date: "2026-12-30" },
    { ...base, id: "2", event_date: "2026-12-04", category: "tax" },
    { ...base, id: "1", event_date: "2026-12-04", category: "labor" },
  ]);
  assert.deepEqual(sorted.map((e) => e.id), ["1", "2", "3"]);
});

test("email song ngữ: tiêu đề, số mốc, ngày, liên kết lịch, chữ ký, không gửi khi không có mốc", () => {
  const email = buildLegalCalendarEmail("2026-12", [base, { ...base, id: "b", event_date: "2026-12-04", category: "labor", title_vi: "Báo cáo lao động", title_en: "Labour report" }], "https://facs.vn/");
  assert.equal(email.subject, "[FACS Legal Calendar] - Các mốc thời hạn pháp lý tháng 12/2026 | Compliance deadlines for December 2026");
  assert.equal(email.eventCount, 2);
  assert.match(email.html, /2 mốc thời hạn pháp lý/);
  assert.match(email.html, /2 compliance deadlines/);
  assert.match(email.html, /https:\/\/facs\.vn\/legal-calendar/);
  assert.match(email.html, />04<\/td>[\s\S]*?Thứ Sáu</); // 04/12/2026 là thứ Sáu
  assert.match(email.html, />21<\/td>[\s\S]*?>Mon</);
  assert.ok(email.html.indexOf("Báo cáo lao động") < email.html.indexOf("Khai thuế tháng 11"));
  assert.match(email.html, /PHÒNG THÔNG TIN &amp; TRUYỀN THÔNG/);
  assert.doesNotMatch(email.html, /INTERNAL TEST/);
  assert.match(buildLegalCalendarEmail("2026-12", [base], "https://facs.vn", true).subject, /^\[TEST\] /);
  assert.match(buildLegalCalendarEmail("2026-12", [base], "https://facs.vn").html, /1 compliance deadline</);
  assert.throws(() => buildLegalCalendarEmail("2026-12", [], "https://facs.vn"));
});

test("chống chèn mã: escape nội dung, bỏ liên kết không phải https", () => {
  const email = buildLegalCalendarEmail("2026-12", [{ ...base, title_vi: '<script>alert(1)</script>"', official_source_url: "javascript:alert(1)" }], "https://facs.vn");
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.doesNotMatch(email.html, /javascript:/);
});

test("mã băm nội dung: ổn định theo thứ tự, đổi khi đổi chữ/tháng", async () => {
  const b = { ...base, id: "b", event_date: "2026-12-04" };
  const h1 = await legalEmailContentHash("2026-12", [base, b], "https://facs.vn");
  assert.equal(h1, await legalEmailContentHash("2026-12", [b, base], "https://facs.vn"));
  assert.notEqual(h1, await legalEmailContentHash("2026-12", [{ ...base, summary_vi: "Khác" }, b], "https://facs.vn"));
  assert.notEqual(h1, await legalEmailContentHash("2027-01", [base, b], "https://facs.vn"));
});
