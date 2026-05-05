#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetArg = process.argv[2] || "outputs/lian-platform-server-export";
const targetDir = path.resolve(process.cwd(), targetArg);

const COPY_ENTRIES = [
  "server.js",
  "src",
  "data",
  "scripts",
  "test",
  "docs",
  "package.json",
  "package-lock.json",
  ".env.example",
  ".gitignore",
  "CLAUDE.md",
  "README.md"
];

const FRONTEND_ONLY_PATHS = new Set([
  "public",
  "scripts/smoke-frontend.js"
]);

const BACKEND_DATA_ALLOWLIST = new Set([
  "data/alias-pool.json",
  "data/clubs.json",
  "data/feed-rules.json",
  "data/locations.json",
  "data/map-v2-layers.json",
  "data/post-metadata.json",
  "data/study-hn-club-discoveries.json"
]);

const BACKEND_REQUIRED_FILES = [
  "server.js",
  "src/server/api-router.js",
  "src/server/route-matcher.js",
  "src/server/post-service.js",
  "src/server/nodebb-client.js",
  "src/server/feed-service.js",
  "src/server/auth-service.js",
  "src/server/config.js",
  "src/server/data-store.js",
  "src/server/content-utils.js",
  "src/server/cache.js",
  "src/server/paths.js",
  "data/feed-rules.json",
  "data/post-metadata.json",
  "package.json",
  "CLAUDE.md"
];

const BACKEND_JSON_FILES = [
  "data/alias-pool.json",
  "data/clubs.json",
  "data/feed-rules.json",
  "data/locations.json",
  "data/map-v2-layers.json",
  "data/post-metadata.json",
  "data/study-hn-club-discoveries.json"
];

const BACKEND_JS_SYNTAX_FILES = [
  "server.js",
  "src/server/api-router.js",
  "src/server/route-matcher.js",
  "src/server/post-service.js",
  "src/server/nodebb-client.js",
  "src/server/feed-service.js",
  "src/server/auth-service.js",
  "src/server/auth-routes.js",
  "src/server/ai-post-preview.js",
  "src/server/ai-light-publish.js",
  "src/server/channel-service.js",
  "src/server/admin-routes.js",
  "src/server/config.js",
  "src/server/data-store.js",
  "src/server/content-utils.js",
  "src/server/image-proxy.js",
  "src/server/upload.js",
  "src/server/cache.js",
  "src/server/paths.js",
  "src/server/http-response.js",
  "src/server/request-utils.js",
  "src/server/static-data.js",
  "src/server/static-server.js",
  "src/server/setup-page.js",
  "src/server/task-board-service.js",
  "scripts/validate-backend-structure.js"
];

const SECRET_FILE_PATTERNS = [
  /^\.env$/,
  /^\.env\.(?!example$).+/,
  /(^|\/)auth-users(?:\.|$)/,
  /(^|\/)sessions(?:\.|$)/,
  /(^|\/)email-codes(?:\.|$)/,
  /(^|\/)user-cache(?:\.|$)/
];

