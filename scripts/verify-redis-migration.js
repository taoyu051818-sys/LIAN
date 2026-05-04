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
import { KEYS, readJsonKey, readJsonListKey } from "../src/server/storage/redis-store.js";

async function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function countJsonLines(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function countData(data) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (data?.items && typeof data.items === "object") return Object.keys(data.items).length;
  if (data && typeof data === "object") return Object.keys(data).length;
  return 0;
}

async function verifyJsonFile(label, filePath, key, fallback) {
  const fileData = await readJsonFile(filePath, fallback);
  const redisData = await readJsonKey(key, null);
  const fileCount = countData(fileData);
  const redisCount = countData(redisData);
  const ok = redisData !== null && fileCount === redisCount;
  console.log(`${ok ? "[ok]" : "[fail]"} ${label}: file=${fileCount} redis=${redisCount}`);
  return ok;
}

async function verifyJsonLines(label, filePath, key) {
  const fileCount = await countJsonLines(filePath);
  const redisCount = (await readJsonListKey(key)).length;
  const ok = fileCount === redisCount;
  console.log(`${ok ? "[ok]" : "[fail]"} ${label}: file=${fileCount} redis=${redisCount}`);
  return ok;
}

async function main() {
  console.log(`[verify] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  const results = [];
  results.push(await verifyJsonFile("feed rules", rulesPath, KEYS.rules, {}));
  results.push(await verifyJsonFile("post metadata", metadataPath, KEYS.metadata, { items: {} }));
  results.push(await verifyJsonFile("channel reads", channelReadsPath, KEYS.channelReads, { version: 1, items: {} }));
  results.push(await verifyJsonFile("auth store", authUsersPath, KEYS.authStore, { version: 1, users: [], sessions: {}, invites: {}, verifications: {} }));
  results.push(await verifyJsonFile("user cache", userCachePath, KEYS.userCache, { version: 1, users: {}, actors: {} }));
  results.push(await verifyJsonFile("map locations", locationsPath, KEYS.mapLocations, { items: [] }));
  results.push(await verifyJsonFile("map layers", mapV2LayersPath, KEYS.mapLayers, {}));
  results.push(await verifyJsonFile("alias pool", aliasPoolPath, KEYS.aliasPool, { items: [] }));
  results.push(await verifyJsonFile("clubs", clubsPath, KEYS.clubs, { items: [] }));
  results.push(await verifyJsonLines("AI drafts", aiPostDraftsPath, KEYS.aiDrafts));
  results.push(await verifyJsonLines("AI records", aiPostRecordsPath, KEYS.aiRecords));
  if (results.every(Boolean)) {
    console.log("[verify] migration verified");
    return;
  }
  throw new Error("Redis migration verification failed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
