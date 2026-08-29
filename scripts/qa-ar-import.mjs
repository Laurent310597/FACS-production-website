import assert from "node:assert/strict";
import { normalizeCustomerRows, normalizeInvoiceRows } from "../src/lib/arImport.js";

const invoiceMatrix = [
  ["BÁO CÁO HÓA ĐƠN VIETTEL"],
  ["Ký hiệu hóa đơn", "Số hóa đơn", "Ngày hóa đơn", "Tên khách hàng", "Mã số thuế", "Tiền trước thuế", "Tiền thuế GTGT", "Tổng thanh toán", "Trạng thái hóa đơn"],
  ["C26TFA", "000001", "29/08/2026", "Công ty A", "0312345678", "10.000.000", "1.000.000", "11.000.000", "Đã phát hành"],
  ["C26TFA", "000002", "2026-08-29", "Công ty B", "0312345679", -2_000_000, 0, -2_000_000, "Điều chỉnh"],
];

const invoices = normalizeInvoiceRows(invoiceMatrix);
assert.deepEqual(invoices.errors, []);
assert.equal(invoices.headerRow, 2);
assert.equal(invoices.rows.length, 2);
assert.equal(invoices.rows[0].total_amount, 11_000_000);
assert.equal(invoices.rows[1].total_amount, -2_000_000);
assert.equal(invoices.rows[1].source_status, "adjusted");

const duplicateInvoices = normalizeInvoiceRows([...invoiceMatrix, invoiceMatrix[2]]);
assert.ok(duplicateInvoices.errors.some((message) => message.includes("trùng số hóa đơn")));

const customerMatrix = [
  ["Tên khách hàng", "MST", "Email kế toán", "Email CC", "Số ngày thanh toán", "Ngôn ngữ", "Đang hoạt động"],
  ["Công ty A", "0312345678", "accounting@example.com", "finance@example.com; ceo@example.com", 30, "Song ngữ", "Có"],
];

const customers = normalizeCustomerRows(customerMatrix);
assert.deepEqual(customers.errors, []);
assert.equal(customers.rows.length, 1);
assert.deepEqual(customers.rows[0].cc_emails, ["finance@example.com", "ceo@example.com"]);
assert.equal(customers.rows[0].preferred_language, "bilingual");
assert.equal(customers.rows[0].is_active, true);

const invalidCustomers = normalizeCustomerRows([
  customerMatrix[0],
  ["Công ty lỗi", "", "not-an-email", "", 500, "", ""],
]);
assert.equal(invalidCustomers.errors.length, 2);

console.log("AR import parser QA passed.");
