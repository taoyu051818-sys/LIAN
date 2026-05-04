import fs from "node:fs/promises";

import {
  aliasPoolPath,
  aiPostDraftsPath,
  aiPostRecordsPath,
  authUsersPath,
  channelReadsPath,
  clubsPath,
  locationsPath,
  mapV2LayersPath,
  metadataPath,
  rulesPath,
  userCachePath
} from "../src/server/paths.js";
import { closeRedisClient, redisConfig } from "../src/server/storage/redis-client.js";
import { KEYS, deleteLianKeys, writeJsonKey, appendJsonArrayKey } from "../src/server/storage/redis-store.js";

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readJsonLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function migrateJsonFile(label, filePath, key, fallback) {
  const data = await readJsonFile(filePath, fallback);
  await writeJsonKey(key, data);
  const size = Array.isArray(data?.items) ? data.items.length : Object.keys(data?.items || data || {}).length;
  console.log(`[migrate] ${label}: wrote ${key} (${size} entries)`);
}

async function migrateJsonLines(label, filePath, key) {
  const rows = await readJsonLines(filePath);
  for (const row of rows) await appendJsonArrayKey(key, row);
  console.log(`[migrate] ${label}: appended ${rows.length} rows to ${key}`);
}

async function main() {
  console.log(`[migrate] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to migrate LIAN data into Redis DB 1 because NodeBB is using DB 1 on this server.");
  }
  if (process.argv.includes("--clear")) {
    await deleteLianKeys();
    console.log("[migrate] cleared existing LIAN Redis keys");
  }

  await migrateJsonFile("feed rules", rulesPath, KEYS.rules, { tabs: ["精选"], pinnedTids: [], tagWeights: {}, recencyHalfLifeHours: 96, coverBonus: 0 });
  await migrateJsonFile("post metadata", metadataPath, KEYS.metadata, { items: {} });
  await migrateJsonFile("channel reads", channelReadsPath, KEYS.channelReads, { version: 1, items: {} });
  await migrateJsonFile("auth store", authUsersPath, KEYS.authStore, { version: 1, users: [], sessions: {}, invites: {}, verifications: {} });
  await migrateJsonFile("user cache", userCachePath, KEYS.userCache, { version: 1, users: {}, actors: {} });
  await migrateJsonFile("map locations", locationsPath, KEYS.mapLocations, { version: 1, coordSystem: "gcj02", items: [] });
  await migrateJsonFile("map layers", mapV2LayersPath, KEYS.mapLayers, { version: 1, coordSystem: "gcj02", areas: [], routes: [] });
  await migrateJsonFile("alias pool", aliasPoolPath, KEYS.aliasPool, { version: 1, items: [] });
  await migrateJsonFile("clubs", clubsPath, KEYS.clubs, { version: 1, items: [] });
  await migrateJsonLines("AI drafts", aiPostDraftsPath, KEYS.aiDrafts);
  await migrateJsonLines("AI records", aiPostRecordsPath, KEYS.aiRecords);

  console.log("[migrate] done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
