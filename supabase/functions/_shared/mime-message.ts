export type MailAttachment = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function encodedWord(value: string) {
  const base64 = bytesToBase64(new TextEncoder().encode(sanitizeHeader(value)));
  return `=?UTF-8?B?${base64}?=`;
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") || "";
}

function encodeBody(value: string) {
  return wrapBase64(bytesToBase64(new TextEncoder().encode(value)));
}

function address(value: string, name?: string) {
  const email = sanitizeHeader(value).toLowerCase();
  return name ? `${encodedWord(name)} <${email}>` : email;
}

export function buildRawEmail(params: {
  from: string;
  fromName: string;
  to: Array<{ mail_address: string; name?: string }>;
  replyTo: string;
  subject: string;
  html: string;
  plainText: string;
  attachment?: MailAttachment;
}) {
  const alternativeBoundary = `facs-alt-${crypto.randomUUID()}`;
  const mixedBoundary = `facs-mixed-${crypto.randomUUID()}`;
  const headers = [
    `From: ${address(params.from, params.fromName)}`,
    `To: ${params.to.map((item) => address(item.mail_address, item.name)).join(", ")}`,
    `Reply-To: ${address(params.replyTo)}`,
    `Subject: ${encodedWord(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
  ];

  const alternativeParts = [
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeBody(params.plainText),
    `--${alternativeBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    encodeBody(params.html),
    `--${alternativeBoundary}--`,
  ];

  let rawLines: string[];
  if (params.attachment) {
    const safeFilename = sanitizeHeader(params.attachment.filename);
    const asciiFilename = safeFilename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "cv";
    const encodedFilename = encodeURIComponent(safeFilename).replaceAll("'", "%27");
    rawLines = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
      "",
      `--${mixedBoundary}`,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      ...alternativeParts,
      `--${mixedBoundary}`,
      `Content-Type: ${params.attachment.contentType}; name="${asciiFilename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      "",
      wrapBase64(bytesToBase64(params.attachment.bytes)),
      `--${mixedBoundary}--`,
    ];
  } else {
    rawLines = [
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      ...alternativeParts,
    ];
  }

  const rawBytes = new TextEncoder().encode(rawLines.join("\r\n"));
  return bytesToBase64(rawBytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
