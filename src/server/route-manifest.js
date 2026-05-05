import { EXACT_ROUTES, PREFIX_ROUTES, REGEX_ROUTES } from "./route-matcher.js";
import { securityModeName } from "./security-mode.js";

const GATE_PROTECTED_EXACT_PATHS = [
  { method: "POST", path: "/api/setup", reason: "mutates runtime configuration" }
];

const GATE_PROTECTED_PREFIXES = [
  { prefix: "/api/ops/", reason: "ops and deployment controls" },
  { prefix: "/api/admin/", reason: "administrative API" },
  { prefix: "/api/internal/", reason: "internal diagnostics and task board" }
];

const GATE_PUBLIC_EXACT_PATHS = [
  { method: "GET", path: "/api/setup/status", reason: "setup and mode status" },
  { method: "GET", path: "/api/ops/routes", reason: "route capability manifest for edge/gate proxy" },
  { method: "GET", path: "/api/feed", reason: "public home feed" },
  { method: "GET", path: "/api/feed-debug", reason: "development feed diagnostics" },
  { method: "GET", path: "/api/tags", reason: "public tag list" },
  { method: "GET", path: "/api/map/v2/items", reason: "public campus map items" },
  { method: "GET", path: "/api/map/items", reason: "legacy public campus map items" },
  { method: "GET", path: "/api/channel", reason: "public channel shell" },
  { method: "GET", path: "/api/messages", reason: "message center shell; auth handled by backend when needed" }
];

function sanitizeRegexRoute(route) {
  return {
    method: route.method,
    id: route.id,
    pattern: route.pattern.source,
    keys: route.keys
  };
}

function buildRouteManifest() {
  return {
    version: 1,
    service: "lian-platform-server",
    securityMode: securityModeName(),
    generatedAt: new Date().toISOString(),
    routing: {
      backendPathPrefix: "/api/",
      frontendFallback: "/*",
      deployWebhookPath: "/api/ops/deploy-webhook"
    },
    gate: {
      policy: "Gate should route by service boundary and protect only declared protected paths. Backend auth remains authoritative for user/session permissions.",
      publicExactPaths: GATE_PUBLIC_EXACT_PATHS,
      protectedExactPaths: GATE_PROTECTED_EXACT_PATHS,
      protectedPrefixes: GATE_PROTECTED_PREFIXES,
      developmentMode: {
        passthrough: true,
        note: "In development, gate should proxy all requests without challenge."
      }
    },
    routes: {
      exact: EXACT_ROUTES.map(({ method, path, id }) => ({ method, path, id })),
      prefix: PREFIX_ROUTES.map(({ prefix, id }) => ({ prefix, id })),
      regex: REGEX_ROUTES.map(sanitizeRegexRoute)
    }
  };
}

export { buildRouteManifest, GATE_PROTECTED_EXACT_PATHS, GATE_PROTECTED_PREFIXES, GATE_PUBLIC_EXACT_PATHS };
