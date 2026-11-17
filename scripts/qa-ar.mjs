// Kiểm thử logic thuần của email nhắc công nợ (CMS > AR):  npm run qa:ar
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_AR_SETTINGS,
  SAMPLE_REMINDER,
  bankMissing,
  buildArReminderEmail,
  cleanReminder,
  cleanSettings,
  formatAmount,
  splitEmails,
  toAmount,
} from "../supabase/functions/_shared/ar-reminder.ts";

const bank = { ...DEFAULT_AR_SETTINGS, bank_name: "Vietcombank", account_number: "0071000123456", account_holder: "CONG TY TNHH FACS" };

test("tách nhiều email, bỏ trùng, chữ thường", () => {
  assert.deepEqual(splitEmails("A@x.vn; b@y.vn, a@x.vn  c@z.vn"), ["a@x.vn", "b@y.vn", "c@z.vn"]);
  assert.deepEqual(splitEmails(""), []);
});

test("đọc số tiền: số Excel, chuỗi có dấu chấm/phẩy", () => {
  assert.equal(toAmount(15000000), 15000000);
  assert.equal(toAmount("15.000.000"), 15000000);
  assert.equal(toAmount("15,000,000 VND"), 15000000);
  assert.ok(Number.isNaN(toAmount("abc")));
});

test("kiểm tra dòng nhắc nợ", () => {
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER }).ok, true);
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER, recipient_emails: "khong-phai-email" }).ok, false);
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER, cc_emails: "a@b.vn; sai" }).ok, false);
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER, amount: 0 }).ok, false);
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER, period: " " }).ok, false);
  assert.equal(cleanReminder({ ...SAMPLE_REMINDER, company_name: "" }).ok, false);
  const r = cleanReminder({ ...SAMPLE_REMINDER, recipient_emails: "x@a.vn;y@b.vn", amount: "2.500.000", tax_code: "" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.reminder.recipient_emails, ["x@a.vn", "y@b.vn"]);
  assert.equal(r.reminder.amount, 2500000);
  assert.equal(r.reminder.tax_code, null);
});

test("cài đặt: bắt buộc tiêu đề/nội dung, giới hạn độ dài; thiếu ngân hàng thì chặn gửi", () => {
  assert.equal(cleanSettings({ ...DEFAULT_AR_SETTINGS, subject: "" }).ok, false);
  assert.equal(cleanSettings({ ...DEFAULT_AR_SETTINGS, account_number: "1".repeat(61) }).ok, false);
  assert.ok(bankMissing(DEFAULT_AR_SETTINGS));
  assert.equal(bankMissing(bank), null);
});

test("email: song ngữ, đúng số tiền, có thông tin ngân hàng, chữ ký kế toán, chống chèn HTML", () => {
  const { subject, html } = buildArReminderEmail({ ...SAMPLE_REMINDER, company_name: "ABC <script>alert(1)</script>", note: "Phí T7 & T8" }, bank);
  assert.match(subject, /ABC <script>/); // tiêu đề là văn bản thuần
  assert.ok(!html.includes("<script>alert"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("15.000.000 VND"));
  // Bảng song ngữ, hiện một lần
  for (const label of ["Chi tiết công nợ", "Outstanding balance", "Thông tin chuyển khoản", "Bank transfer details", "Số tài khoản", "Account number", "Amount due"]) assert.ok(html.includes(label), label);
  assert.equal(html.split("Chi tiết công nợ").length - 1, 1);
  assert.ok(html.includes("Dear Nguyễn Văn A") && html.includes("Kính gửi Anh/Chị Nguyễn Văn A"));
  assert.ok(html.includes("Vietcombank") && html.includes("0071000123456"));
  assert.ok(html.includes("MST 0312345678 thanh toan cong no Quý 3/2026"));
  assert.ok(html.includes("PHÒNG KẾ TOÁN") && html.includes("ACCOUNTING DEPARTMENT") && html.includes("accounting@facs.vn"));
  assert.ok(html.includes("Phí T7 &amp; T8"));
  assert.ok(html.includes("facs-email-signature-banner.png"));
});

test("định dạng tiền", () => {
  assert.equal(formatAmount(1234567, "vi"), "1.234.567 VND");
  assert.equal(formatAmount(1234567, "en"), "VND 1,234,567");
});
