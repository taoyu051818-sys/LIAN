#!/usr/bin/env node

// Public entry smoke checks for the edge gateway and deployed services.
// This intentionally uses GET, not HEAD, because backend routes are method-specific.
// Usage:
//   npm run verify:public
//   LIAN_PUBLIC_BASE_URL=https://example.com npm run verify:public

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const baseUrl = String(process.env.LIAN_PUBLIC_BASE_URL || "https://lian.nat100.top").replace(/\/+$/, "");
const timeoutMs = parsePositiveInteger(process.env.LIAN_PUBLIC_TIMEOUT_MS, 8000);

const checks = [
  {
    name: "home",
    path: "/",
    expectJson: false,
    validate: async ({ body, response }) => {
      const contentType = response.headers.get("content-type") || "";
      return contentType.includes("text/html") || /<!doctype html|<html/i.test(body);
    }
  },
  {
    name: "feed",
    path: "/api/feed?limit=24",
    expectJson: true,
    validateJson: (json) => Array.isArray(json.items)
  },
  {
    name: "map",
    path: "/api/map/v2/items",
    expectJson: true,
    validateJson: (json) => Array.isArray(json.items) || Array.isArray(json.locations) || Boolean(json.bounds)
  },
  {
    name: "setup",
    path: "/api/setup/status",
    expectJson: true,
    validateJson: (json) => typeof json.required === "boolean" && typeof json.configured === "boolean"
  },
  {
    name: "route-manifest",
    path: "/api/ops/routes",
    expectJson: true,
    validateJson: (json) => json?.service === "lian-platform-server" && json?.routing?.backendPathPrefix === "/api/"
  }
];

function withTimeout() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, cancel: () => clearTimeout(timer) };
}

async function runCheck(check) {
  const url = `${baseUrl}${check.path}`;
  const startedAt = Date.now();
  const { controller, cancel } = withTimeout();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: check.expectJson ? "application/json" : "text/html,application/xhtml+xml" }
    });
    const elapsedMs = Date.now() - startedAt;
    const body = await response.text();
    const location = response.headers.get("location") || "";

    if (response.status !== 200) {
      return {
        ok: false,
        name: check.name,
        url,
        status: response.status,
        elapsedMs,
        error: location ? `expected 200, got ${response.status} redirect/location=${location}` : `expected 200, got ${response.status}`
      };
    }

    if (check.expectJson) {
      try {
        const json = JSON.parse(body);
        const valid = check.validateJson ? Boolean(check.validateJson(json)) : true;
        return {
          ok: valid,
          name: check.name,
          url,
          status: response.status,
          elapsedMs,
          error: valid ? undefined : "JSON shape validation failed"
        };
      } catch (error) {
        return {
          ok: false,
          name: check.name,
          url,
          status: response.status,
          elapsedMs,
          error: `invalid JSON: ${error.message}`
        };
      }
    }

    const valid = check.validate ? await check.validate({ body, response }) : true;
    return {
      ok: valid,
      name: check.name,
      url,
      status: response.status,
      elapsedMs,
      error: valid ? undefined : "body validation failed"
    };
  } catch (error) {
    return {
      ok: false,
      name: check.name,
      url,
      status: null,
      elapsedMs: Date.now() - startedAt,
      error: error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message
    };
  } finally {
    cancel();
  }
}

const results = [];
for (const check of checks) {
  results.push(await runCheck(check));
}

const report = {
  ok: results.every((result) => result.ok),
  baseUrl,
  timeoutMs,
  results
};

console.log(JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error("[verify-public-entry] public entry smoke checks failed");
  process.exit(1);
}
