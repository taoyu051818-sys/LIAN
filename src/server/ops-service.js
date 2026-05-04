import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config, isSetupRequired } from "./config.js";
import { sendJson } from "./http-response.js";
import { requireAdmin } from "./request-utils.js";
import { securityModeName } from "./security-mode.js";

const DEFAULT_PUBLIC_BASE_URL = "https://lian.nat100.top";
const REQUEST_TIMEOUT_MS = 8000;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function normalizeBaseUrl(value = "") {
  const raw = String(value || "").trim() || DEFAULT_PUBLIC_BASE_URL;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("publicBase must be http or https");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

async function fetchText(url, { method = "GET" } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: { accept: "application/json,text/html,text/plain,*/*" }
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      contentType: response.headers.get("content-type") || "",
      body: text
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function safeCheck(name, run) {
  try {
    return { name, ok: true, ...(await run()) };
  } catch (error) {
    return { name, ok: false, error: error?.message || String(error) };
  }
}

function parseJson(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function imageDeliverySummary(feedText = "") {
  const proxyMatches = feedText.match(/https:\/\/lian\.nat100\.top\/api\/image-proxy/g) || [];
  const cloudinaryMatches = feedText.match(/https:\/\/res\.cloudinary\.com[^"'\\\s<>)]+/g) || [];
  return {
    usesLianImageProxy: proxyMatches.length > 0,
    lianImageProxyCount: proxyMatches.length,
    cloudinaryDirectCount: cloudinaryMatches.length,
    sampleCloudinaryUrls: [...new Set(cloudinaryMatches)].slice(0, 5)
  };
}

async function readGitInfo() {
  try {
    const head = (await fs.readFile(path.join(repoRoot, ".git/HEAD"), "utf8")).trim();
    if (head.startsWith("ref:")) {
      const ref = head.slice(4).trim();
      const refPath = path.join(repoRoot, ".git", ref);
      let sha = "";
      try {
        sha = (await fs.readFile(refPath, "utf8")).trim();
      } catch {
        const packedRefs = await fs.readFile(path.join(repoRoot, ".git/packed-refs"), "utf8").catch(() => "");
        sha = packedRefs.split(/\r?\n/).find((line) => line.endsWith(` ${ref}`))?.split(" ")[0] || "";
      }
      return { ref, sha: sha || "unknown" };
    }
    return { ref: "detached", sha: head || "unknown" };
  } catch (error) {
    return { ref: "unknown", sha: "unknown", error: error?.message || String(error) };
  }
}

async function handleOpsHealth(req, reqUrl, res) {
  requireAdmin(req);

  const publicBaseUrl = normalizeBaseUrl(reqUrl.searchParams.get("publicBase") || reqUrl.searchParams.get("base") || "");
  const checks = [];

  checks.push(await safeCheck("frontend-home", async () => {
    const result = await fetchText(`${publicBaseUrl}/`);
    return {
      status: result.status,
      elapsedMs: result.elapsedMs,
      contentType: result.contentType,
      hasHtml: /<html|<!doctype html/i.test(result.body)
    };
  }));

  checks.push(await safeCheck("api-feed", async () => {
    const result = await fetchText(`${publicBaseUrl}/api/feed`);
    const json = parseJson(result.body);
    return {
      status: result.status,
      elapsedMs: result.elapsedMs,
      contentType: result.contentType,
      jsonValid: Boolean(json),
      ...imageDeliverySummary(result.body)
    };
  }));

  checks.push(await safeCheck("map-v2-items", async () => {
    const result = await fetchText(`${publicBaseUrl}/api/map/v2/items`);
    const json = parseJson(result.body);
    return {
      status: result.status,
      elapsedMs: result.elapsedMs,
      contentType: result.contentType,
      jsonValid: Boolean(json),
      itemCount: Array.isArray(json?.items) ? json.items.length : null
    };
  }));

  const apiFeed = checks.find((check) => check.name === "api-feed");
  const ok = checks.every((check) => check.ok && (!check.status || check.status >= 200 && check.status < 300)) &&
    apiFeed && apiFeed.jsonValid && !apiFeed.usesLianImageProxy && apiFeed.cloudinaryDirectCount > 0;

  sendJson(res, 200, {
    ok,
    generatedAt: new Date().toISOString(),
    publicBaseUrl,
    service: {
      pid: process.pid,
      cwd: process.cwd(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memory: process.memoryUsage(),
      git: await readGitInfo()
    },
    config: {
      port: config.port,
      imageProxyPort: config.imageProxyPort,
      imageProxyPublicBaseUrl: config.imageProxyPublicBaseUrl,
      setupRequired: isSetupRequired(),
      securityMode: securityModeName(),
      cloudinaryConfigured: Boolean(config.cloudinaryUrl),
      mailConfigured: Boolean(config.resendApiKey || config.smtpHost)
    },
    checks
  });
}

export { handleOpsHealth };
