import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config, isSetupRequired } from "./config.js";
import { sendJson } from "./http-response.js";
import { requireAdmin } from "./request-utils.js";
import { getCurrentUser } from "./auth-service.js";
import { securityModeName } from "./security-mode.js";

const DEFAULT_PUBLIC_BASE_URL = "https://lian.nat100.top";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_WEBHOOK_BYTES = 1024 * 1024;
const OPS_LOG_DIR = process.env.LIAN_OPS_LOG_DIR || "/tmp";
const DEPLOY_WEBHOOK_SECRET = process.env.LIAN_DEPLOY_WEBHOOK_SECRET || "";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const backendRepoDir = process.env.LIAN_BACKEND_REPO_DIR || repoRoot;
const frontendRepoDir = process.env.LIAN_FRONTEND_REPO_DIR || "/opt/lian-mobile-web";
const frontendServiceName = process.env.LIAN_FRONTEND_SERVICE || "lian-frontend.service";
const backendPm2Name = process.env.LIAN_BACKEND_PM2_NAME || "lian-platform-server";

const OPS_ACTIONS = new Set([
  "restart-frontend",
  "restart-backend",
  "restart-all",
  "update-frontend",
  "update-backend",
  "update-all"
]);

const DEPLOY_REPO_ACTIONS = new Map([
  ["taoyu051818-sys/lian-mobile-web", "update-frontend"],
  ["taoyu051818-sys/lian-platform-server", "update-backend"]
]);

