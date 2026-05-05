#!/usr/bin/env node

// Ops action registry contract test.
// This verifies the single source of truth: OPS_ACTION_DEFINITIONS.
// It is read-only and never executes any ops action script.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const opsServicePath = path.join(repoRoot, "src/server/ops-service.js");
const source = fs.readFileSync(opsServicePath, "utf8");

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

function extractRegistryBlock() {
  const start = source.indexOf("const OPS_ACTION_DEFINITIONS = Object.freeze([");
  if (start < 0) return "";
  const end = source.indexOf("]);", start);
  if (end < 0) return "";
  return source.slice(start, end + 3);
}

function unique(values) {
  return [...new Set(values)];
}

function duplicateValues(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

console.log("═══ Ops action registry contract test ═══\n");

const registry = extractRegistryBlock();
assert(Boolean(registry), "OPS_ACTION_DEFINITIONS registry exists");

const actions = [...registry.matchAll(/action:\s*"([^"]+)"/g)].map((match) => match[1]);
const labels = [...registry.matchAll(/label:\s*"([^"]+)"/g)].map((match) => match[1]);
const scriptBindings = [...registry.matchAll(/script:\s*([^,\n}]+)/g)].map((match) => match[1].trim());
const deployRepos = [...registry.matchAll(/"(taoyu051818-sys\/[^"]+)"/g)].map((match) => match[1]);

console.log("▶ Registry shape");
assert(actions.length > 0, "actions are declared", JSON.stringify({ actions }));
assert(actions.length === labels.length, "each action has a label", JSON.stringify({ actions: actions.length, labels: labels.length }));
assert(actions.length === scriptBindings.length, "each action has a script binding", JSON.stringify({ actions: actions.length, scriptBindings: scriptBindings.length }));
assert(duplicateValues(actions).length === 0, "action names are unique", `duplicates: ${duplicateValues(actions).join(", ")}`);
assert(duplicateValues(deployRepos).length === 0, "deploy repositories map to one action only", `duplicates: ${duplicateValues(deployRepos).join(", ")}`);

console.log("");
console.log("▶ Required action baseline");
const requiredActions = [
  "restart-frontend",
  "restart-backend",
  "restart-all",
  "update-frontend",
  "update-backend",
  "update-all",
  "set-security-development",
  "set-security-production"
];
for (const action of requiredActions) {
  assert(actions.includes(action), `${action} remains declared`);
}

console.log("");
console.log("▶ Deploy webhook mapping baseline");
assert(deployRepos.includes("taoyu051818-sys/lian-mobile-web"), "frontend repository deploy mapping remains declared");
assert(deployRepos.includes("taoyu051818-sys/lian-platform-server"), "backend repository deploy mapping remains declared");

console.log("");
console.log("▶ Removed duplicate sources");
assert(!/const\s+OPS_ACTIONS\s*=/.test(source), "legacy OPS_ACTIONS whitelist is removed");
assert(!/function\s+scriptForAction\s*\(/.test(source), "legacy scriptForAction switch is removed");
assert(!/const\s+DEPLOY_REPO_ACTIONS\s*=\s*new\s+Map\s*\(\s*\[/.test(source), "deploy repo mapping is derived, not hard-coded as a second table");

console.log("");
console.log("═══ Result ═══");
console.log(`passed: ${passed}, failed: ${failed}`);

if (failed > 0) {
  console.log("\nOps action registry contract failed. Keep OPS_ACTION_DEFINITIONS as the single source of truth.");
  process.exit(1);
}

console.log("\nAll ops action registry contract checks passed.");
