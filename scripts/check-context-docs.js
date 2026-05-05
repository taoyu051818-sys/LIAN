#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  {
    path: ".github/pull_request_template.md",
    terms: [
      "Context sync checklist",
      "Base commit",
      "Scope handled by this PR",
      "Explicitly not handled",
      "/opt/lian-platform-server",
      "/opt/lian-mobile-web"
    ]
  },
  {
    path: "docs/contributing/context-sync-protocol.md",
    terms: [
      "Context Sync Protocol",
      "Search results are hints, not truth",
      "PR scope rule",
      "Merge verification rule",
      "Production sync rule",
      "Agent handoff rule"
    ]
  },
  {
    path: "docs/operations/deploy-sync.md",
    terms: [
      "Deploy Sync Guide",
      "/opt/lian-platform-server",
      "/opt/lian-mobile-web",
      "pm2 restart lian-platform-server --update-env",
      "systemctl restart lian-frontend.service",
      "Verify actual merged files"
    ]
  }
];

async function readRequiredFile(relativePath) {
  try {
    return await fs.readFile(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`Missing required context-sync file: ${relativePath}`);
    }
    throw error;
  }
}

const failures = [];

for (const file of requiredFiles) {
  let content;
  try {
    content = await readRequiredFile(file.path);
  } catch (error) {
    failures.push(error.message);
    continue;
  }

  for (const term of file.terms) {
    if (!content.includes(term)) {
      failures.push(`${file.path} is missing required context marker: ${term}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Context sync documentation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Context sync documentation check passed (${requiredFiles.length} files checked).`);
