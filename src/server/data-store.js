import fs from "node:fs/promises";
import path from "node:path";

import { memory } from "./cache.js";
import {
  aliasPoolPath,
  authUsersPath,
  channelReadsPath,
  clubsPath,
  locationsPath,
  mapV2LayersPath,
  metadataPath,
  rulesPath,
  userCachePath
} from "./paths.js";
import { areRedisObjectReadsEnabled, isRedisStorageEnabled, redisConfig } from "./storage/redis-client.js";
import {
  appendRedisObjectListItem,
  readRedisObjectData,
  writeRedisObjectChannelReadItem,
  writeRedisObjectData,
  writeRedisObjectPostMetadataItem,
  writeRedisObjectUserCacheEntry
} from "./storage/redis-object-store.js";
import { KEYS, appendJsonArrayKey, readJsonKey, writeJsonKey } from "./storage/redis-store.js";

const DEFAULT_RULES = { tabs: ["精选"], pinnedTids: [], tagWeights: {}, recencyHalfLifeHours: 96, coverBonus: 0 };
const DEFAULT_METADATA_FILE = { items: {} };
const DEFAULT_CHANNEL_READS = { version: 1, items: {} };
const DEFAULT_USER_CACHE = { version: 1, users: {}, actors: {} };

function redisStorageEnabled() {
  return isRedisStorageEnabled();
}

function redisStorageKeyForPath(filePath = "") {
  const resolved = path.resolve(filePath);
  const map = new Map([
    [path.resolve(rulesPath), KEYS.rules],
    [path.resolve(metadataPath), KEYS.metadata],
    [path.resolve(channelReadsPath), KEYS.channelReads],
    [path.resolve(authUsersPath), KEYS.authStore],
    [path.resolve(userCachePath), KEYS.userCache],
    [path.resolve(locationsPath), KEYS.mapLocations],
    [path.resolve(mapV2LayersPath), KEYS.mapLayers],
    [path.resolve(aliasPoolPath), KEYS.aliasPool],
    [path.resolve(clubsPath), KEYS.clubs]
  ]);
  return map.get(resolved) || null;
}

