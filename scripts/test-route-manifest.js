#!/usr/bin/env node

// Route manifest contract tests — keeps the edge/gate route manifest in sync
// with the backend route matcher and documented protection policy.
// Usage: node scripts/test-route-manifest.js

import { EXACT_ROUTES, PREFIX_ROUTES, REGEX_ROUTES, matchRoute } from "../src/server/route-matcher.js";
import {
  GATE_PROTECTED_EXACT_PATHS,
  GATE_PROTECTED_PREFIXES,
  GATE_PUBLIC_EXACT_PATHS,
  buildRouteManifest
} from "../src/server/route-manifest.js";

let passed = 0;
let failed = 0;

function assert(condition, name, details = "") {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed += 1;
    return;
  }

  console.log(`  ✗ ${name}`);
  if (details) console.log(`    ${details}`);
  failed += 1;
}

function routeKey(route) {
  return `${route.method || "*"} ${route.path || route.prefix || route.pattern}`;
}

function assertMatchedRoute(route, name) {
  const result = matchRoute(route.method, route.path);
  assert(result !== null, name, `unmatched route: ${routeKey(route)}`);
}

function assertUniqueRoutes(routes, name) {
  const seen = new Set();
  const duplicates = [];

  for (const route of routes) {
    const key = routeKey(route);
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }

  assert(duplicates.length === 0, name, `duplicates: ${duplicates.join(", ")}`);
}

console.log("═══ 路由能力清单合约测试 ═══\n");

const manifest = buildRouteManifest();

console.log("▶ 基础结构");
assert(manifest.version === 1, "manifest version is 1");
assert(manifest.service === "lian-platform-server", "manifest service is lian-platform-server");
assert(Number.isFinite(Date.parse(manifest.generatedAt)), "manifest generatedAt is ISO-like timestamp");
assert(manifest.routing.backendPathPrefix === "/api/", "backend path prefix is /api/");
assert(manifest.routing.deployWebhookPath === "/api/ops/deploy-webhook", "deploy webhook path is declared");

console.log("");
console.log("▶ matcher 同步");
assert(manifest.routes.exact.length === EXACT_ROUTES.length, "exact route count matches matcher");
assert(manifest.routes.prefix.length === PREFIX_ROUTES.length, "prefix route count matches matcher");
assert(manifest.routes.regex.length === REGEX_ROUTES.length, "regex route count matches matcher");
assertUniqueRoutes(manifest.routes.exact, "exact manifest routes are unique");
assertUniqueRoutes(manifest.routes.prefix, "prefix manifest routes are unique");

const exactManifestKeys = new Set(manifest.routes.exact.map(routeKey));
for (const route of EXACT_ROUTES) {
  assert(exactManifestKeys.has(routeKey(route)), `manifest includes exact route ${routeKey(route)}`);
}

const prefixManifestKeys = new Set(manifest.routes.prefix.map(routeKey));
for (const route of PREFIX_ROUTES) {
  assert(prefixManifestKeys.has(routeKey(route)), `manifest includes prefix route ${routeKey(route)}`);
}

const regexManifestKeys = new Set(manifest.routes.regex.map(routeKey));
for (const route of REGEX_ROUTES) {
  assert(regexManifestKeys.has(routeKey({ method: route.method, pattern: route.pattern.source })), `manifest includes regex route ${route.method} ${route.pattern.source}`);
}

console.log("");
console.log("▶ gate 公开/保护策略");
assert(GATE_PUBLIC_EXACT_PATHS.length > 0, "public exact path list is not empty");
assert(GATE_PROTECTED_EXACT_PATHS.length > 0, "protected exact path list is not empty");
assert(GATE_PROTECTED_PREFIXES.length > 0, "protected prefix list is not empty");
assertUniqueRoutes(GATE_PUBLIC_EXACT_PATHS, "public exact gate paths are unique");
assertUniqueRoutes(GATE_PROTECTED_EXACT_PATHS, "protected exact gate paths are unique");
assertUniqueRoutes(GATE_PROTECTED_PREFIXES, "protected gate prefixes are unique");

const publicKeys = new Set(GATE_PUBLIC_EXACT_PATHS.map(routeKey));
const protectedExactKeys = new Set(GATE_PROTECTED_EXACT_PATHS.map(routeKey));
for (const key of publicKeys) {
  assert(!protectedExactKeys.has(key), `public/protected exact paths do not overlap: ${key}`);
}

for (const route of GATE_PUBLIC_EXACT_PATHS) {
  assertMatchedRoute(route, `public gate path is a real backend route: ${routeKey(route)}`);
}

for (const route of GATE_PROTECTED_EXACT_PATHS) {
  assertMatchedRoute(route, `protected gate path is a real backend route: ${routeKey(route)}`);
}

assert(
  GATE_PROTECTED_PREFIXES.some((route) => route.prefix === "/api/admin/"),
  "admin API prefix stays protected"
);
assert(
  GATE_PROTECTED_PREFIXES.some((route) => route.prefix === "/api/internal/"),
  "internal API prefix stays protected"
);
assert(
  GATE_PROTECTED_PREFIXES.some((route) => route.prefix === "/api/ops/"),
  "ops API prefix stays protected"
);
assert(
  !publicKeys.has("POST /api/ops/deploy-webhook"),
  "deploy webhook is not listed as a public exact path"
);

console.log("");
console.log("═══ 结果 ═══");
console.log(`通过: ${passed}, 失败: ${failed}`);
if (failed > 0) {
  console.log("\n有失败的测试用例，请检查 route-manifest.js 或 route-matcher.js。");
  process.exit(1);
}

console.log("\n全部通过！");
