import crypto from "node:crypto";

import { closeRedisClient, getRedisClient, redisConfig, redisKey } from "../../src/server/storage/redis-client.js";
import { KEYS, readJsonKey, readJsonListKey, writeJsonKey } from "../../src/server/storage/redis-store.js";

const OBJECT_PATTERNS = [
  "postmeta:tid:*",
  "postmeta:tids",
  "feed:rule:*",
  "feed:rules:keys",
  "auth:user:*",
  "auth:user:ids",
  "auth:email:*",
  "auth:username:*",
  "auth:session:*",
  "auth:sessions",
  "auth:invite:*",
  "auth:invites",
  "auth:verification:*",
  "auth:verifications",
  "channel:read:user:*",
  "channel:read:users",
  "usercache:user:*",
  "usercache:users",
  "usercache:actor:*",
  "usercache:actors",
  "map:location:*",
  "map:location:index",
  "map:layer:bundle",
  "map:layer:*:*",
  "map:layer:*:index",
  "alias:pool:item:*",
  "alias:pool:index",
  "club:item:*",
  "club:index",
  "ai:draft:item:*",
  "ai:draft:index",
  "ai:record:item:*",
  "ai:record:index"
];

function stableId(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (raw) return raw.replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 160);
  return crypto.createHash("sha256").update(JSON.stringify(value ?? fallback)).digest("hex");
}

function tokenHash(token = "") {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function deletePattern(client, pattern) {
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: redisKey(pattern), COUNT: 200 })) {
    keys.push(key);
    if (keys.length >= 500) {
      await client.del(keys.splice(0));
    }
  }
  if (keys.length) await client.del(keys);
}

async function clearObjectKeys(client) {
  for (const pattern of OBJECT_PATTERNS) {
    await deletePattern(client, pattern);
  }
}

async function setJson(client, key, value) {
  await client.set(redisKey(key), JSON.stringify(value));
}

async function addSet(client, key, values = []) {
  const cleaned = values.map((value) => String(value)).filter(Boolean);
  if (cleaned.length) await client.sAdd(redisKey(key), cleaned);
}

async function migratePostMetadata(client) {
  const data = await readJsonKey(KEYS.metadata, { version: 1, items: {} });
  const items = data?.items && typeof data.items === "object" ? data.items : {};
  const tids = Object.keys(items).sort((a, b) => Number(a) - Number(b));
  for (const tid of tids) {
    await setJson(client, `postmeta:tid:${stableId(tid)}`, { tid, ...(items[tid] || {}) });
  }
  await addSet(client, "postmeta:tids", tids);
  console.log(`[objects] post metadata: ${tids.length}`);
  return tids.length;
}

async function migrateFeedRules(client) {
  const rules = await readJsonKey(KEYS.rules, {});
  const keys = Object.keys(rules || {}).sort();
  for (const key of keys) {
    await setJson(client, `feed:rule:${stableId(key)}`, { key, value: rules[key] });
  }
  await addSet(client, "feed:rules:keys", keys);
  console.log(`[objects] feed rules: ${keys.length}`);
  return keys.length;
}

async function migrateAuth(client) {
  const store = await readJsonKey(KEYS.authStore, { users: [], sessions: {}, invites: {}, verifications: {} });
  const users = Array.isArray(store.users) ? store.users : [];
  const userIds = [];
  for (const user of users) {
    const id = stableId(user.id || user.userId || user.uid || user.email || user.username);
    if (!id) continue;
    userIds.push(id);
    await setJson(client, `auth:user:${id}`, user);
    if (user.email) await client.set(redisKey(`auth:email:${stableId(user.email.toLowerCase())}`), id);
    if (user.username) await client.set(redisKey(`auth:username:${stableId(user.username.toLowerCase())}`), id);
  }
  await addSet(client, "auth:user:ids", userIds);

  const sessionTokens = Object.keys(store.sessions || {});
  const sessionHashes = [];
  for (const token of sessionTokens) {
    const hash = tokenHash(token);
    sessionHashes.push(hash);
    await setJson(client, `auth:session:${hash}`, { tokenHash: hash, ...(store.sessions[token] || {}) });
  }
  await addSet(client, "auth:sessions", sessionHashes);

  const inviteCodes = Object.keys(store.invites || {});
  for (const code of inviteCodes) {
    await setJson(client, `auth:invite:${stableId(code)}`, { code, ...(store.invites[code] || {}) });
  }
  await addSet(client, "auth:invites", inviteCodes.map(stableId));

  const verificationKeys = Object.keys(store.verifications || {});
  for (const key of verificationKeys) {
    await setJson(client, `auth:verification:${stableId(key.toLowerCase())}`, { key, ...(store.verifications[key] || {}) });
  }
  await addSet(client, "auth:verifications", verificationKeys.map((key) => stableId(key.toLowerCase())));

  console.log(`[objects] auth: users=${userIds.length} sessions=${sessionHashes.length} invites=${inviteCodes.length} verifications=${verificationKeys.length}`);
  return { users: userIds.length, sessions: sessionHashes.length, invites: inviteCodes.length, verifications: verificationKeys.length };
}

