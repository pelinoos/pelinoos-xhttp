export const config = { runtime: "edge" };

// 🔒 Hardcode your backend (no env-based dynamic proxying)
const TARGET_ORIGIN = "https://example.com";

// 🔒 Only allow specific paths (VERY IMPORTANT)
const ALLOWED_PATHS = [
  "/api/data",
  "/api/user",
  "/images/",
];

export default async function handler(req) {
  try {
    const url = new URL(req.url);

    // 🚫 Block unknown paths
    const isAllowed = ALLOWED_PATHS.some(p =>
      url.pathname === p || url.pathname.startsWith(p)
    );

    if (!isAllowed) {
      return new Response("Not allowed", { status: 403 });
    }

    const targetUrl = TARGET_ORIGIN + url.pathname + url.search;

    // ✅ Controlled headers (not full passthrough)
    const headers = new Headers({
      "accept": "application/json",
      "user-agent": req.headers.get("user-agent") || "Mozilla/5.0",
    });

    // Only forward cookies if you really need them
    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const res = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
    });

    // ✅ Clean response
    return new Response(res.body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "text/plain",
      },
    });

  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}
