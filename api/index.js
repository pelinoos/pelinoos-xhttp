export const config = { runtime: "edge" };

const TARGET_BASE = (process.env.TARGET_DOMAIN || "").replace(/\/$/, "");

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export default async function handler(req) {
  if (!TARGET_BASE) {
    return new Response("Misconfigured", { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = TARGET_BASE + url.pathname + url.search;

    // Build clean headers (simulate real browser → server request)
    const headers = new Headers();

    // Whitelist instead of blacklist (IMPORTANT)
    const allowedHeaders = [
      "accept",
      "accept-language",
      "content-type",
      "user-agent",
      "authorization",
      "cookie",
    ];

    for (const [k, v] of req.headers) {
      if (allowedHeaders.includes(k.toLowerCase())) {
        headers.set(k, v);
      }
    }

    // Normalize origin-related headers
    const targetOrigin = new URL(TARGET_BASE).origin;
    headers.set("origin", targetOrigin);
    headers.set("referer", targetOrigin + "/");

    const method = req.method;
    const hasBody = method !== "GET" && method !== "HEAD";

    const res = await fetch(targetUrl, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
    });

    // Clean response headers
    const responseHeaders = new Headers();
    for (const [k, v] of res.headers) {
      if (!HOP_BY_HOP.has(k.toLowerCase())) {
        responseHeaders.set(k, v);
      }
    }

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });

  } catch (err) {
    return new Response("Bad Gateway", { status: 502 });
  }
}