function configuredOpsAdminUsers() {
  return String(process.env.LIAN_OPS_ADMIN_USERS || process.env.OPS_ADMIN_USERS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function requireOpsAdmin(req) {
  requireAdmin(req);

  const allowed = configuredOpsAdminUsers();
  if (!allowed.length) {
    const error = new Error("LIAN_OPS_ADMIN_USERS is missing");
    error.status = 503;
    throw error;
  }

  const auth = await getCurrentUser(req);
  const user = auth.user;
  if (!user || user.status !== "active") {
    const error = new Error("admin login required");
    error.status = 401;
    throw error;
  }

  const identities = [
    user.email,
    user.username,
    user.id
  ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);

  if (!identities.some((item) => allowed.includes(item))) {
    const error = new Error("ops admin account required");
    error.status = 403;
    throw error;
  }

  return auth;
}

function normalizeBaseUrl(value = "") {
  const raw = String(value || "").trim() || DEFAULT_PUBLIC_BASE_URL;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("publicBase must be http or https");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function shellQuote(value = "") {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

async function readRawBody(req, maxBytes = MAX_WEBHOOK_BYTES) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > maxBytes) {
      const error = new Error("webhook body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function verifyGithubSignature(rawBody, signatureHeader = "") {
  if (!DEPLOY_WEBHOOK_SECRET) {
    const error = new Error("LIAN_DEPLOY_WEBHOOK_SECRET is missing");
    error.status = 503;
    throw error;
  }
  const expected = `sha256=${crypto.createHmac("sha256", DEPLOY_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  const actual = String(signatureHeader || "").trim();
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    const error = new Error("invalid GitHub webhook signature");
    error.status = 401;
    throw error;
  }
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

function frontendRestartScript() {
  return `
systemctl restart lian-frontend.service
sleep 2
systemctl status lian-frontend.service --no-pager -l || true
journalctl -u lian-frontend.service -n 40 --no-pager || true
`;
}

function backendRestartScript() {
  return `
cd ${shellQuote(backendRepoDir)}
pm2 restart ${shellQuote(backendPm2Name)} --update-env || pm2 start server.js --name ${shellQuote(backendPm2Name)} --update-env
pm2 save
sleep 2
pm2 list
`;
}

function frontendUpdateScript() {
  return `
cd ${shellQuote(frontendRepoDir)}
git fetch origin
git checkout main
git pull --ff-only origin main
node --check scripts/serve-frontend-static-rehearsal.js
${frontendRestartScript()}
`;
}

function backendUpdateScript() {
  return `
cd ${shellQuote(backendRepoDir)}
git fetch origin
git checkout main
git pull --ff-only origin main
npm install
node --check server.js
node --check src/server/ops-service.js
node --check src/server/request-security.js
${backendRestartScript()}
`;
}

function scriptForAction(action) {
  switch (action) {
    case "restart-frontend":
      return frontendRestartScript();
    case "restart-backend":
      return backendRestartScript();
    case "restart-all":
      return `${frontendRestartScript()}\n${backendRestartScript()}`;
    case "update-frontend":
      return frontendUpdateScript();
    case "update-backend":
      return backendUpdateScript();
    case "update-all":
      return `${frontendUpdateScript()}\n${backendUpdateScript()}`;
    default:
      return "";
  }
}

function scheduleOpsAction(action, source = "manual") {
  if (!OPS_ACTIONS.has(action)) {
    const error = new Error("unsupported ops action");
    error.status = 400;
    throw error;
  }
  const logPath = path.join(OPS_LOG_DIR, `lian-ops-${action}-${Date.now()}.log`);
  const script = `
set -euo pipefail
{
  echo "[LIAN ops] source=${source}"
  echo "[LIAN ops] action=${action}"
  echo "[LIAN ops] started_at=$(date -Iseconds)"
  sleep 1
  ${scriptForAction(action)}
  echo "[LIAN ops] finished_at=$(date -Iseconds)"
} > ${shellQuote(logPath)} 2>&1
`;
  const child = spawn("/bin/bash", ["-lc", script], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
  return { action, pid: child.pid, logPath };
}

async function handleOpsHealth(req, reqUrl, res) {
  await requireOpsAdmin(req);

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
      mailConfigured: Boolean(config.resendApiKey || config.smtpHost),
      backendRepoDir,
      frontendRepoDir,
      frontendServiceName,
      backendPm2Name,
      deployWebhookConfigured: Boolean(DEPLOY_WEBHOOK_SECRET),
      opsAdminUsersConfigured: configuredOpsAdminUsers().length > 0
    },
    checks
  });
}

async function handleOpsAction(req, reqUrl, res) {
  await requireOpsAdmin(req);
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method not allowed" });
  }
  const action = String(reqUrl.searchParams.get("action") || "").trim();
  const scheduled = scheduleOpsAction(action, "manual");
  sendJson(res, 202, {
    ok: true,
    scheduledAt: new Date().toISOString(),
    message: "ops action scheduled",
    ...scheduled
  });
}

async function handleOpsDeployWebhook(req, reqUrl, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method not allowed" });
  }

  const rawBody = await readRawBody(req);
  verifyGithubSignature(rawBody, req.headers["x-hub-signature-256"] || "");

  const event = String(req.headers["x-github-event"] || "");
  const delivery = String(req.headers["x-github-delivery"] || "");
  const payload = JSON.parse(rawBody.toString("utf8") || "{}");

  if (event === "ping") {
    return sendJson(res, 200, { ok: true, event, delivery, message: "pong" });
  }

  if (event !== "push") {
    return sendJson(res, 202, { ok: true, ignored: true, event, delivery, reason: "event is not push" });
  }

  if (payload.ref !== "refs/heads/main") {
    return sendJson(res, 202, {
      ok: true,
      ignored: true,
      event,
      delivery,
      ref: payload.ref || "",
      reason: "ref is not refs/heads/main"
    });
  }

  const repository = payload.repository?.full_name || "";
  const action = DEPLOY_REPO_ACTIONS.get(repository);
  if (!action) {
    return sendJson(res, 202, {
      ok: true,
      ignored: true,
      event,
      delivery,
      repository,
      reason: "repository is not deployable"
    });
  }

  const scheduled = scheduleOpsAction(action, `github:${repository}`);
  sendJson(res, 202, {
    ok: true,
    scheduledAt: new Date().toISOString(),
    message: "deploy webhook accepted",
    event,
    delivery,
    repository,
    ref: payload.ref,
    after: payload.after || "",
    ...scheduled
  });
}

export { handleOpsAction, handleOpsDeployWebhook, handleOpsHealth };
