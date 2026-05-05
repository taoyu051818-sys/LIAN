import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
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

const jsonFiles = [
  "data/alias-pool.json",
  "data/clubs.json",
  "data/feed-rules.json",
  "data/locations.json",
  "data/map-v2-layers.json",
  "data/post-metadata.json",
  "data/study-hn-club-discoveries.json"
];

const jsFilesToSyntaxCheck = [
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

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, reason) {
  failed += 1;
  console.log(`  ✗ ${label} — ${reason}`);
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
    ok(`${file} (JSON 合法)`);
  } catch (error) {
    fail(`${file} (JSON)`, error.message);
  }
}

function checkSyntax(file) {
  const fullPath = path.join(rootDir, file);
  try {
    execFileSync(process.execPath, ["--check", fullPath], { stdio: "pipe" });
    ok(`${file} (语法正确)`);
  } catch {
    fail(`${file} (语法检查)`, "node --check 失败");
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
      ok(`${entry} excluded`);
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
      ok(`${entry} excluded`);
    }
  }
}

console.log("\n═══ LIAN backend repo structure check ═══\n");

console.log("▶ Backend required files");
for (const file of requiredFiles) {
  await checkFileExists(file);
}

console.log("\n▶ Backend JSON data files");
for (const file of jsonFiles) {
  await checkJsonValid(file);
}

console.log("\n▶ Backend JS syntax check");
for (const file of jsFilesToSyntaxCheck) {
  checkSyntax(file);
}

console.log("\n▶ Split boundary exclusions");
await checkNoFrontendRuntimeFiles();
await checkNoLocalRuntimeData();

console.log(`\n═══ Result: ${passed} passed, ${failed} failed ═══\n`);

if (failed > 0) process.exit(1);
