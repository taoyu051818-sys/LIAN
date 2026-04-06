#!/usr/bin/env node
"use strict";

const path = require("path");

const rootDir = process.cwd();
const configPath = path.join(rootDir, "config.json");
process.env.CONFIG = configPath;
require(path.join(rootDir, "require-main"));

const db = require(path.join(rootDir, "src/database"));
const meta = require(path.join(rootDir, "src/meta"));
const Topics = require(path.join(rootDir, "src/topics"));

async function readStdinJson() {
  const input = await new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });
  try {
    return JSON.parse(input || "{}");
  } catch {
    return {};
  }
}

function required(v) {
  return typeof v === "string" && v.trim().length > 0;
}

async function main() {
  const payload = await readStdinJson();
  const title = String(payload.title || "").trim();
  const content = String(payload.content || payload.body || "").trim();
  const cid = Number(payload.cid || 1);
  const uid = Number(payload.uid || payload.authorUid || 1);
  const frontendAnonymous = !!payload.isAnonymous;

  if (!required(title) || !required(content)) {
    console.log(JSON.stringify({ error: "title/content required" }));
    process.exit(1);
  }

  await db.init();
  await meta.configs.init();

  try {
    const result = await Topics.post({
      uid,
      cid,
      title,
      content,
    });

    const tid = Number(result?.topicData?.tid || 0);
    const pid = Number(result?.postData?.pid || result?.topicData?.mainPid || 0);

    if (!tid || !pid) {
      throw new Error("Topic creation returned incomplete data");
    }

    if (frontendAnonymous) {
      await db.setObjectField(`topic:${tid}`, "frontendAnonymous", "1");
    }

    console.log(JSON.stringify({ ok: true, tid, pid }));
  } finally {
    if (typeof db.close === "function") {
      await db.close();
    } else if (typeof db.closeConnection === "function") {
      await db.closeConnection();
    }
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