async function readJsonData(filePath, fallback) {
  const key = redisStorageEnabled() ? redisStorageKeyForPath(filePath) : null;
  if (key) {
    if (areRedisObjectReadsEnabled()) {
      const objectData = await readRedisObjectData(key, fallback);
      if (objectData !== null) return objectData;
    }
    return await readJsonKey(key, fallback);
  }
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath, data) {
  const key = redisStorageEnabled() ? redisStorageKeyForPath(filePath) : null;
  if (key) {
    if (areRedisObjectReadsEnabled()) {
      await writeRedisObjectData(key, data);
    }
    await writeJsonKey(key, data);
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

async function appendJsonLine(filePath, data) {
  try {
    if (redisStorageEnabled()) {
      const base = path.basename(filePath);
      if (base === "ai-post-drafts.jsonl") {
        if (areRedisObjectReadsEnabled()) await appendRedisObjectListItem(KEYS.aiDrafts, data);
        await appendJsonArrayKey(KEYS.aiDrafts, data);
        return;
      }
      if (base === "ai-post-records.jsonl") {
        if (areRedisObjectReadsEnabled()) await appendRedisObjectListItem(KEYS.aiRecords, data);
        await appendJsonArrayKey(KEYS.aiRecords, data);
        return;
      }
    }
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(data)}\n`, "utf8");
  } catch (cause) {
    const error = new Error(`failed to append ${path.basename(filePath)}`);
    error.status = 500;
    error.cause = cause;
    throw error;
  }
}

async function loadRules() {
  const now = Date.now();
  if (memory.rules && now - memory.rulesLoadedAt < 15_000) return memory.rules;
  memory.rules = await readJsonData(rulesPath, DEFAULT_RULES);
  memory.rulesLoadedAt = now;
  return memory.rules;
}

async function loadMetadata() {
  const now = Date.now();
  if (memory.metadata && now - memory.metadataLoadedAt < 15_000) return memory.metadata;
  const data = await readJsonData(metadataPath, DEFAULT_METADATA_FILE);
  memory.metadata = data.items || data || {};
  memory.metadataLoadedAt = now;
  return memory.metadata;
}

let metadataWriteQueue = Promise.resolve();
let authWriteQueue = Promise.resolve();

async function backupMetadata() {
  if (redisStorageEnabled()) {
    const metadata = await readJsonData(metadataPath, DEFAULT_METADATA_FILE);
    const backupPath = `${metadataPath}.redis-backup-${Date.now()}.json`;
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    return backupPath;
  }
  try {
    const raw = await fs.readFile(metadataPath, "utf8");
    const backupPath = `${metadataPath}.bak`;
    await fs.writeFile(backupPath, raw, "utf8");
    return backupPath;
  } catch {
    return null;
  }
}

async function patchPostMetadata(tid, patch = {}) {
  const key = String(Number(tid) || tid || "");
  if (!key) return;
  metadataWriteQueue = metadataWriteQueue.then(async () => {
    const data = await readJsonData(metadataPath, DEFAULT_METADATA_FILE);
    data.items ||= {};
    data.items[key] = { ...(data.items[key] || {}), ...patch };
    if (redisStorageEnabled()) {
      if (areRedisObjectReadsEnabled()) {
        await writeRedisObjectPostMetadataItem(key, data.items[key]);
      }
      await writeJsonKey(KEYS.metadata, data);
    } else {
      await writeJsonFile(metadataPath, data);
    }
    memory.metadata = data.items;
    memory.metadataLoadedAt = Date.now();
    memory.feedPages.clear();
  });
  return metadataWriteQueue;
}

async function loadChannelReads() {
  const now = Date.now();
  if (memory.channelReads && now - memory.channelReadsLoadedAt < 5_000) return memory.channelReads;
  const data = await readJsonData(channelReadsPath, DEFAULT_CHANNEL_READS);
  memory.channelReads = data && typeof data === "object" ? data : { ...DEFAULT_CHANNEL_READS };
  if (!memory.channelReads.items || typeof memory.channelReads.items !== "object") memory.channelReads.items = {};
  memory.channelReadsLoadedAt = now;
  return memory.channelReads;
}

async function saveChannelReads(data) {
  await writeJsonFile(channelReadsPath, data);
  memory.channelReads = data;
  memory.channelReadsLoadedAt = Date.now();
}

async function saveChannelReadItems(data, eventIds = []) {
  const ids = [...new Set(eventIds.map(String).filter(Boolean))];
  if (redisStorageEnabled() && areRedisObjectReadsEnabled()) {
    for (const id of ids) {
      if (data?.items?.[id]) await writeRedisObjectChannelReadItem(id, data.items[id]);
    }
    await writeJsonKey(KEYS.channelReads, data);
  } else {
    await saveChannelReads(data);
  }
  memory.channelReads = data;
  memory.channelReadsLoadedAt = Date.now();
}

function normalizeAuthStore(data = {}) {
  return {
    version: 1,
    users: Array.isArray(data.users) ? data.users : [],
    sessions: data.sessions && typeof data.sessions === "object" ? data.sessions : {},
    invites: data.invites && typeof data.invites === "object" ? data.invites : {},
    verifications: data.verifications && typeof data.verifications === "object" ? data.verifications : {}
  };
}

async function loadAuthStore() {
  const data = await readJsonData(authUsersPath, null);
  return normalizeAuthStore(data || {});
}

async function saveAuthStore(data) {
  const normalized = normalizeAuthStore(data);
  authWriteQueue = authWriteQueue.then(() => writeJsonFile(authUsersPath, normalized));
  return authWriteQueue;
}

async function updateAuthStore(mutator) {
  authWriteQueue = authWriteQueue.then(async () => {
    const store = await loadAuthStore();
    const result = await mutator(store);
    await writeJsonFile(authUsersPath, store);
    return result;
  });
  return authWriteQueue;
}

async function loadUserCache() {
  const now = Date.now();
  if (memory.userCache && now - memory.userCacheLoadedAt < 15_000) return memory.userCache;
  const data = await readJsonData(userCachePath, DEFAULT_USER_CACHE);
  memory.userCache = data && typeof data === "object" ? data : { ...DEFAULT_USER_CACHE };
  if (!memory.userCache.users) memory.userCache.users = {};
  if (!memory.userCache.actors) memory.userCache.actors = {};
  memory.userCacheLoadedAt = now;
  return memory.userCache;
}

async function saveUserCache(data) {
  await writeJsonFile(userCachePath, data);
  memory.userCache = data;
  memory.userCacheLoadedAt = Date.now();
}

async function saveUserCacheEntry(cache, userId, entry) {
  if (redisStorageEnabled() && areRedisObjectReadsEnabled()) {
    await writeRedisObjectUserCacheEntry(userId, entry);
    await writeJsonKey(KEYS.userCache, cache);
  } else {
    await saveUserCache(cache);
  }
  memory.userCache = cache;
  memory.userCacheLoadedAt = Date.now();
}

function ensureUserEntry(cache, userId) {
  if (!cache.users[userId]) {
    cache.users[userId] = { likedTids: [], savedTids: [], updatedAt: new Date().toISOString() };
  }
  return cache.users[userId];
}

async function recordUserLike(userId, tid, liked) {
  const cache = await loadUserCache();
  const entry = ensureUserEntry(cache, userId);
  const tidNum = Number(tid);
  if (liked) {
    if (!entry.likedTids.includes(tidNum)) entry.likedTids.push(tidNum);
  } else {
    entry.likedTids = entry.likedTids.filter((t) => t !== tidNum);
  }
  entry.updatedAt = new Date().toISOString();
  await saveUserCacheEntry(cache, userId, entry);
}

async function recordUserSave(userId, tid, saved) {
  const cache = await loadUserCache();
  const entry = ensureUserEntry(cache, userId);
  const tidNum = Number(tid);
  if (saved) {
    if (!entry.savedTids.includes(tidNum)) entry.savedTids.push(tidNum);
  } else {
    entry.savedTids = entry.savedTids.filter((t) => t !== tidNum);
  }
  entry.updatedAt = new Date().toISOString();
  await saveUserCacheEntry(cache, userId, entry);
}

async function recordActorMeta(nodebbUid, meta) {
  const cache = await loadUserCache();
  const key = String(nodebbUid);
  cache.actors[key] = {
    username: meta.username || cache.actors[key]?.username || "",
    identityTag: meta.identityTag || cache.actors[key]?.identityTag || "",
    avatarUrl: meta.avatarUrl || cache.actors[key]?.avatarUrl || "",
    updatedAt: new Date().toISOString()
  };
  await saveUserCache(cache);
}

function getUserLikedTids(userId) {
  const cache = memory.userCache;
  return cache?.users?.[userId]?.likedTids || [];
}

function getUserSavedTids(userId) {
  const cache = memory.userCache;
  return cache?.users?.[userId]?.savedTids || [];
}

function getActorMeta(nodebbUid) {
  const cache = memory.userCache;
  return cache?.actors?.[String(nodebbUid)] || null;
}

export {
  appendJsonLine,
  backupMetadata,
  getActorMeta,
  getUserLikedTids,
  getUserSavedTids,
  loadAuthStore,
  loadChannelReads,
  loadMetadata,
  loadRules,
  loadUserCache,
  normalizeAuthStore,
  patchPostMetadata,
  readJsonData,
  recordActorMeta,
  recordUserLike,
  recordUserSave,
  redisConfig,
  redisStorageEnabled,
  saveAuthStore,
  saveChannelReadItems,
  saveChannelReads,
  saveUserCache,
  updateAuthStore,
  writeJsonFile
};
