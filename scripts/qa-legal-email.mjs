// Kiểm thử mẫu email lịch pháp lý theo tháng:  npm run qa:legal-email
import assert from "node:assert/strict";
import test from "node:test";
import { buildLegalCalendarEmail, legalEmailContentHash, MAX_BCC, monthLabels, normalizeAudience, parseMonth, pickRecipients, receivedThisMonth, sortLegalEvents } from "../supabase/functions/_shared/legal-calendar-email.ts";

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
  assert.match(email.html, />04<\/td>[\s\S]*?Thứ Sáu<br>Fri</); // 04/12/2026 là thứ Sáu
  assert.match(email.html, />21<\/td>[\s\S]*?Thứ Hai<br>Mon</);
  // Bố cục: lời dẫn Việt → vạch ngăn → lời dẫn Anh → danh sách song ngữ (mỗi mốc có cả hai cột Việt | Anh)
  const order = ["Kính gửi Quý Khách hàng", "-------------------", "Dear Valued Clients", "Legal calendar —", "Báo cáo lao động", "Labour report"].map((needle) => email.html.indexOf(needle));
  assert.ok(order.every((index, i) => index > -1 && (i === 0 || index > order[i - 1])), order.join(","));
  assert.equal(email.html.split("-------------------").length, 2);
  assert.equal(email.html.split("FACS (VIETNAM) TEAM").length, 2); // một chữ ký song ngữ duy nhất
  // Mỗi mốc chỉ còn loại + tên nghĩa vụ (không nội dung, đối tượng, căn cứ, nguồn)
  for (const gone of ["Nộp hồ sơ", "File returns", "Điều 44", "Article 44", "Đối tượng", "Applies to", "example.gov.vn"]) assert.ok(!email.html.includes(gone), gone);
  assert.match(email.html, /Tiếng Việt[\s\S]*English/);
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
  assert.notEqual(h1, await legalEmailContentHash("2026-12", [{ ...base, title_vi: "Khác" }, b], "https://facs.vn"));
  // Nội dung/căn cứ không còn hiện trong email nên sửa chúng không bắt gửi thử lại
  assert.equal(h1, await legalEmailContentHash("2026-12", [{ ...base, summary_vi: "Khác", legal_basis_vi: "Khác" }, b], "https://facs.vn"));
  assert.notEqual(h1, await legalEmailContentHash("2027-01", [base, b], "https://facs.vn"));
});

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const rows = [
  { id: id(1), email: " New@Client.vn " },
  { id: id(2), email: "old@client.vn", company_name: "Old Co" },
  { id: id(3), email: "infor@facs.vn" },      // người gửi → loại
  { id: id(4), email: "tunguyen@facs.vn" },   // To → loại
  { id: id(5), email: "khong-hop-le" },        // sai định dạng → loại
  { id: id(6), email: "OLD@client.vn" },       // trùng → loại
];
const internal = ["infor@facs.vn", "tunguyen@facs.vn", "yendoan@facs.vn", "thanhhuynh@facs.vn"];

test("danh sách khách: chữ thường, bỏ nội bộ/sai/trùng, sắp xếp theo email", () => {
  const audience = normalizeAudience(rows, internal);
  assert.deepEqual(audience.map((c) => c.email), ["new@client.vn", "old@client.vn"]);
  assert.equal(audience[1].company, "Old Co");
});

test("chọn người nhận: tất cả, hoặc đúng các khách được tick; từ chối id lạ/không còn nhận/quá giới hạn", () => {
  const audience = normalizeAudience(rows, internal);
  assert.equal(pickRecipients(audience, "all").contacts.length, 2);
  assert.equal(pickRecipients(audience, undefined).scope, "all");
  const picked = pickRecipients(audience, "selected", [id(1), id(1)]);
  assert.equal(picked.scope, "selected");
  assert.deepEqual(picked.contacts.map((c) => c.email), ["new@client.vn"]);
  assert.throws(() => pickRecipients(audience, "selected", []), /ít nhất một/);
  assert.throws(() => pickRecipients(audience, "selected", ["abc"]), /không hợp lệ/);
  assert.throws(() => pickRecipients(audience, "selected", [id(3)]), /không còn trong danh sách/); // nội bộ đã bị loại
  assert.throws(() => pickRecipients(audience, "selected", Array.from({ length: MAX_BCC + 1 }, (_, i) => id(100 + i))), /tối đa/);
});

test("đã nhận tháng này: gộp từ các lượt gửi thành công/đang gửi, bỏ lượt lỗi", () => {
  const map = receivedThisMonth([
    { status: "sent", bcc_addresses: ["Old@client.vn"], completed_at: "2026-11-23T07:00:00Z", created_at: "2026-11-23T06:59:00Z" },
    { status: "failed", bcc_addresses: ["new@client.vn"], created_at: "2026-11-23T08:00:00Z" },
    { status: "processing", bcc_addresses: ["late@client.vn"], created_at: "2026-11-23T09:00:00Z" },
  ]);
  assert.deepEqual([...map.keys()].sort(), ["late@client.vn", "old@client.vn"]);
  assert.equal(map.get("old@client.vn").at, "2026-11-23T07:00:00Z");
  assert.equal(map.get("late@client.vn").status, "processing");
});
