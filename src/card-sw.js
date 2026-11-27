// Service worker của thẻ danh thiếp số (phạm vi /card/). Bước build (vite.config.js) chép tệp này ra dist/card/sw.js
// và điền phiên bản + danh sách tệp cần lưu sẵn. Mục tiêu: mở app thẻ trên màn hình chính được cả khi không có mạng.
const VERSION = "__CARD_CACHE_VERSION__";
const PRECACHE = __CARD_PRECACHE__; // eslint-disable-line no-undef
const CACHE = `facs-card-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => null))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("facs-card-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Ảnh chủ thẻ tự tải lên (kho Supabase): mỗi ảnh có tên riêng, không đổi nội dung → lưu lại để xem khi mất mạng.
  if (url.origin !== self.location.origin && url.pathname.includes("/storage/v1/object/public/card-photos/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req, { ignoreVary: true });
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Mở trang thẻ: lấy bản mới trên mạng (tối đa 3 giây), mất mạng thì dùng bản đã lưu.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const key = url.pathname.replace(/\/$/, "");
        try {
          const res = await Promise.race([fetch(req), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))]);
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        } catch {
          return (await cache.match(key, { ignoreVary: true })) || (await cache.match(req, { ignoreSearch: true, ignoreVary: true })) || Response.error();
        }
      })(),
    );
    return;
  }

  // Tệp JS/CSS có mã băm trong tên, ảnh, danh bạ: dùng bản đã lưu, đồng thời làm mới ngầm.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/card/") || url.pathname === "/facs-mark.png")) {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })(),
  );
});
