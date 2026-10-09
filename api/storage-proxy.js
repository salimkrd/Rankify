/**
 * api/storage-proxy.js
 *
 * Restricted first-party Vercel Serverless Function proxy for Firebase Storage assets.
 * Strictly whitelists the project's Firebase Storage bucket (rankify-4b819) to prevent
 * arbitrary URL fetching, SSRF, or bypassing access controls.
 */

const ALLOWED_HOST = "firebasestorage.googleapis.com";
const ALLOWED_BUCKET_PREFIX = "/v0/b/rankify-4b819";

export default async function handler(req, res) {
  // 1. CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed. Only GET and HEAD requests are permitted." });
  }

  try {
    // 2. Extract requested path
    let targetPath = "";
    if (req.query?.path) {
      targetPath = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    } else if (req.url) {
      const parsed = new URL(req.url, "http://localhost");
      if (parsed.pathname.startsWith("/api/storage-proxy/")) {
        targetPath = parsed.pathname.slice("/api/storage-proxy/".length);
      } else if (parsed.pathname === "/api/storage-proxy" && parsed.searchParams.has("path")) {
        targetPath = parsed.searchParams.get("path");
      }
    }

    if (!targetPath) {
      return res.status(400).json({ error: "Missing required storage object path." });
    }

    // Split targetPath if it contains a query string
    let embeddedQuery = "";
    if (targetPath.includes("?")) {
      const qIndex = targetPath.indexOf("?");
      embeddedQuery = targetPath.slice(qIndex + 1);
      targetPath = targetPath.slice(0, qIndex);
    }

    if (!targetPath.startsWith("/")) {
      targetPath = "/" + targetPath;
    }

    // 3. Strict Whitelist Check: strictly restrict to rankify-4b819 storage
    if (!targetPath.startsWith(ALLOWED_BUCKET_PREFIX)) {
      return res.status(403).json({
        error: "Forbidden: Access is strictly restricted to Rankify Firebase Storage assets.",
      });
    }

    // 3.5 Ensure object path after '/o/' is correctly percent-encoded (Vercel rewrites decode %2F into /)
    const oIndex = targetPath.indexOf("/o/");
    if (oIndex !== -1) {
      const bucketPrefix = targetPath.slice(0, oIndex + 3);
      const rawObjectPart = targetPath.slice(oIndex + 3);
      targetPath = bucketPrefix + encodeURIComponent(decodeURIComponent(rawObjectPart));
    }

    // Accumulate query parameters
    const searchParams = new URLSearchParams();

    // From req.query (Vercel forwards query params here)
    if (req.query && typeof req.query === "object") {
      for (const [k, v] of Object.entries(req.query)) {
        if (k !== "path") {
          searchParams.set(k, Array.isArray(v) ? v[0] : v);
        }
      }
    }

    // From embedded query in targetPath
    if (embeddedQuery) {
      const embeddedParams = new URLSearchParams(embeddedQuery);
      for (const [k, v] of embeddedParams.entries()) {
        if (!searchParams.has(k)) {
          searchParams.set(k, v);
        }
      }
    }

    // From req.url
    if (req.url && req.url.includes("?")) {
      const urlQuery = new URLSearchParams(req.url.slice(req.url.indexOf("?") + 1));
      for (const [k, v] of urlQuery.entries()) {
        if (k !== "path" && !searchParams.has(k)) {
          searchParams.set(k, v);
        }
      }
    }

    const finalSearch = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const targetUrl = `https://${ALLOWED_HOST}${targetPath}${finalSearch}`;

    // Verify hostname strictly
    const parsedTarget = new URL(targetUrl);
    if (parsedTarget.hostname !== ALLOWED_HOST) {
      return res.status(403).json({ error: "Forbidden: Destination host not allowed." });
    }

    res.setHeader("X-Rankify-Proxy-Version", "2.0.1");

    // 4. Fetch upstream from Firebase Storage
    const upstreamRes = await fetch(targetUrl);
    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => "");
      return res.status(upstreamRes.status).json({
        error: `Upstream Firebase Storage returned status ${upstreamRes.status}`,
        upstreamError: errText,
        targetUrl,
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.byteLength);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800");

    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    res.status(200);
    return res.end(buffer);
  } catch (err) {
    console.error("[StorageProxy] Error in serverless handler:", err);
    return res.status(502).json({ error: "Storage proxy error", details: err.message });
  }
}
