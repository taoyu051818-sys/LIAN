#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SCAN_ROOTS = ["server.js", "src/server", "scripts"];
const SKIP_PATH_PREFIXES = [
  "scripts/legacy/",
  "scripts/check-code-smells.js"
];
const SKIP_DIR_NAMES = new Set([".git", "node_modules", "outputs"]);
const SCAN_EXTENSIONS = new Set([".js", ".mjs", ".cjs"]);

const rules = [
  {
    id: "no-number-process-env",
    severity: "error",
    message: "Do not parse env numbers with Number(process.env.*). Use parsePositiveInteger/parseNonNegativeInteger from src/server/config-schema.js.",
    test: (line) => /\bNumber\s*\(\s*process\.env\./.test(line)
  },
  {
    id: "no-parseint-process-env",
    severity: "error",
    message: "Do not parse env numbers with parseInt/parseFloat(process.env.*). Use config-schema helpers instead.",
    test: (line) => /\bparse(?:Int|Float)\s*\(\s*process\.env\./.test(line)
  },
  {
    id: "no-single-trailing-slash-normalize",
    severity: "error",
    message: "Do not normalize URLs with .replace(/\\/$/, ...). Use normalizeBaseUrl or .replace(/\\/+$/, ...) for repeated trailing slashes.",
    test: (line) => line.includes(".replace(/\\/$/,") || line.includes(".replace(/\\/$/, ")
  },
  {
    id: "no-child-process-shell-sync",
    severity: "error",
    message: "Do not use execSync for validation or tooling. Use execFileSync/spawnSync with argument arrays instead.",
    test: (line) => /\bexecSync\s*\(/.test(line)
  },
  {
    id: "no-child-process-shell-exec",
    severity: "error",
    message: "Do not use exec() shell commands. Use execFile/spawn with argument arrays instead.",
    test: (line) => /\bexec\s*\(/.test(line)
  }
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function shouldSkip(relativePath) {
  const normalized = toPosix(relativePath);
  if (SKIP_PATH_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))) {
    return true;
  }
  return false;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(entryPath, relativePath = "") {
  if (shouldSkip(relativePath)) return [];

  const stats = await fs.lstat(entryPath);
  if (stats.isDirectory()) {
    if (SKIP_DIR_NAMES.has(path.basename(entryPath))) return [];
    const entries = await fs.readdir(entryPath);
    const files = [];
    for (const entry of entries) {
      files.push(...await collectFiles(path.join(entryPath, entry), path.join(relativePath, entry)));
    }
    return files;
  }

  if (!stats.isFile()) return [];
  if (!SCAN_EXTENSIONS.has(path.extname(entryPath))) return [];
  return [{ absolutePath: entryPath, relativePath: toPosix(relativePath) }];
}

async function collectScanFiles() {
  const files = [];
  for (const root of SCAN_ROOTS) {
    const absolutePath = path.join(rootDir, root);
    if (!(await exists(absolutePath))) continue;
    files.push(...await collectFiles(absolutePath, root));
  }
  return files;
}

async function checkFile(file) {
  const content = await fs.readFile(file.absolutePath, "utf8");
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    for (const rule of rules) {
      if (rule.test(line)) {
        findings.push({
          path: file.relativePath,
          line: index + 1,
          rule: rule.id,
          severity: rule.severity,
          message: rule.message,
          source: line.trim()
        });
      }
    }
  }
  return findings;
}

const files = await collectScanFiles();
const findings = [];
for (const file of files) {
  findings.push(...await checkFile(file));
}

if (findings.length === 0) {
  console.log(`Code smell guard passed (${files.length} files checked).`);
  process.exit(0);
}

console.error("Code smell guard failed:");
for (const finding of findings) {
  console.error(`- ${finding.path}:${finding.line} [${finding.rule}] ${finding.message}`);
  console.error(`  ${finding.source}`);
}
process.exit(1);
