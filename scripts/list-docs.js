#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(rootDir, "docs");

const SKIP_DIRS = new Set([".git", "node_modules"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(entryPath) {
  const stats = await fs.lstat(entryPath);
  if (stats.isDirectory()) {
    if (SKIP_DIRS.has(path.basename(entryPath))) return [];
    const entries = await fs.readdir(entryPath);
    const files = [];
    for (const entry of entries) {
      files.push(...await collectMarkdownFiles(path.join(entryPath, entry)));
    }
    return files;
  }

  if (!stats.isFile()) return [];
  if (!MARKDOWN_EXTENSIONS.has(path.extname(entryPath).toLowerCase())) return [];
  return [entryPath];
}

async function extractTitle(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  const heading = content.split(/\r?\n/).find((line) => /^#\s+/.test(line));
  if (heading) return heading.replace(/^#\s+/, "").trim();
  return path.basename(filePath);
}

function groupName(relativePath) {
  const parts = relativePath.split("/");
  if (parts.length <= 2) return "docs";
  return parts.slice(0, 2).join("/");
}

if (!(await exists(docsDir))) {
  console.log("No docs directory found.");
  process.exit(0);
}

const files = (await collectMarkdownFiles(docsDir))
  .map((filePath) => toPosix(path.relative(rootDir, filePath)))
  .sort((a, b) => a.localeCompare(b));

const entries = [];
for (const relativePath of files) {
  entries.push({
    path: relativePath,
    title: await extractTitle(path.join(rootDir, relativePath)),
    group: groupName(relativePath)
  });
}

console.log("# LIAN Documentation Inventory");
console.log("");
console.log("Generated from the current repository tree. Do not maintain a separate docs list in package.json.");
console.log("");

let currentGroup = null;
for (const entry of entries) {
  if (entry.group !== currentGroup) {
    currentGroup = entry.group;
    console.log(`## ${currentGroup}`);
    console.log("");
  }
  console.log(`- [${entry.title}](../${entry.path}) - \`${entry.path}\``);
}

console.log("");
console.log(`Total docs: ${entries.length}`);
