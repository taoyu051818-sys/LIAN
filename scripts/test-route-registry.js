#!/usr/bin/env node

// Route registry contract tests — keeps route-matcher.js and api-route-registry.js in sync.
// Usage: node scripts/test-route-registry.js

import { EXACT_ROUTES, PREFIX_ROUTES, REGEX_ROUTES } from "../src/server/route-matcher.js";
import { PRE_SETUP_ROUTE_IDS, getRouteHandlerIds } from "../src/server/api-route-registry.js";

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

function unique(values) {
  return [...new Set(values)];
}

console.log("═══ Route Registry Contract Tests ═══\n");

const matcherRouteIds = [
  ...EXACT_ROUTES.map((route) => route.id),
  ...PREFIX_ROUTES.map((route) => route.id),
  ...REGEX_ROUTES.map((route) => route.id)
];
const uniqueMatcherRouteIds = unique(matcherRouteIds);
const handlerRouteIds = getRouteHandlerIds();
const handlerRouteIdSet = new Set(handlerRouteIds);
const matcherRouteIdSet = new Set(uniqueMatcherRouteIds);

console.log("▶ matcher route id quality");
assert(matcherRouteIds.length > 0, "matcher has route ids");
assert(
  matcherRouteIds.length === uniqueMatcherRouteIds.length,
  "matcher route ids are unique across exact/prefix/regex routes",
  `duplicates: ${matcherRouteIds.filter((id, index) => matcherRouteIds.indexOf(id) !== index).join(", ")}`
);

console.log("");
console.log("▶ registry coverage");
for (const routeId of uniqueMatcherRouteIds) {
  assert(handlerRouteIdSet.has(routeId), `registry has handler for ${routeId}`);
}

for (const routeId of handlerRouteIds) {
  assert(matcherRouteIdSet.has(routeId), `handler route id is declared by matcher: ${routeId}`);
}

console.log("");
console.log("▶ setup gate coverage");
assert(PRE_SETUP_ROUTE_IDS.size > 0, "pre-setup route list is not empty");
for (const routeId of PRE_SETUP_ROUTE_IDS) {
  assert(handlerRouteIdSet.has(routeId), `pre-setup route has handler: ${routeId}`);
}

const requiredPreSetupRouteIds = [
  "setup-status",
  "setup",
  "ops-health",
  "ops-routes"
];
for (const routeId of requiredPreSetupRouteIds) {
  assert(PRE_SETUP_ROUTE_IDS.has(routeId), `required pre-setup route remains allowed: ${routeId}`);
}

console.log("");
console.log("▶ route inventory");
assert(EXACT_ROUTES.every((route) => handlerRouteIdSet.has(route.id)), "all exact routes have handlers");
assert(PREFIX_ROUTES.every((route) => handlerRouteIdSet.has(route.id)), "all prefix routes have handlers");
assert(REGEX_ROUTES.every((route) => handlerRouteIdSet.has(route.id)), "all regex routes have handlers");

for (const route of EXACT_ROUTES) {
  assert(handlerRouteIdSet.has(route.id), `exact route handler: ${routeKey(route)} -> ${route.id}`);
}
for (const route of PREFIX_ROUTES) {
  assert(handlerRouteIdSet.has(route.id), `prefix route handler: ${routeKey(route)} -> ${route.id}`);
}
for (const route of REGEX_ROUTES) {
  assert(handlerRouteIdSet.has(route.id), `regex route handler: ${routeKey({ method: route.method, pattern: route.pattern.source })} -> ${route.id}`);
}

console.log("");
console.log("═══ Result ═══");
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.log("\nRoute registry contract failed. Keep route-matcher.js and api-route-registry.js in sync.");
  process.exit(1);
}

console.log("\nAll route registry checks passed.");
