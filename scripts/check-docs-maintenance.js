#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];

async function readJson(relativePath) {
  const raw = await fs.readFile(path.join(rootDir, relativePath), "utf8");
  return JSON.parse(raw);
}

async function exists(relativePath) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    return true;
  } catch {
    return false;
  }
}

const pkg = await readJson("package.json");

if (Array.isArray(pkg.lian?.docs)) {
  failures.push("package.json must not contain lian.docs. Documentation inventory is generated from docs/**/*.md by scripts/list-docs.js.");
}

if (pkg.scripts?.["docs:list"] !== "node scripts/list-docs.js") {
  failures.push("package.json must expose docs:list as: node scripts/list-docs.js");
}

if (pkg.scripts?.["check:docs"] !== "node scripts/check-docs-maintenance.js") {
  failures.push("package.json must expose check:docs as: node scripts/check-docs-maintenance.js");
}

if (!(await exists("scripts/list-docs.js"))) {
  failures.push("scripts/list-docs.js is required for automatic documentation inventory.");
}

if (!(await exists("docs/architecture/backend-health-and-guardrails.md"))) {
  failures.push("docs/architecture/backend-health-and-guardrails.md is required to summarize backend guardrails and architecture work.");
}

try {
  const output = execFileSync(process.execPath, ["scripts/list-docs.js"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (!output.includes("# LIAN Documentation Inventory")) {
    failures.push("scripts/list-docs.js did not generate the expected documentation inventory heading.");
  }
  if (!output.includes("docs/architecture/backend-health-and-guardrails.md")) {
    failures.push("Automatic docs inventory does not include docs/architecture/backend-health-and-guardrails.md.");
  }
} catch (error) {
  failures.push(`scripts/list-docs.js failed: ${error.message}`);
}

if (failures.length > 0) {
  console.error("Documentation maintenance check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Documentation maintenance check passed.");
