#!/usr/bin/env node

// Public entry checks contract test.
// Ensures verify:public and ops health use src/server/public-entry-checks.js
// as the single source of truth instead of re-declaring smoke checks.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_PUBLIC_BASE_URL,
  DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS,
  OPS_PAGE_CHECK,
  PUBLIC_ENTRY_CHECKS,
  normalizePublicBaseUrl,
  parsePositiveInteger
} from "../src/server/public-entry-checks.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const verifierPath = path.join(repoRoot, "scripts/verify-public-entry.js");
const opsServicePath = path.join(repoRoot, "src/server/ops-service.js");
const verifierSource = fs.readFileSync(verifierPath, "utf8");
const opsServiceSource = fs.readFileSync(opsServicePath, "utf8");

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

console.log("═══ Public entry checks contract test ═══\n");

console.log("▶ Shared check registry");
assert(DEFAULT_PUBLIC_BASE_URL === "https://lian.nat100.top", "default public base URL remains explicit");
assert(DEFAULT_PUBLIC_ENTRY_TIMEOUT_MS === 8000, "default timeout remains 8000ms");
assert(Array.isArray(PUBLIC_ENTRY_CHECKS), "PUBLIC_ENTRY_CHECKS is an array");
assert(PUBLIC_ENTRY_CHECKS.length >= 5, "public entry registry contains required checks");

const checkPaths = PUBLIC_ENTRY_CHECKS.map((check) => check.path);
for (const requiredPath of ["/", "/api/feed?limit=24", "/api/map/v2/items", "/api/setup/status", "/api/ops/routes"]) {
  assert(checkPaths.includes(requiredPath), `${requiredPath} remains in public entry registry`);
}

assert(OPS_PAGE_CHECK.path === "/ops.html", "ops page check remains separate from public smoke checks");
assert(OPS_PAGE_CHECK.name === "ops-page", "ops page check keeps stable name");

console.log("");
console.log("▶ Utility behavior");
assert(normalizePublicBaseUrl("https://example.com/foo?bar=1#hash") === "https://example.com", "normalizePublicBaseUrl strips path/query/hash");
assert(normalizePublicBaseUrl("https://example.com/") === "https://example.com", "normalizePublicBaseUrl strips trailing slash");
assert(parsePositiveInteger("5000", 8000) === 5000, "parsePositiveInteger accepts positive integers");
assert(parsePositiveInteger("0", 8000) === 8000, "parsePositiveInteger rejects zero");
assert(parsePositiveInteger("abc", 8000) === 8000, "parsePositiveInteger rejects non-numeric values");

console.log("");
console.log("▶ Single source usage");
assert(verifierSource.includes("../src/server/public-entry-checks.js"), "verify-public-entry imports shared public entry checks");
assert(verifierSource.includes("runPublicEntryChecks"), "verify-public-entry calls runPublicEntryChecks");
assert(!/const\s+checks\s*=\s*\[/.test(verifierSource), "verify-public-entry does not redeclare checks array");

assert(opsServiceSource.includes("./public-entry-checks.js"), "ops-service imports shared public entry checks");
assert(opsServiceSource.includes("runPublicEntryChecks"), "ops health calls runPublicEntryChecks");
assert(!/function\s+fetchText\s*\(/.test(opsServiceSource), "ops-service no longer has local public fetch helper");
assert(!/function\s+safeCheck\s*\(/.test(opsServiceSource), "ops-service no longer has local safeCheck helper");
assert(!/function\s+parseJson\s*\(/.test(opsServiceSource), "ops-service no longer has local parseJson helper");

console.log("");
console.log("═══ Result ═══");
console.log(`passed: ${passed}, failed: ${failed}`);

if (failed > 0) {
  console.log("\nPublic entry checks contract failed. Keep public-entry-checks.js as the single source of truth.");
  process.exit(1);
}

console.log("\nAll public entry checks contract checks passed.");
