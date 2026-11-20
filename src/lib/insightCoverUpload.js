const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function uploadInsightCover({ client, url, key, file, stem, timeoutMs = 45000 }) {
  const extension = allowedTypes.get(file.type);
  if (!extension) throw new Error("Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF.");
  if (!file.size) throw new Error("Tệp ảnh đang trống. Hãy chọn ảnh khác.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh bìa không được vượt quá 5 MB.");

  const controller = new AbortController();
  let timer;
  const path = `covers/${crypto.randomUUID()}-${stem}.${extension}`;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Tải ảnh quá thời gian chờ. Hãy thử lại hoặc dán URL ảnh."));
      controller.abort();
    }, timeoutMs);
  });

  const upload = async () => {
    let bytes;
    try {
      bytes = await file.arrayBuffer();
    } catch {
      throw new Error("Không đọc được ảnh từ máy. Hãy lưu ảnh về máy rồi chọn lại.");
    }
    controller.signal.throwIfAborted();

    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.access_token) {
      throw new Error("Phiên đăng nhập đã hết hạn. Hãy lưu nháp rồi đăng nhập lại.");
    }
    controller.signal.throwIfAborted();

    // Send bytes directly so the browser doesn't have to read the local File
    // while streaming a multipart request to Storage.
    const response = await fetch(`${url}/storage/v1/object/insight-images/${path}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": file.type,
        "Cache-Control": "max-age=3600",
        "x-upsert": "false",
      },
      body: bytes,
      signal: controller.signal,
    }).catch((issue) => {
      if (controller.signal.aborted) throw issue;
      throw new Error("Kết nối tới kho ảnh bị gián đoạn. Hãy kiểm tra mạng và thử lại.");
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Phiên đăng nhập đã hết hạn. Hãy lưu nháp rồi đăng nhập lại.");
      const details = await response.json().catch(() => ({}));
      throw new Error(details.message || `Kho ảnh từ chối yêu cầu (HTTP ${response.status}).`);
    }
    return client.storage.from("insight-images").getPublicUrl(path).data.publicUrl;
  };

  try {
    return await Promise.race([upload(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
