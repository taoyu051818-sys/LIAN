import crypto from "node:crypto";

import { getRedisClient, redisKey } from "./redis-client.js";
import { KEYS } from "./redis-store.js";

const MAP_LAYER_KINDS = ["areas", "routes", "roads", "junctions", "buildings", "environmentElements", "buildingGroups", "assets"];

function stableId(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (raw) return raw.replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 160);
  return crypto.createHash("sha256").update(JSON.stringify(value ?? fallback)).digest("hex");
}

function parseJson(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function getJson(client, key, fallback = null) {
  return parseJson(await client.get(redisKey(key)), fallback);
}

async function setJson(client, key, value) {
  await client.set(redisKey(key), JSON.stringify(value));
}

async function clearPattern(client, pattern) {
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: redisKey(pattern), COUNT: 200 })) {
    keys.push(key);
    if (keys.length >= 500) await client.del(keys.splice(0));
  }
  if (keys.length) await client.del(keys);
}

async function replaceSet(client, key, values = []) {
  await client.del(redisKey(key));
  const cleaned = values.map((value) => String(value)).filter(Boolean);
  if (cleaned.length) await client.sAdd(redisKey(key), cleaned);
}

async function readSetJson(client, setKey, itemKeyForId) {
  const ids = await client.sMembers(redisKey(setKey));
  const sorted = ids.sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(String(b)));
  const values = [];
  for (const id of sorted) {
    const value = await getJson(client, itemKeyForId(id), null);
    if (value !== null) values.push([id, value]);
  }
  return values;
}

async function readObjectPostMetadata(client, fallback) {
  const entries = await readSetJson(client, "postmeta:tids", (tid) => `postmeta:tid:${stableId(tid)}`);
  if (!entries.length) return null;
  const items = {};
  for (const [tid, value] of entries) {
    const { tid: _tid, ...metadata } = value || {};
    items[tid] = metadata;
  }
  return { ...(fallback && typeof fallback === "object" ? fallback : { version: 1 }), items };
}

async function writeObjectPostMetadata(client, data = {}) {
  const items = data?.items && typeof data.items === "object" ? data.items : {};
  const tids = Object.keys(items).sort((a, b) => Number(a) - Number(b));
  await clearPattern(client, "postmeta:tid:*");
  for (const tid of tids) {
    await setJson(client, `postmeta:tid:${stableId(tid)}`, { tid, ...(items[tid] || {}) });
  }
  await replaceSet(client, "postmeta:tids", tids);
}

async function writeRedisObjectPostMetadataItem(tid, metadata = {}) {
  const client = await getRedisClient();
  const key = String(Number(tid) || tid || "");
  if (!key) return false;
  await setJson(client, `postmeta:tid:${stableId(key)}`, { tid: key, ...(metadata || {}) });
  await client.sAdd(redisKey("postmeta:tids"), key);
  return true;
}

async function readObjectFeedRules(client) {
  const entries = await readSetJson(client, "feed:rules:keys", (key) => `feed:rule:${stableId(key)}`);
  if (!entries.length) return null;
  const rules = {};
  for (const [key, row] of entries) rules[key] = row?.value;
  return rules;
}

async function writeObjectFeedRules(client, data = {}) {
  const keys = Object.keys(data || {}).sort();
  await clearPattern(client, "feed:rule:*");
  for (const key of keys) await setJson(client, `feed:rule:${stableId(key)}`, { key, value: data[key] });
  await replaceSet(client, "feed:rules:keys", keys);
}

async function readObjectChannelReads(client) {
  const entries = await readSetJson(client, "channel:read:users", (userId) => `channel:read:user:${stableId(userId)}`);
  if (!entries.length) return null;
  const items = {};
  for (const [userId, value] of entries) {
    const { userId: _userId, ...readState } = value || {};
    items[userId] = readState;
  }
  return { version: 1, items };
}

async function writeObjectChannelReads(client, data = {}) {
  const items = data?.items && typeof data.items === "object" ? data.items : {};
  const users = Object.keys(items).sort();
  await clearPattern(client, "channel:read:user:*");
  for (const userId of users) await setJson(client, `channel:read:user:${stableId(userId)}`, { userId, ...(items[userId] || {}) });
  await replaceSet(client, "channel:read:users", users);
}

async function readObjectUserCache(client) {
  const userEntries = await readSetJson(client, "usercache:users", (userId) => `usercache:user:${stableId(userId)}`);
  const actorEntries = await readSetJson(client, "usercache:actors", (actorId) => `usercache:actor:${stableId(actorId)}`);
  if (!userEntries.length && !actorEntries.length) return null;
  const users = {};
  const actors = {};
  for (const [userId, value] of userEntries) {
    const { userId: _userId, ...cache } = value || {};
    users[userId] = cache;
  }
  for (const [actorId, value] of actorEntries) {
    const { actorId: _actorId, ...cache } = value || {};
    actors[actorId] = cache;
  }
  return { version: 1, users, actors };
}

async function writeObjectUserCache(client, data = {}) {
  const users = data?.users && typeof data.users === "object" ? data.users : {};
  const actors = data?.actors && typeof data.actors === "object" ? data.actors : {};
  const userIds = Object.keys(users).sort();
  const actorIds = Object.keys(actors).sort();
  await clearPattern(client, "usercache:user:*");
  await clearPattern(client, "usercache:actor:*");
  for (const userId of userIds) await setJson(client, `usercache:user:${stableId(userId)}`, { userId, ...(users[userId] || {}) });
  for (const actorId of actorIds) await setJson(client, `usercache:actor:${stableId(actorId)}`, { actorId, ...(actors[actorId] || {}) });
  await replaceSet(client, "usercache:users", userIds);
  await replaceSet(client, "usercache:actors", actorIds);
}

