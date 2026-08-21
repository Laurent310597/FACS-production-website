export type MailAddress = { mail_address: string; name?: string };

export type MailAttachment = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

type GraphToken = { access_token?: string; error?: string; error_description?: string };

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Thiếu ${name} trong Edge Function Secrets.`);
  return value;
}

function graphAddress(item: MailAddress) {
  return { emailAddress: { address: item.mail_address, name: item.name || undefined } };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function getMicrosoftMailStatus() {
  const tenantId = Deno.env.get("MICROSOFT_TENANT_ID")?.trim();
  const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")?.trim();
  return {
    connected: Boolean(tenantId && clientId && clientSecret),
    provider: "Microsoft 365",
    auth_mode: "application",
  };
}

export async function getMicrosoftGraphToken() {
  const tenantId = requiredSecret("MICROSOFT_TENANT_ID");
  const clientId = requiredSecret("MICROSOFT_CLIENT_ID");
  const clientSecret = requiredSecret("MICROSOFT_CLIENT_SECRET");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json() as GraphToken;
  if (!response.ok || !payload.access_token) {
    throw new Error(`Microsoft 365 authentication failed: ${payload.error_description || payload.error || response.statusText}`);
  }
  return payload.access_token;
}

export async function sendMicrosoftMail(params: {
  accessToken: string;
  senderEmail: string;
  senderName: string;
  subject: string;
  bodyHtml: string;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  replyTo?: MailAddress[];
  attachment?: MailAttachment;
  dedupeKey: string;
}) {
  const requestId = crypto.randomUUID();
  const message: Record<string, unknown> = {
    subject: params.subject,
    body: { contentType: "HTML", content: params.bodyHtml },
    from: graphAddress({ mail_address: params.senderEmail, name: params.senderName }),
    toRecipients: params.to.map(graphAddress),
    ccRecipients: (params.cc || []).map(graphAddress),
    bccRecipients: (params.bcc || []).map(graphAddress),
    replyTo: (params.replyTo || []).map(graphAddress),
    internetMessageHeaders: [
      { name: "X-FACS-Dedupe-Key", value: params.dedupeKey },
      { name: "X-FACS-Request-Id", value: requestId },
    ],
  };
  if (params.attachment) {
    message.attachments = [{
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: params.attachment.filename,
      contentType: params.attachment.contentType,
      contentBytes: bytesToBase64(params.attachment.bytes),
    }];
  }

  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.senderEmail)}/sendMail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "client-request-id": requestId,
      "return-client-request-id": "true",
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`Microsoft Graph Mail.Send failed (${response.status}): ${detail}`);
  }
  return { message_id: requestId, thread_id: undefined };
}
