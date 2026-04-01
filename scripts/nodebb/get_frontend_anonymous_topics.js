#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { createClient } = require("redis");

function toBool(v) {
  if (v === true || v === 1) return true;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  }
  return false;
}

async function readStdinJson() {
  const stdin = await new Promise((resolve) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
  });

  try {
    return JSON.parse(stdin || "{}");
  } catch {
    return {};
  }
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
  const tids = Array.isArray(payload.tids)
    ? payload.tids.map(String).filter(Boolean)
    : [];

  const map = {};
  if (!tids.length) {
    console.log(JSON.stringify({ map }));
    return;
  }

  const client = createClient({
    socket: { host, port },
    password,
    database,
  });

  await client.connect();
  try {
    for (const tid of tids) {
      const key = `topic:${tid}`;
      const vals = await client.hmGet(key, [
        "frontendAnonymous",
        "anonymous",
        "isAnonymous",
      ]);
      map[tid] = vals.some(toBool);
    }
  } finally {
    await client.quit();
  }

  console.log(JSON.stringify({ map }));
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});
