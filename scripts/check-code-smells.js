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

function isRuntimeFile(relativePath) {
  return relativePath === "server.js" || relativePath.startsWith("src/server/");
}

function windowText(lines, index, lookahead = 6) {
  return lines.slice(index, Math.min(lines.length, index + lookahead)).join("\n");
}

function lineIsProbablyComment(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function lineIsProbablyStringLiteral(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("'") || trimmed.startsWith('"') || trimmed.startsWith("`");
}

const rules = [
  {
    id: "no-number-process-env",
    severity: "error",
    message: "Do not parse env numbers with Number(process.env.*). Use parsePositiveInteger/parseNonNegativeInteger from src/server/config-schema.js.",
    test: ({ line, relativePath }) => isRuntimeFile(relativePath) && /\bNumber\s*\(\s*process\.env\./.test(line)
  },
  {
    id: "no-parseint-process-env",
    severity: "error",
    message: "Do not parse env numbers with parseInt/parseFloat(process.env.*). Use config-schema helpers instead.",
    test: ({ line, relativePath }) => isRuntimeFile(relativePath) && /\bparse(?:Int|Float)\s*\(\s*process\.env\./.test(line)
  },
  {
    id: "no-single-trailing-slash-normalize",
    severity: "error",
    message: "Do not normalize URLs with .replace(/\\/$/, ...). Use normalizeBaseUrl or .replace(/\\/+$/, ...) for repeated trailing slashes.",
    test: ({ line }) => line.includes(".replace(/\\/$/,") || line.includes(".replace(/\\/$/, ")
  },
  {
    id: "no-child-process-shell-sync",
    severity: "error",
    message: "Do not use execSync for validation or tooling. Use execFileSync/spawnSync with argument arrays instead.",
    test: ({ line }) => /\bexecSync\s*\(/.test(line)
  },
  {
    id: "no-child-process-shell-exec",
    severity: "error",
    message: "Do not use exec() shell commands. Use execFile/spawn with argument arrays instead.",
    test: ({ line }) => /(^|[^.\w$])exec\s*\(/.test(line)
  },
  {
    id: "no-sync-fs-in-runtime",
    severity: "error",
    message: "Do not use synchronous fs APIs in runtime server code. Use node:fs/promises or move blocking work to scripts.",
    test: ({ line, relativePath }) => isRuntimeFile(relativePath) && /\b(?:readFileSync|writeFileSync|appendFileSync|existsSync|mkdirSync|rmSync|readdirSync|statSync)\s*\(/.test(line)
  },
  {
    id: "no-json-stringify-clone",
    severity: "error",
    message: "Do not deep-clone with JSON.parse(JSON.stringify(...)). Use structuredClone or an explicit mapper to avoid data loss.",
    test: ({ line }) => /JSON\.parse\s*\(\s*JSON\.stringify\s*\(/.test(line)
  },
  {
    id: "no-async-promise-constructor",
    severity: "error",
    message: "Do not use new Promise(async ...). It hides errors and complicates control flow; use async functions directly.",
    test: ({ line }) => /new\s+Promise\s*\(\s*async\b/.test(line)
  },
  {
    id: "no-empty-catch",
    severity: "warn",
    message: "Avoid empty catch blocks. Add a comment explaining why it is safe, or handle/log the expected error class.",
    test: ({ line }) => /\bcatch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /\bcatch\s*\{\s*\}/.test(line)
  },
  {
    id: "fetch-should-use-timeout",
    severity: "warn",
    message: "Runtime fetch calls should pass a signal/timeout. Use AbortSignal.timeout(...) or a caller-provided signal.",
    test: ({ line, lines, index, relativePath }) => {
      if (!isRuntimeFile(relativePath)) return false;
      if (!/\bfetch\s*\(/.test(line)) return false;
      const block = windowText(lines, index, 8);
      return !/\bsignal\s*:|AbortSignal\.timeout|withTimeout|controller\.signal/.test(block);
    }
  },
  {
    id: "no-silent-process-exit",
    severity: "warn",
    message: "Avoid process.exit(...) outside CLI scripts. Throw errors or return status through the caller where possible.",
    test: ({ line, relativePath }) => isRuntimeFile(relativePath) && /\bprocess\.exit\s*\(/.test(line)
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
    if (lineIsProbablyComment(line) || lineIsProbablyStringLiteral(line)) continue;
    for (const rule of rules) {
      if (rule.test({ line, lines, index, relativePath: file.relativePath })) {
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

function printFinding(finding) {
  const label = finding.severity === "error" ? "ERROR" : "WARN";
  console.error(`- ${finding.path}:${finding.line} [${label} ${finding.rule}] ${finding.message}`);
  console.error(`  ${finding.source}`);
}

const files = await collectScanFiles();
const findings = [];
for (const file of files) {
  findings.push(...await checkFile(file));
}

const errors = findings.filter((finding) => finding.severity === "error");
const warnings = findings.filter((finding) => finding.severity !== "error");

if (findings.length === 0) {
  console.log(`Code smell guard passed (${files.length} files checked).`);
  process.exit(0);
}

if (errors.length > 0) {
  console.error("Code smell guard failed:");
  for (const finding of errors) printFinding(finding);
}

if (warnings.length > 0) {
  console.error("Code smell guard warnings:");
  for (const finding of warnings) printFinding(finding);
}

if (errors.length > 0) {
  process.exit(1);
}

console.log(`Code smell guard passed with ${warnings.length} warning(s) (${files.length} files checked).`);
