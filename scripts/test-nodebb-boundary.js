#!/usr/bin/env node

// NodeBB integration boundary contract.
// Runtime code and active npm script entrypoints must use src/server/nodebb-client.js
// instead of directly constructing NodeBB URLs, auth headers, or fetch calls.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = path.join(repoRoot, "src/server");
const nodebbClientPath = path.join(serverRoot, "nodebb-client.js");
const packageJsonPath = path.join(repoRoot, "package.json");

const allowedRuntimeFiles = new Set([
  path.relative(repoRoot, nodebbClientPath).replace(/\\/g, "/"),
  "src/server/config.js"
]);

const allowedActiveScriptFiles = new Set([
  "scripts/test-nodebb-boundary.js"
]);

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

function listJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listJsFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(fullPath);
  }
  return files;
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function hasDirectNodebbAccess(source) {
  const suspiciousPatterns = [
    /fetch\s*\([\s\S]{0,160}nodebb/i,
    /fetch\s*\([\s\S]{0,160}config\.nodebbBaseUrl/i,
    /new\s+URL\s*\([\s\S]{0,160}config\.nodebbBaseUrl/i,
    /x-api-token/i,
    /authorization:\s*`Bearer\s*\$\{[^}]*nodebbToken[^}]*\}`/i,
    /NODEBB_API_TOKEN/,
    /NODEBB_BASE_URL/,
    /function\s+bbFetch\s*\(/,
    /async\s+function\s+bbFetch\s*\(/
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(source));
}

function activeNpmScriptFiles() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const scriptValues = Object.values(packageJson.scripts || {});
  const scriptFiles = new Set();
  for (const value of scriptValues) {
    const command = String(value || "");
    for (const match of command.matchAll(/(?:^|\s)(?:node\s+)?(scripts\/[A-Za-z0-9._/-]+\.js)(?=$|\s)/g)) {
      scriptFiles.add(match[1]);
    }
  }
  return [...scriptFiles].sort();
}

console.log("═══ NodeBB boundary contract test ═══\n");

console.log("▶ nodebb-client shape");
const clientSource = fs.readFileSync(nodebbClientPath, "utf8");
assert(clientSource.includes("async function nodebbFetch"), "nodebbFetch remains the runtime HTTP gateway");
assert(clientSource.includes("function withNodebbUid"), "withNodebbUid remains the UID path helper");
assert(clientSource.includes("function addUid"), "addUid remains centralized in nodebb-client");
assert(clientSource.includes("x-api-token"), "NodeBB token header is centralized in nodebb-client");
assert(clientSource.includes("config.nodebbBaseUrl"), "NodeBB base URL is consumed by nodebb-client");

console.log("");
console.log("▶ runtime boundary");
const runtimeViolations = [];
for (const filePath of listJsFiles(serverRoot)) {
  const rel = relative(filePath);
  if (allowedRuntimeFiles.has(rel)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  if (hasDirectNodebbAccess(source)) runtimeViolations.push(rel);
}

assert(
  runtimeViolations.length === 0,
  "runtime files do not bypass nodebb-client for NodeBB access",
  runtimeViolations.length ? `violations: ${runtimeViolations.join(", ")}` : ""
);

console.log("");
console.log("▶ active npm script boundary");
const activeScripts = activeNpmScriptFiles();
const activeScriptViolations = [];
for (const rel of activeScripts) {
  if (allowedActiveScriptFiles.has(rel)) continue;
  const filePath = path.join(repoRoot, rel);
  if (!fs.existsSync(filePath)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  if (hasDirectNodebbAccess(source)) activeScriptViolations.push(rel);
}

assert(activeScripts.length > 0, "active npm script files are discovered from package.json", JSON.stringify(activeScripts));
assert(
  activeScriptViolations.length === 0,
  "active npm scripts do not bypass nodebb-client for NodeBB access",
  activeScriptViolations.length ? `violations: ${activeScriptViolations.join(", ")}` : ""
);

console.log("");
console.log("▶ accepted integration pattern");
const runtimeSources = listJsFiles(serverRoot)
  .filter((filePath) => !allowedRuntimeFiles.has(relative(filePath)))
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
assert(runtimeSources.includes("nodebbFetch") || runtimeSources.includes("withNodebbUid"), "runtime code integrates with NodeBB via exported client helpers");

const activeScriptSources = activeScripts
  .filter((rel) => !allowedActiveScriptFiles.has(rel))
  .filter((rel) => fs.existsSync(path.join(repoRoot, rel)))
  .map((rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8"))
  .join("\n");
assert(
  activeScriptSources.includes("nodebb-client.js") || !activeScriptSources.includes("NodeBB"),
  "active NodeBB scripts integrate via nodebb-client helpers"
);

console.log("");
console.log("═══ Result ═══");
console.log(`passed: ${passed}, failed: ${failed}`);

if (failed > 0) {
  console.log("\nNodeBB boundary contract failed. Runtime and active npm scripts must go through src/server/nodebb-client.js.");
  process.exit(1);
}

console.log("\nAll NodeBB boundary checks passed.");
