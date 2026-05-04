const DEFAULT_ALLOWED_IMAGE_HOSTS = ["res.cloudinary.com"];
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function configuredAllowedHosts() {
  return new Set([
    ...DEFAULT_ALLOWED_IMAGE_HOSTS,
    ...String(process.env.LIAN_IMAGE_PROXY_ALLOWED_HOSTS || "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean)
  ]);
}

function hostnameIsBlocked(hostname = "") {
  const value = String(hostname || "").toLowerCase();
  return value === "localhost" ||
    value === "0.0.0.0" ||
    value === "127.0.0.1" ||
    value === "::1" ||
    value.endsWith(".localhost") ||
    value.startsWith("127.") ||
    value.startsWith("10.") ||
    value.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value);
}

function isAllowedCloudinaryImageUrl(url) {
  return url.hostname === "res.cloudinary.com" &&
    /^\/[^/]+\/image\/upload\//.test(url.pathname);
}

function isAllowedConfiguredImageUrl(url) {
  return configuredAllowedHosts().has(url.hostname);
}

function isAllowedImageUrl(value = "") {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:") return false;
    if (hostnameIsBlocked(url.hostname)) return false;
    if (isAllowedCloudinaryImageUrl(url)) return true;
    return isAllowedConfiguredImageUrl(url);
  } catch {
    return false;
  }
}

async function handleImageProxy(reqUrl, res) {
  const target = reqUrl.searchParams.get("url") || "";
  if (!isAllowedImageUrl(target)) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("invalid image url");
    return;
  }
  const fetchTarget = target.replace(
    /\/image\/upload\/([^/]*?)f_auto([^/]*?)\//,
    (_match, before, after) => `/image/upload/${before}f_jpg${after}/`
  );

  const response = await fetch(fetchTarget, {
    headers: {
      accept: "image/jpeg,image/png,image/webp,image/*,*/*"
    }
  });
  if (!response.ok || !String(response.headers.get("content-type") || "").startsWith("image/")) {
    res.writeHead(response.ok ? 502 : response.status, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end("image fetch failed");
    return;
  }

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    res.writeHead(413, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("image too large");
    return;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    res.writeHead(413, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("image too large");
    return;
  }

  res.writeHead(200, {
    "content-type": response.headers.get("content-type") || "image/jpeg",
    "cache-control": "public, max-age=604800, immutable",
    "content-length": String(bytes.byteLength)
  });
  res.end(Buffer.from(bytes));
}

export { handleImageProxy, isAllowedImageUrl };
