type CareerApplication = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position?: string | null;
  message?: string | null;
  submitted_at: string;
};

type ContactInquiry = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company_name?: string | null;
  service_interest?: string | null;
  message: string;
  submitted_at: string;
};

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shell(content: string, siteUrl: string) {
  const baseUrl = siteUrl.replace(/\/$/, "");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef1f4;color:#243044;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef1f4;">
    <tr><td align="center" style="padding:34px 14px 44px;">
      <img src="${baseUrl}/facs-email-signature-banner.png" alt="FACS" width="190" style="display:block;width:190px;max-width:48%;height:auto;margin:0 auto 22px;border:0;">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background:#ffffff;border:1px solid #d8dee6;border-top:4px solid #22d3ee;">
        <tr><td style="padding:34px 38px;font-size:14px;line-height:1.72;text-align:left;">${content}</td></tr>
      </table>
      <div style="padding-top:18px;font-size:11px;line-height:1.5;color:#8a95a5;">Email này được gửi tự động từ website FACS. Bạn có thể phản hồi trực tiếp email này.<br>This automated email was sent from the FACS website. You may reply directly to this email.</div>
    </td></tr>
  </table>
</body></html>`;
}

function signature(email: string, signoff: string, department: string) {
  return `<p style="margin:20px 0 0;">${signoff}</p>
  <p style="margin:15px 0 0;font-weight:700;color:#0f315a;">${department}</p>
  <p style="margin:14px 0 0;font-weight:700;">FACS (VIETNAM) ENTERPRISES CONSULTING &amp; TRAINING SERVICES COMPANY LIMITED</p>
  <p style="margin:7px 0 0;">Email: <a href="mailto:${email}" style="color:#067a98;">${email}</a><br>Website: <a href="https://facs.vn" style="color:#067a98;">www.facs.vn</a><br>Hotline: (+84) 972 798 424</p>`;
}

export function buildCareerInternalEmail(application: CareerApplication, adminUrl: string) {
  const position = application.position || "Ứng tuyển chung";
  const shortId = application.id.slice(0, 8).toUpperCase();
  const rows = [
    ["Mã hồ sơ", shortId],
    ["Họ và tên", application.full_name],
    ["Email", application.email],
    ["Điện thoại", application.phone],
    ["Vị trí", position],
    ["Thời gian gửi", formatTime(application.submitted_at)],
  ];
  const html = shell(`<p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#0f315a;">FACS vừa nhận được một hồ sơ ứng tuyển mới.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${rows.map(([label, value]) => `<tr><td style="width:135px;padding:8px 10px;border-bottom:1px solid #edf0f4;color:#687386;">${escapeHtml(label)}</td><td style="padding:8px 10px;border-bottom:1px solid #edf0f4;font-weight:600;">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <p style="margin:20px 0 6px;font-weight:700;color:#0f315a;">Lời nhắn</p>
    <p style="margin:0;white-space:pre-line;">${escapeHtml(application.message || "Không có lời nhắn.")}</p>
    <p style="margin:22px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#0f315a;color:#fff;text-decoration:none;padding:11px 17px;font-weight:700;">Mở hồ sơ trong Admin</a></p>`, "https://facs.vn");
  const plainText = `FACS vừa nhận được một hồ sơ ứng tuyển mới.\n\nMã hồ sơ: ${shortId}\nHọ và tên: ${application.full_name}\nEmail: ${application.email}\nĐiện thoại: ${application.phone}\nVị trí: ${position}\nThời gian gửi: ${formatTime(application.submitted_at)}\n\nLời nhắn:\n${application.message || "Không có lời nhắn."}\n\nAdmin: ${adminUrl}`;
  return { subject: `[FACS Careers] Hồ sơ mới – ${position} – ${application.full_name}`, html, plainText };
}

export function buildCareerReceipt(application: CareerApplication, siteUrl: string) {
  const position = application.position || "Ứng tuyển chung";
  const html = shell(`<p style="margin:0 0 18px;font-weight:700;color:#0f315a;">Xin chào Anh/Chị ${escapeHtml(application.full_name)},</p>
    <p>FACS chân thành cảm ơn Anh/Chị đã quan tâm và gửi hồ sơ ứng tuyển cho vị trí <strong>${escapeHtml(position)}</strong>.</p>
    <p>Qua email này, FACS xác nhận đã nhận được thông tin và hồ sơ ứng tuyển của Anh/Chị.</p>
    <p>FACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất.</p>
    <p>Nếu cần cung cấp thêm thông tin, Anh/Chị có thể phản hồi trực tiếp email này hoặc liên hệ với chúng tôi qua địa chỉ <a href="mailto:hr@facs.vn" style="color:#067a98;">hr@facs.vn</a>.</p>
    ${signature("hr@facs.vn", "Trân trọng,", "BỘ PHẬN NHÂN SỰ")}
    <div style="margin:30px 0;text-align:center;color:#a3acb9;letter-spacing:1px;">-------------------</div>
    <p style="margin:0 0 18px;font-weight:700;color:#0f315a;">Dear ${escapeHtml(application.full_name)},</p>
    <p>Thank you for your interest in FACS and for submitting your application for the position of <strong>${escapeHtml(position)}</strong>.</p>
    <p>This email confirms that FACS has successfully received your information and application documents.</p>
    <p>FACS will get back to you as soon as possible.</p>
    <p>If you would like to provide any additional information, please reply directly to this email or contact us at <a href="mailto:hr@facs.vn" style="color:#067a98;">hr@facs.vn</a>.</p>
    ${signature("hr@facs.vn", "Sincerely,", "HUMAN RESOURCES DEPARTMENT")}`, siteUrl);
  const plainText = `Xin chào Anh/Chị ${application.full_name},\n\nFACS chân thành cảm ơn Anh/Chị đã quan tâm và gửi hồ sơ ứng tuyển cho vị trí ${position}.\n\nQua email này, FACS xác nhận đã nhận được thông tin và hồ sơ ứng tuyển của Anh/Chị.\n\nFACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất.\n\nNếu cần cung cấp thêm thông tin, Anh/Chị có thể phản hồi trực tiếp email này hoặc liên hệ hr@facs.vn.\n\nTrân trọng,\nBỘ PHẬN NHÂN SỰ – FACS\n\n-------------------\n\nDear ${application.full_name},\n\nThank you for your interest in FACS and for submitting your application for the position of ${position}.\n\nThis email confirms that FACS has successfully received your information and application documents.\n\nFACS will get back to you as soon as possible.\n\nIf you would like to provide additional information, please reply to this email or contact hr@facs.vn.\n\nSincerely,\nHUMAN RESOURCES DEPARTMENT – FACS`;
  return { subject: "FACS đã nhận được hồ sơ của bạn | We have received your application", html, plainText };
}

export function buildContactInternalEmail(inquiry: ContactInquiry, adminUrl: string) {
  const shortId = inquiry.id.slice(0, 8).toUpperCase();
  const rows = [
    ["Mã yêu cầu", shortId],
    ["Họ và tên", inquiry.full_name],
    ["Công ty", inquiry.company_name || "—"],
    ["Email", inquiry.email],
    ["Điện thoại", inquiry.phone || "—"],
    ["Dịch vụ quan tâm", inquiry.service_interest || "—"],
    ["Thời gian gửi", formatTime(inquiry.submitted_at)],
  ];
  const html = shell(`<p style="margin:0 0 18px;font-size:17px;font-weight:700;color:#0f315a;">FACS vừa nhận được một yêu cầu liên hệ mới.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${rows.map(([label, value]) => `<tr><td style="width:135px;padding:8px 10px;border-bottom:1px solid #edf0f4;color:#687386;">${escapeHtml(label)}</td><td style="padding:8px 10px;border-bottom:1px solid #edf0f4;font-weight:600;">${escapeHtml(value)}</td></tr>`).join("")}
    </table>
    <p style="margin:20px 0 6px;font-weight:700;color:#0f315a;">Nội dung</p>
    <p style="margin:0;white-space:pre-line;">${escapeHtml(inquiry.message)}</p>
    <p style="margin:22px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:#0f315a;color:#fff;text-decoration:none;padding:11px 17px;font-weight:700;">Mở yêu cầu trong Admin</a></p>`, "https://facs.vn");
  const plainText = `FACS vừa nhận được một yêu cầu liên hệ mới.\n\nMã yêu cầu: ${shortId}\nHọ và tên: ${inquiry.full_name}\nCông ty: ${inquiry.company_name || "—"}\nEmail: ${inquiry.email}\nĐiện thoại: ${inquiry.phone || "—"}\nDịch vụ quan tâm: ${inquiry.service_interest || "—"}\nThời gian gửi: ${formatTime(inquiry.submitted_at)}\n\nNội dung:\n${inquiry.message}\n\nAdmin: ${adminUrl}`;
  return { subject: `[FACS Contact] Yêu cầu mới – ${inquiry.company_name || inquiry.full_name}`, html, plainText };
}

export function buildContactReceipt(inquiry: ContactInquiry, siteUrl: string) {
  const html = shell(`<p style="margin:0 0 18px;font-weight:700;color:#0f315a;">Xin chào Anh/Chị ${escapeHtml(inquiry.full_name)},</p>
    <p>FACS chân thành cảm ơn Anh/Chị đã quan tâm và liên hệ với chúng tôi.</p>
    <p>Qua email này, FACS xác nhận đã nhận được thông tin và nội dung yêu cầu của Anh/Chị.</p>
    <p>FACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất.</p>
    <p>Nếu cần bổ sung hoặc điều chỉnh thông tin, Anh/Chị có thể phản hồi trực tiếp email này hoặc liên hệ với chúng tôi qua địa chỉ <a href="mailto:contact@facs.vn" style="color:#067a98;">contact@facs.vn</a>.</p>
    ${signature("contact@facs.vn", "Trân trọng,", "BỘ PHẬN TƯ VẤN VÀ CHĂM SÓC KHÁCH HÀNG")}
    <div style="margin:30px 0;text-align:center;color:#a3acb9;letter-spacing:1px;">-------------------</div>
    <p style="margin:0 0 18px;font-weight:700;color:#0f315a;">Dear ${escapeHtml(inquiry.full_name)},</p>
    <p>Thank you for your interest in FACS and for contacting us.</p>
    <p>This email confirms that FACS has successfully received your information and inquiry.</p>
    <p>FACS will get back to you as soon as possible.</p>
    <p>If you would like to provide or amend any information, please reply directly to this email or contact us at <a href="mailto:contact@facs.vn" style="color:#067a98;">contact@facs.vn</a>.</p>
    ${signature("contact@facs.vn", "Sincerely,", "CLIENT ADVISORY AND RELATIONS DEPARTMENT")}`, siteUrl);
  const plainText = `Xin chào Anh/Chị ${inquiry.full_name},\n\nFACS chân thành cảm ơn Anh/Chị đã quan tâm và liên hệ với chúng tôi.\n\nQua email này, FACS xác nhận đã nhận được thông tin và nội dung yêu cầu của Anh/Chị.\n\nFACS sẽ sớm liên hệ lại với bạn trong thời gian gần nhất.\n\nNếu cần bổ sung hoặc điều chỉnh thông tin, Anh/Chị có thể phản hồi trực tiếp email này hoặc liên hệ contact@facs.vn.\n\nTrân trọng,\nBỘ PHẬN TƯ VẤN VÀ CHĂM SÓC KHÁCH HÀNG – FACS\n\n-------------------\n\nDear ${inquiry.full_name},\n\nThank you for your interest in FACS and for contacting us.\n\nThis email confirms that FACS has successfully received your information and inquiry.\n\nFACS will get back to you as soon as possible.\n\nIf you would like to provide or amend any information, please reply to this email or contact contact@facs.vn.\n\nSincerely,\nCLIENT ADVISORY AND RELATIONS DEPARTMENT – FACS`;
  return { subject: "FACS đã nhận được yêu cầu của bạn | We have received your inquiry", html, plainText };
}