const GENERATED_RUNTIME_PATTERNS = [
  /(^|\/)ai-post-drafts\.jsonl$/,
  /(^|\/)ai-post-records\.jsonl$/,
  /(^|\/)channel-reads\.json$/,
  /(^|\/)post-metadata\..*(backup|conflict).*\.json$/,
  /(^|\/).*\.backup\.[^/]+$/,
  /(^|\/).*server-backup\.[^/]+$/,
  /(^|\/).*conflict-backup\.[^/]+$/
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function isGeneratedOrRuntimePath(normalized) {
  if (normalized === "outputs" || normalized.startsWith("outputs/")) return true;
  if (normalized.startsWith("data/") && !BACKEND_DATA_ALLOWLIST.has(normalized)) return true;
  return GENERATED_RUNTIME_PATTERNS.some((pattern) => pattern.test(normalized));
}

function shouldSkip(relativePath) {
  const normalized = toPosix(relativePath);
  if (!normalized) return false;
  if (FRONTEND_ONLY_PATHS.has(normalized)) return true;
  if (normalized === "public" || normalized.startsWith("public/")) return true;
  if (normalized === ".git" || normalized.startsWith(".git/")) return true;
  if (normalized === "node_modules" || normalized.startsWith("node_modules/")) return true;
  if (normalized === targetArg || normalized.startsWith(`${targetArg}/`)) return true;
  if (SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (isGeneratedOrRuntimePath(normalized)) return true;
  return false;
}

function classifySkipped(relativePath) {
  const normalized = toPosix(relativePath);
  if (FRONTEND_ONLY_PATHS.has(normalized) || normalized === "public" || normalized.startsWith("public/")) return "frontend-only";
  if (SECRET_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) return "secret-or-local-runtime";
  if (normalized === "outputs" || normalized.startsWith("outputs/")) return "generated-output";
  if (normalized.startsWith("data/") && !BACKEND_DATA_ALLOWLIST.has(normalized)) return "local-runtime-or-backup-data";
  if (GENERATED_RUNTIME_PATTERNS.some((pattern) => pattern.test(normalized))) return "generated-runtime";
  return "skipped";
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureParent(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function copyPath(sourcePath, destPath, relativePath, manifest) {
  const stats = await fs.lstat(sourcePath);
  if (shouldSkip(relativePath)) {
    manifest.skipped.push({ path: toPosix(relativePath), reason: classifySkipped(relativePath) });
    return;
  }

  if (stats.isDirectory()) {
    await fs.mkdir(destPath, { recursive: true });
    const entries = await fs.readdir(sourcePath);
    for (const entry of entries) {
      await copyPath(
        path.join(sourcePath, entry),
        path.join(destPath, entry),
        path.join(relativePath, entry),
        manifest
      );
    }
    return;
  }

  if (!stats.isFile()) {
    manifest.skipped.push({ path: toPosix(relativePath), reason: "not-regular-file" });
    return;
  }

  await ensureParent(destPath);
  await fs.copyFile(sourcePath, destPath);
  manifest.copied.push({ path: toPosix(relativePath), bytes: stats.size });
}

async function writeBackendPackageJson(manifest) {
  const packagePath = path.join(targetDir, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf8"));
  packageJson.name = "lian-platform-server";
  packageJson.description = "Backend runtime for LIAN";
  packageJson.private = true;
  packageJson.scripts = {
    ...packageJson.scripts,
    check: "node scripts/validate-backend-structure.js && node scripts/check-encoding-contamination.js",
    "check:backend": "node scripts/validate-backend-structure.js",
    "check:encoding": "node scripts/check-encoding-contamination.js",
    test: "node --test test/*.test.mjs",
    "test:routes": "node scripts/test-routes.js"
  };
  const content = `${JSON.stringify(packageJson, null, 2)}\n`;
  await fs.writeFile(packagePath, content, "utf8");
  const stats = await fs.stat(packagePath);
  manifest.generated.push({ path: "package.json", bytes: stats.size, reason: "backend package metadata and scripts" });
}

async function writeBackendValidationScript(manifest) {
  const validatorPath = path.join(targetDir, "scripts", "validate-backend-structure.js");
  const content = `import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = ${JSON.stringify(BACKEND_REQUIRED_FILES, null, 2)};

const jsonFiles = ${JSON.stringify(BACKEND_JSON_FILES, null, 2)};

const jsFilesToSyntaxCheck = ${JSON.stringify(BACKEND_JS_SYNTAX_FILES, null, 2)};

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(\`  ✓ \${label}\`);
}

function fail(label, reason) {
  failed += 1;
  console.log(\`  ✗ \${label} — \${reason}\`);
}

async function checkFileExists(file) {
  const fullPath = path.join(rootDir, file);
  try {
    await fs.access(fullPath);
    ok(file);
  } catch {
    fail(file, "文件不存在");
  }
}

async function checkJsonValid(file) {
  const fullPath = path.join(rootDir, file);
  try {
    const raw = await fs.readFile(fullPath, "utf8");
    JSON.parse(raw);
    ok(\`\${file} (JSON 合法)\`);
  } catch (error) {
    fail(\`\${file} (JSON)\`, error.message);
  }
}

function checkSyntax(file) {
  const fullPath = path.join(rootDir, file);
  try {
    execFileSync(process.execPath, ["--check", fullPath], { stdio: "pipe" });
    ok(\`\${file} (语法正确)\`);
  } catch {
    fail(\`\${file} (语法检查)\`, "node --check 失败");
  }
}

async function checkNoFrontendRuntimeFiles() {
  const disallowed = [
    "public",
    "scripts/smoke-frontend.js"
  ];
  for (const entry of disallowed) {
    const fullPath = path.join(rootDir, entry);
    try {
      await fs.access(fullPath);
      fail(entry, "不应出现在 backend bootstrap repo");
    } catch {
      ok(\`\${entry} excluded\`);
    }
  }
}

async function checkNoLocalRuntimeData() {
  const disallowed = [
    "data/auth-users.json",
    "data/user-cache.json",
    "data/channel-reads.json",
    "data/ai-post-drafts.jsonl",
    "data/ai-post-records.jsonl"
  ];
  for (const entry of disallowed) {
    const fullPath = path.join(rootDir, entry);
    try {
      await fs.access(fullPath);
      fail(entry, "不应出现在 backend bootstrap repo");
    } catch {
      ok(\`\${entry} excluded\`);
    }
  }
}

console.log("\\n═══ LIAN backend repo structure check ═══\\n");

console.log("▶ Backend required files");
for (const file of requiredFiles) {
  await checkFileExists(file);
}

console.log("\\n▶ Backend JSON data files");
for (const file of jsonFiles) {
  await checkJsonValid(file);
}

console.log("\\n▶ Backend JS syntax check");
for (const file of jsFilesToSyntaxCheck) {
  checkSyntax(file);
}

console.log("\\n▶ Split boundary exclusions");
await checkNoFrontendRuntimeFiles();
await checkNoLocalRuntimeData();

console.log(\`\\n═══ Result: \${passed} passed, \${failed} failed ═══\\n\`);

if (failed > 0) process.exit(1);
`;
  await ensureParent(validatorPath);
  await fs.writeFile(validatorPath, content, "utf8");
  const stats = await fs.stat(validatorPath);
  manifest.generated.push({ path: "scripts/validate-backend-structure.js", bytes: stats.size, reason: "backend-only structure validation" });
}

async function writeBackendReadme(manifest) {
  const content = [
    "# lian-platform-server bootstrap export",
    "",
    "This directory was generated from the source repository by:",
    "",
    "```bash",
    `node scripts/prepare-backend-repo-export.js ${targetArg}`,
    "```",
    "",
    "## Purpose",
    "",
    "This is the non-destructive Phase 1 backend repo bootstrap workspace for LIAN. It preserves the current backend runtime behavior first; it does not migrate framework, database, feed ranking, auth, or publish behavior.",
    "",
    "## Expected first validation",
    "",
    "Run from this export directory after installing any dependencies needed by the deployment environment:",
    "",
    "```bash",
    "node --check server.js",
    "find src/server -maxdepth 2 -name '*.js' -print0 | xargs -0 -n1 node --check",
    "npm test",
    "npm run check",
    "npm run test:routes",
    "node --test test/audience-regression.test.mjs",
    "```",
    "",
    "`npm run check` in this export is intentionally backend-only. It uses `scripts/validate-backend-structure.js` and does not require `public/*` frontend files.",
    "",
    "## Split boundary",
    "",
    "- Backend owns: `server.js`, `src/server/*`, selected `data/*.json`, backend validators/tests, NodeBB integration, AI adapters, auth/session, upload/image proxy, feed, map data/admin APIs, and metadata writes.",
    "- Frontend repo keeps: `public/*`, `scripts/smoke-frontend.js`, and `docs/agent/contracts/api-contract.md`.",
    "",
    "## Data export policy",
    "",
    "The initial backend import includes only source-of-truth/config data files:",
    "",
    "- `data/alias-pool.json`",
    "- `data/clubs.json`",
    "- `data/feed-rules.json`",
    "- `data/locations.json`",
    "- `data/map-v2-layers.json`",
    "- `data/post-metadata.json`",
    "- `data/study-hn-club-discoveries.json`",
    "",
    "It deliberately excludes frontend static files, local secrets/runtime-only files, generated JSONL records, channel reads, backup/conflict files, and `outputs/` artifacts.",
    "",
    "## Manifest",
    "",
    "See `repo-split-manifest.json` for copied, skipped, and generated paths.",
    "",
    `Generated at: ${manifest.generatedAt}`,
    `Source root: ${rootDir}`,
    ""
  ].join("\n");
  await fs.writeFile(path.join(targetDir, "BACKEND_BOOTSTRAP.md"), content, "utf8");
}

async function writeManifest(manifest) {
  await fs.writeFile(
    path.join(targetDir, "repo-split-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
}

async function main() {
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceRoot: rootDir,
    targetDir,
    copied: [],
    skipped: [],
    generated: [],
    missing: []
  };

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  for (const entry of COPY_ENTRIES) {
    const sourcePath = path.join(rootDir, entry);
    if (!(await exists(sourcePath))) {
      manifest.missing.push(entry);
      continue;
    }
    await copyPath(sourcePath, path.join(targetDir, entry), entry, manifest);
  }

  await writeBackendPackageJson(manifest);
  await writeBackendValidationScript(manifest);
  await writeBackendReadme(manifest);
  await writeManifest(manifest);

  console.log(`Backend bootstrap export written to ${targetDir}`);
  console.log(`Copied files: ${manifest.copied.length}`);
  console.log(`Skipped paths: ${manifest.skipped.length}`);
  console.log(`Generated files: ${manifest.generated.length}`);
  if (manifest.missing.length) console.log(`Missing optional entries: ${manifest.missing.join(", ")}`);
  console.log("Next: copy this directory into the private lian-platform-server repository, then run the validation commands in BACKEND_BOOTSTRAP.md.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
