const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function dateVi(value) {
  const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "—");
}

function dateEn(value) {
  const match = String(value || "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || "—");
}

function applyTokens(template, tokens) {
  return String(template || "").replace(/{{\s*([a-z_]+)\s*}}/gi, (full, key) => (
    Object.hasOwn(tokens, key.toLowerCase()) ? String(tokens[key.toLowerCase()]) : full
  ));
}

function paragraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((part) => `<p style="margin:0 0 16px">${escapeHtml(part).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function invoiceRows(invoices, language) {
  return invoices.map((invoice) => `
    <tr>
      <td style="border-bottom:1px solid #dbe4ee;padding:10px 8px">${escapeHtml([invoice.invoice_series, invoice.invoice_number].filter(Boolean).join(" · "))}</td>
      <td style="border-bottom:1px solid #dbe4ee;padding:10px 8px;white-space:nowrap">${escapeHtml(language === "en" ? dateEn(invoice.invoice_date) : dateVi(invoice.invoice_date))}</td>
      <td style="border-bottom:1px solid #dbe4ee;padding:10px 8px;white-space:nowrap">${escapeHtml(language === "en" ? dateEn(invoice.due_date) : dateVi(invoice.due_date))}</td>
      <td style="border-bottom:1px solid #dbe4ee;padding:10px 8px;text-align:right;white-space:nowrap">${escapeHtml(VND.format(Number(invoice.outstanding_amount || 0)))}</td>
    </tr>`).join("");
}

function invoiceTable(invoices, language) {
  const labels = language === "en"
    ? ["Invoice", "Invoice date", "Due date", "Outstanding"]
    : ["Hóa đơn", "Ngày hóa đơn", "Hạn thanh toán", "Số dư"];
  return `
    <div style="overflow-x:auto;margin:22px 0">
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#0d1726;color:#fff">
          ${labels.map((label, index) => `<th style="padding:10px 8px;text-align:${index === 3 ? "right" : "left"}">${label}</th>`).join("")}
        </tr></thead>
        <tbody>${invoiceRows(invoices, language)}</tbody>
      </table>
    </div>`;
}

export function renderArReminder({ source, template, statementDate, test = false }) {
  const customer = source?.customer || {};
  const invoices = Array.isArray(source?.invoices) ? source.invoices : [];
  if (!customer.id || !customer.legal_name) throw new Error("Customer snapshot is incomplete.");
  if (!invoices.length) throw new Error("Customer has no outstanding invoices.");

  const total = invoices.reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0);
  const tokens = {
    customer_name: customer.legal_name,
    contact_name: customer.contact_name || customer.legal_name,
    tax_code: customer.tax_code || "—",
    statement_date: dateVi(statementDate),
    total_outstanding: VND.format(total),
    invoice_count: invoices.length,
  };
  const subject = `${test ? "[TEST] " : ""}${applyTokens(template.subject_template, tokens)}`.trim();
  const language = ["vi", "en", "bilingual"].includes(customer.preferred_language)
    ? customer.preferred_language
    : "bilingual";
  const vi = language !== "en" ? `
    <section lang="vi">
      ${paragraphs(applyTokens(template.body_vi_template, tokens))}
      ${invoiceTable(invoices, "vi")}
      <p style="margin:16px 0 0"><strong>Tổng số dư phải thu: ${escapeHtml(VND.format(total))}</strong></p>
    </section>` : "";
  const en = language !== "vi" ? `
    <section lang="en" style="${language === "bilingual" ? "border-top:1px solid #dbe4ee;margin-top:28px;padding-top:24px" : ""}">
      ${paragraphs(applyTokens(template.body_en_template, tokens))}
      ${invoiceTable(invoices, "en")}
      <p style="margin:16px 0 0"><strong>Total outstanding balance: ${escapeHtml(VND.format(total))}</strong></p>
    </section>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#eef3f8;font-family:Arial,sans-serif;color:#172033">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(subject)}</div>
    <div style="max-width:760px;margin:0 auto;padding:28px 14px">
      <div style="background:#0d1726;color:#fff;padding:22px 28px;font-size:24px;font-weight:700">FACS<span style="color:#67e8f9">.</span> Accounts Receivable</div>
      <div style="background:#fff;padding:28px;line-height:1.65">
        ${test ? '<div style="margin-bottom:18px;border:1px solid #f59e0b;background:#fffbeb;color:#92400e;padding:10px 12px;font-weight:700">INTERNAL TEST — NOT SENT TO CUSTOMER</div>' : ""}
        ${vi}${en}
        <p style="border-top:1px solid #dbe4ee;margin:28px 0 0;padding-top:20px;color:#526173">Trân trọng / Kind regards,<br><strong>FACS Accounting</strong><br>accounting@facs.vn</p>
      </div>
    </div>
  </body></html>`;

  return {
    subject,
    html,
    total_outstanding: total,
    invoice_count: invoices.length,
    language,
  };
}

export function normalizeRecipients(values, excluded = []) {
  const blocked = new Set(excluded.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
  return [...new Set((values || []).map((item) => String(item || "").trim().toLowerCase()).filter((item) => item && !blocked.has(item)))];
}