async function migrateChannelReads(client) {
  const data = await readJsonKey(KEYS.channelReads, { version: 1, items: {} });
  const items = data?.items && typeof data.items === "object" ? data.items : {};
  const users = Object.keys(items).sort();
  for (const userId of users) {
    await setJson(client, `channel:read:user:${stableId(userId)}`, { userId, ...(items[userId] || {}) });
  }
  await addSet(client, "channel:read:users", users);
  console.log(`[objects] channel reads: ${users.length}`);
  return users.length;
}

async function migrateUserCache(client) {
  const data = await readJsonKey(KEYS.userCache, { users: {}, actors: {} });
  const users = data?.users && typeof data.users === "object" ? data.users : {};
  const actors = data?.actors && typeof data.actors === "object" ? data.actors : {};
  const userIds = Object.keys(users).sort();
  const actorIds = Object.keys(actors).sort();
  for (const userId of userIds) {
    await setJson(client, `usercache:user:${stableId(userId)}`, { userId, ...(users[userId] || {}) });
  }
  for (const actorId of actorIds) {
    await setJson(client, `usercache:actor:${stableId(actorId)}`, { actorId, ...(actors[actorId] || {}) });
  }
  await addSet(client, "usercache:users", userIds);
  await addSet(client, "usercache:actors", actorIds);
  console.log(`[objects] user cache: users=${userIds.length} actors=${actorIds.length}`);
  return { users: userIds.length, actors: actorIds.length };
}

async function migrateMap(client) {
  const locations = await readJsonKey(KEYS.mapLocations, { items: [] });
  const items = Array.isArray(locations?.items) ? locations.items : [];
  const locationIds = [];
  for (const item of items) {
    const id = stableId(item.id || item.name || locationIds.length);
    locationIds.push(id);
    await setJson(client, `map:location:${id}`, item);
  }
  await addSet(client, "map:location:index", locationIds);

  const layers = await readJsonKey(KEYS.mapLayers, {});
  await setJson(client, "map:layer:bundle", layers || {});
  const layerKinds = ["areas", "routes", "roads", "junctions", "buildings", "environmentElements", "buildingGroups", "assets"];
  const counts = {};
  for (const kind of layerKinds) {
    const arr = Array.isArray(layers?.[kind]) ? layers[kind] : [];
    const ids = [];
    for (const [index, item] of arr.entries()) {
      const id = stableId(item.id || item.name || `${kind}-${index}`);
      ids.push(id);
      await setJson(client, `map:layer:${kind}:${id}`, item);
    }
    await addSet(client, `map:layer:${kind}:index`, ids);
    counts[kind] = ids.length;
  }
  console.log(`[objects] map: locations=${locationIds.length} layers=${JSON.stringify(counts)}`);
  return { locations: locationIds.length, layers: counts };
}

async function migrateArrayLike(client, sourceKey, itemPrefix, indexKey, label) {
  const data = await readJsonKey(sourceKey, { items: [] });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const ids = [];
  for (const [index, item] of items.entries()) {
    const id = stableId(item.id || item.code || item.name || `${label}-${index}`);
    ids.push(id);
    await setJson(client, `${itemPrefix}:${id}`, item);
  }
  await addSet(client, indexKey, ids);
  console.log(`[objects] ${label}: ${ids.length}`);
  return ids.length;
}

async function migrateJsonList(client, sourceKey, itemPrefix, indexKey, label) {
  const rows = await readJsonListKey(sourceKey);
  const ids = [];
  for (const [index, row] of rows.entries()) {
    const id = stableId(row.id || row.recordId || row.draftId || row.tid || `${label}-${String(index).padStart(6, "0")}`);
    const uniqueId = `${String(index).padStart(6, "0")}:${id}`;
    ids.push(uniqueId);
    await setJson(client, `${itemPrefix}:${uniqueId}`, row);
  }
  await addSet(client, indexKey, ids);
  console.log(`[objects] ${label}: ${ids.length}`);
  return ids.length;
}

async function main() {
  console.log(`[objects] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to write LIAN object keys into Redis DB 1 because NodeBB uses DB 1 on this server.");
  }
  const client = await getRedisClient();
  if (process.argv.includes("--clear-object")) {
    await clearObjectKeys(client);
    console.log("[objects] cleared existing LIAN object keys");
  }
  await migratePostMetadata(client);
  await migrateFeedRules(client);
  await migrateAuth(client);
  await migrateChannelReads(client);
  await migrateUserCache(client);
  await migrateMap(client);
  await migrateArrayLike(client, KEYS.aliasPool, "alias:pool:item", "alias:pool:index", "alias pool");
  await migrateArrayLike(client, KEYS.clubs, "club:item", "club:index", "clubs");
  await migrateJsonList(client, KEYS.aiDrafts, "ai:draft:item", "ai:draft:index", "AI drafts");
  await migrateJsonList(client, KEYS.aiRecords, "ai:record:item", "ai:record:index", "AI records");
  console.log("[objects] done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
