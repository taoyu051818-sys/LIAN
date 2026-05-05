#!/usr/bin/env node

// NodeBB integration boundary contract.
// Runtime code must use src/server/nodebb-client.js instead of directly
// constructing NodeBB URLs, auth headers, or fetch calls from handlers.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverRoot = path.join(repoRoot, "src/server");
const nodebbClientPath = path.join(serverRoot, "nodebb-client.js");

const allowedRuntimeFiles = new Set([
  path.relative(repoRoot, nodebbClientPath).replace(/\\/g, "/"),
  "src/server/config.js"
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

function hasDirectNodebbRuntimeAccess(source) {
  const suspiciousPatterns = [
    /fetch\s*\([\s\S]{0,160}nodebb/i,
    /fetch\s*\([\s\S]{0,160}config\.nodebbBaseUrl/i,
    /new\s+URL\s*\([\s\S]{0,160}config\.nodebbBaseUrl/i,
    /x-api-token/i,
    /NODEBB_API_TOKEN/,
    /NODEBB_BASE_URL/
  ];
  return suspiciousPatterns.some((pattern) => pattern.test(source));
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
const violations = [];
for (const filePath of listJsFiles(serverRoot)) {
  const rel = relative(filePath);
  if (allowedRuntimeFiles.has(rel)) continue;
  const source = fs.readFileSync(filePath, "utf8");
  if (hasDirectNodebbRuntimeAccess(source)) violations.push(rel);
}

assert(
  violations.length === 0,
  "runtime files do not bypass nodebb-client for NodeBB access",
  violations.length ? `violations: ${violations.join(", ")}` : ""
);

console.log("");
console.log("▶ accepted integration pattern");
const runtimeSources = listJsFiles(serverRoot)
  .filter((filePath) => !allowedRuntimeFiles.has(relative(filePath)))
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
assert(runtimeSources.includes("nodebbFetch") || runtimeSources.includes("withNodebbUid"), "runtime code integrates with NodeBB via exported client helpers");

console.log("");
console.log("═══ Result ═══");
console.log(`passed: ${passed}, failed: ${failed}`);

if (failed > 0) {
  console.log("\nNodeBB boundary contract failed. Runtime code must go through src/server/nodebb-client.js.");
  process.exit(1);
}

console.log("\nAll NodeBB boundary checks passed.");
