const DEFAULT_PUBLIC_BASE_URL = "https://lian.nat100.top";
const DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS = 8000;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePublicBaseUrl(value = "") {
  const raw = String(value || "").trim() || DEFAULT_PUBLIC_BASE_URL;
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("public base URL must be http or https");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

const PUBLIC_ENTRY_CHECKS = Object.freeze([
  {
    name: "home",
    path: "/",
    expectJson: false,
    accept: "text/html,application/xhtml+xml",
    validate: ({ body, response }) => {
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
]);

const OPS_PAGE_CHECK = Object.freeze({
  name: "ops-page",
  path: "/ops.html",
  expectJson: false,
  accept: "text/html,application/xhtml+xml",
  validate: ({ body, response }) => {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("text/html") && /LIAN Ops|ops-card/i.test(body);
  }
});

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, cancel: () => clearTimeout(timer) };
}

async function runPublicEntryCheck(baseUrl, check, timeoutMs) {
  const url = `${baseUrl}${check.path}`;
  const startedAt = Date.now();
  const { controller, cancel } = withTimeout(timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: check.accept || (check.expectJson ? "application/json" : "text/html,application/xhtml+xml") }
    });
    const elapsedMs = Date.now() - startedAt;
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "";
    const location = response.headers.get("location") || "";

    if (response.status !== 200) {
      return {
        ok: false,
        name: check.name,
        path: check.path,
        url,
        status: response.status,
        elapsedMs,
        contentType,
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
          path: check.path,
          url,
          status: response.status,
          elapsedMs,
          contentType,
          jsonValid: valid,
          error: valid ? undefined : "JSON shape validation failed"
        };
      } catch (error) {
        return {
          ok: false,
          name: check.name,
          path: check.path,
          url,
          status: response.status,
          elapsedMs,
          contentType,
          jsonValid: false,
          error: `invalid JSON: ${error.message}`
        };
      }
    }

    const valid = check.validate ? Boolean(await check.validate({ body, response })) : true;
    return {
      ok: valid,
      name: check.name,
      path: check.path,
      url,
      status: response.status,
      elapsedMs,
      contentType,
      error: valid ? undefined : "body validation failed"
    };
  } catch (error) {
    return {
      ok: false,
      name: check.name,
      path: check.path,
      url,
      status: null,
      elapsedMs: Date.now() - startedAt,
      contentType: "",
      error: error.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error.message
    };
  } finally {
    cancel();
  }
}

async function runPublicEntryChecks({ baseUrl = DEFAULT_PUBLIC_BASE_URL, timeoutMs = DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS, includeOpsPage = false } = {}) {
  const normalizedBaseUrl = normalizePublicBaseUrl(baseUrl);
  const normalizedTimeoutMs = parsePositiveInteger(timeoutMs, DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS);
  const checks = includeOpsPage
    ? [PUBLIC_ENTRY_CHECKS[0], OPS_PAGE_CHECK, ...PUBLIC_ENTRY_CHECKS.slice(1)]
    : PUBLIC_ENTRY_CHECKS;

  const results = [];
  for (const check of checks) {
    results.push(await runPublicEntryCheck(normalizedBaseUrl, check, normalizedTimeoutMs));
  }

  return {
    ok: results.every((result) => result.ok),
    baseUrl: normalizedBaseUrl,
    timeoutMs: normalizedTimeoutMs,
    results
  };
}

export {
  DEFAULT_PUBLIC_BASE_URL,
  DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS,
  OPS_PAGE_CHECK,
  PUBLIC_ENTRY_CHECKS,
  normalizePublicBaseUrl,
  parsePositiveInteger,
  runPublicEntryCheck,
  runPublicEntryChecks
};
