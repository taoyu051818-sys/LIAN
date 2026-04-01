#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createClient } = require("redis");

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
  const configPath = path.join(process.cwd(), "config.json");
  const rawConfig = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(rawConfig);

  const redisCfg = config.redis || {};
  const host = redisCfg.host || "127.0.0.1";
  const port = Number(redisCfg.port || 6379);
  const password = redisCfg.password || undefined;
  const database = Number(
    redisCfg.database !== undefined ? redisCfg.database : 0
  );

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

  const client = createClient({
    socket: { host, port },
    password,
    database,
  });

  await client.connect();

  try {
    const tid = Number(await client.incr("global:nextTid"));
    const pid = Number(await client.incr("global:nextPid"));
    const now = Date.now();
    const slugPart =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "topic";

    await client.hSet(`topic:${tid}`, {
      tid: String(tid),
      uid: String(uid),
      cid: String(cid),
      title,
      slug: `${tid}/${slugPart}`,
      timestamp: String(now),
      lastposttime: String(now),
      postcount: "1",
      viewcount: "0",
      postercount: "1",
      followercount: "1",
      mainPid: String(pid),
      deleted: "0",
      locked: "0",
      pinned: "0",
      upvotes: "0",
      downvotes: "0",
      frontendAnonymous: frontendAnonymous ? "1" : "0",
    });

    await client.hSet(`post:${pid}`, {
      pid: String(pid),
      tid: String(tid),
      uid: String(uid),
      content,
      timestamp: String(now),
      edited: "0",
      deleted: "0",
      upvotes: "0",
      downvotes: "0",
      votes: "0",
    });

    await client.zAdd("topics:tid", [{ score: tid, value: String(tid) }]);
    await client.zAdd("topics:recent", [{ score: now, value: String(tid) }]);
    await client.zAdd(`cid:${cid}:tids`, [{ score: now, value: String(tid) }]);
    await client.zAdd(`cid:${cid}:tids:posts`, [{ score: now, value: String(tid) }]);
    await client.zAdd(`tid:${tid}:posts`, [{ score: now, value: String(pid) }]);

    await client.hIncrBy(`user:${uid}`, "topiccount", 1);
    await client.hIncrBy(`user:${uid}`, "postcount", 1);
    await client.hSet(`user:${uid}`, { lastposttime: String(now) });

    console.log(JSON.stringify({ ok: true, tid, pid }));
  } finally {
    await client.quit();
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