async function writeRedisObjectUserCacheEntry(userId, entry = {}) {
  const client = await getRedisClient();
  const key = String(userId || "").trim();
  if (!key) return false;
  await setJson(client, `usercache:user:${stableId(key)}`, { userId: key, ...(entry || {}) });
  await client.sAdd(redisKey("usercache:users"), key);
  return true;
}

async function readObjectMapLocations(client, fallback) {
  const entries = await readSetJson(client, "map:location:index", (id) => `map:location:${stableId(id)}`);
  if (!entries.length) return null;
  return {
    ...(fallback && typeof fallback === "object" ? fallback : { version: 1, coordSystem: "gcj02" }),
    items: entries.map(([, value]) => value).filter(Boolean)
  };
}

async function writeObjectMapLocations(client, data = {}) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const ids = [];
  await clearPattern(client, "map:location:*");
  for (const [index, item] of items.entries()) {
    const id = stableId(item.id || item.name || index);
    ids.push(id);
    await setJson(client, `map:location:${id}`, item);
  }
  await replaceSet(client, "map:location:index", ids);
}

async function readObjectMapLayers(client) {
  const bundle = await getJson(client, "map:layer:bundle", null);
  if (bundle) return bundle;
  const layers = { version: 1, coordSystem: "gcj02" };
  let found = false;
  for (const kind of MAP_LAYER_KINDS) {
    const entries = await readSetJson(client, `map:layer:${kind}:index`, (id) => `map:layer:${kind}:${stableId(id)}`);
    layers[kind] = entries.map(([, value]) => value).filter(Boolean);
    found = found || layers[kind].length > 0;
  }
  return found ? layers : null;
}

async function writeObjectMapLayers(client, data = {}) {
  await setJson(client, "map:layer:bundle", data || {});
  for (const kind of MAP_LAYER_KINDS) {
    const items = Array.isArray(data?.[kind]) ? data[kind] : [];
    const ids = [];
    await clearPattern(client, `map:layer:${kind}:*`);
    for (const [index, item] of items.entries()) {
      const id = stableId(item.id || item.name || `${kind}-${index}`);
      ids.push(id);
      await setJson(client, `map:layer:${kind}:${id}`, item);
    }
    await replaceSet(client, `map:layer:${kind}:index`, ids);
  }
}

async function readObjectArrayLike(client, itemPrefix, indexKey, fallback) {
  const entries = await readSetJson(client, indexKey, (id) => `${itemPrefix}:${stableId(id)}`);
  if (!entries.length) return null;
  return {
    ...(fallback && typeof fallback === "object" ? fallback : { version: 1 }),
    items: entries.map(([, value]) => value).filter(Boolean)
  };
}

async function writeObjectArrayLike(client, data = {}, itemPrefix, indexKey) {
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const ids = [];
  await clearPattern(client, `${itemPrefix}:*`);
  for (const [index, item] of items.entries()) {
    const id = stableId(item.id || item.code || item.name || `${index}`);
    ids.push(id);
    await setJson(client, `${itemPrefix}:${id}`, item);
  }
  await replaceSet(client, indexKey, ids);
}

async function appendRedisObjectListItem(name, data = {}) {
  const client = await getRedisClient();
  if (name === KEYS.aiDrafts) {
    const id = `${Date.now()}:${crypto.randomUUID()}`;
    await setJson(client, `ai:draft:item:${id}`, data);
    await client.sAdd(redisKey("ai:draft:index"), id);
    return true;
  }
  if (name === KEYS.aiRecords) {
    const id = `${Date.now()}:${crypto.randomUUID()}`;
    await setJson(client, `ai:record:item:${id}`, data);
    await client.sAdd(redisKey("ai:record:index"), id);
    return true;
  }
  return false;
}

async function readRedisObjectData(name, fallback = null) {
  const client = await getRedisClient();
  if (name === KEYS.metadata) return await readObjectPostMetadata(client, fallback);
  if (name === KEYS.rules) return await readObjectFeedRules(client, fallback);
  if (name === KEYS.channelReads) return await readObjectChannelReads(client, fallback);
  if (name === KEYS.userCache) return await readObjectUserCache(client, fallback);
  if (name === KEYS.mapLocations) return await readObjectMapLocations(client, fallback);
  if (name === KEYS.mapLayers) return await readObjectMapLayers(client, fallback);
  if (name === KEYS.aliasPool) return await readObjectArrayLike(client, "alias:pool:item", "alias:pool:index", fallback);
  if (name === KEYS.clubs) return await readObjectArrayLike(client, "club:item", "club:index", fallback);
  return null;
}

async function writeRedisObjectData(name, data = {}) {
  const client = await getRedisClient();
  if (name === KEYS.metadata) return await writeObjectPostMetadata(client, data);
  if (name === KEYS.rules) return await writeObjectFeedRules(client, data);
  if (name === KEYS.channelReads) return await writeObjectChannelReads(client, data);
  if (name === KEYS.userCache) return await writeObjectUserCache(client, data);
  if (name === KEYS.mapLocations) return await writeObjectMapLocations(client, data);
  if (name === KEYS.mapLayers) return await writeObjectMapLayers(client, data);
  if (name === KEYS.aliasPool) return await writeObjectArrayLike(client, data, "alias:pool:item", "alias:pool:index");
  if (name === KEYS.clubs) return await writeObjectArrayLike(client, data, "club:item", "club:index");
  return false;
}

export {
  appendRedisObjectListItem,
  readRedisObjectData,
  writeRedisObjectData,
  writeRedisObjectPostMetadataItem,
  writeRedisObjectUserCacheEntry
};
