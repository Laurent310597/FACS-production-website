// This flag is set only on the Vercel deployment used to review Email & Audience.
export const isEmailDataPreview = import.meta.env.VITE_EMAIL_DATA_PREVIEW === "true";

const readableTables = new Set(["posts", "insight_email_audience"]);

export function emailPreviewFetch(url, options) {
  const request = new Request(url, options);
  const { origin, pathname } = new URL(request.url);
  const databaseOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
  const isRead = ["GET", "HEAD"].includes(request.method)
    && pathname.startsWith("/rest/v1/") && readableTables.has(pathname.slice("/rest/v1/".length));
  const isAuth = (request.method === "POST" && ["/auth/v1/token", "/auth/v1/logout"].includes(pathname))
    || (request.method === "GET" && pathname === "/auth/v1/user");
  if (origin !== databaseOrigin || (!isRead && !isAuth)) {
    return Promise.resolve(new Response(JSON.stringify({ message: "Preview chỉ đọc dữ liệu CMS." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }));
  }
  return fetch(request, { redirect: "error" });
}
