#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EXACT_ROUTES, PREFIX_ROUTES, REGEX_ROUTES } from "../src/server/route-matcher.js";
import { OPS_PAGE_CHECK, PUBLIC_ENTRY_CHECKS } from "../src/server/public-entry-checks.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(repoRoot, "docs", "ops", "generated-automation-contracts.md");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

function escapePipe(value = "") {
  return String(value).replace(/\|/g, "\\|");
}

function table(headers, rows) {
  const header = `| ${headers.map(escapePipe).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapePipe).join(" | ")} |`).join("\n");
  return [header, separator, body].filter(Boolean).join("\n");
}

function listWorkflowFiles() {
  const workflowsDir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(workflowsDir)) return [];
  return fs.readdirSync(workflowsDir)
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    .sort();
}

function selectedScripts() {
  const scripts = packageJson.scripts || {};
  const prefixes = ["check", "test", "verify", "audit", "docs"];
  return Object.entries(scripts)
    .filter(([name]) => prefixes.some((prefix) => name === prefix || name.startsWith(`${prefix}:`)))
    .sort(([a], [b]) => a.localeCompare(b));
}

function publicChecks() {
  return [OPS_PAGE_CHECK, ...PUBLIC_ENTRY_CHECKS].sort((a, b) => a.name.localeCompare(b.name));
}

function generateMarkdown() {
  const now = "generated from repository source of truth";
  const lines = [];

  lines.push("# LIAN automation contracts");
  lines.push("");
  lines.push("<!-- AUTO-GENERATED: do not edit by hand. Run `npm run docs:generate`. -->");
  lines.push("");
  lines.push(`Source: ${now}.`);
  lines.push("");
  lines.push("This document is generated from executable project state so operational docs do not drift from code.");
  lines.push("");

  lines.push("## Verification scripts");
  lines.push("");
  lines.push(table(["script", "command"], selectedScripts().map(([name, command]) => [`npm run ${name}`, command])));
  lines.push("");

  lines.push("## GitHub Actions workflows");
  lines.push("");
  const workflows = listWorkflowFiles();
  lines.push(workflows.length ? workflows.map((file) => `- \`.github/workflows/${file}\``).join("\n") : "_No workflows found._");
  lines.push("");

  lines.push("## Exact API routes");
  lines.push("");
  lines.push(table(["method", "path", "route id"], EXACT_ROUTES.map((route) => [route.method, route.path, route.id])));
  lines.push("");

  lines.push("## Prefix API routes");
  lines.push("");
  lines.push(table(["prefix", "route id"], PREFIX_ROUTES.map((route) => [route.prefix, route.id])));
  lines.push("");

  lines.push("## Regex API routes");
  lines.push("");
  lines.push(table(["method", "pattern", "route id", "params"], REGEX_ROUTES.map((route) => [route.method, route.pattern.toString(), route.id, route.keys.join(", ")])));
  lines.push("");

  lines.push("## Public entry checks");
  lines.push("");
  lines.push(table(["name", "path", "expects JSON"], publicChecks().map((check) => [check.name, check.path, check.expectJson ? "yes" : "no"])));
  lines.push("");

  lines.push("## Maintenance contract");
  lines.push("");
  lines.push("- Update source registries first, not this file.");
  lines.push("- Run `npm run docs:generate` after changing route, public entry, workflow, or verification script facts.");
  lines.push("- CI should run `npm run docs:check-generated` to block stale generated documentation.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const next = generateMarkdown();
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";

  if (checkOnly) {
    if (current !== next) {
      console.error("Generated automation docs are stale. Run `npm run docs:generate`.");
      process.exit(1);
    }
    console.log("Generated automation docs are up to date.");
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, next, "utf8");
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
}

main();
