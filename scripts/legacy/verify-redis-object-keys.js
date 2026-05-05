import { closeRedisClient, getRedisClient, redisConfig, redisKey } from "../../src/server/storage/redis-client.js";
import { KEYS, readJsonKey, readJsonListKey } from "../../src/server/storage/redis-store.js";

const LAYER_KINDS = ["areas", "routes", "roads", "junctions", "buildings", "environmentElements", "buildingGroups", "assets"];

function countObjectItems(value) {
  if (!value || typeof value !== "object") return 0;
  if (Array.isArray(value)) return value.length;
  if (Array.isArray(value.items)) return value.items.length;
  if (value.items && typeof value.items === "object") return Object.keys(value.items).length;
  return Object.keys(value).length;
}

async function setSize(client, key) {
  return await client.sCard(redisKey(key));
}

async function scanCount(client, pattern, exclude = []) {
  const excluded = new Set(exclude.map((key) => redisKey(key)));
  let count = 0;
  for await (const key of client.scanIterator({ MATCH: redisKey(pattern), COUNT: 200 })) {
    if (excluded.has(key)) continue;
    count += 1;
  }
  return count;
}

function printResult(label, sourceCount, objectCount) {
  const ok = sourceCount === objectCount;
  console.log(`${ok ? "[ok]" : "[fail]"} ${label}: source=${sourceCount} objects=${objectCount}`);
  return ok;
}

async function verifyPostMetadata(client) {
  const data = await readJsonKey(KEYS.metadata, { items: {} });
  const sourceCount = data?.items && typeof data.items === "object" ? Object.keys(data.items).length : 0;
  const objectCount = await setSize(client, "postmeta:tids");
  const keyCount = await scanCount(client, "postmeta:tid:*");
  const ok = printResult("post metadata set", sourceCount, objectCount) && printResult("post metadata keys", sourceCount, keyCount);
  return ok;
}

async function verifyFeedRules(client) {
  const data = await readJsonKey(KEYS.rules, {});
  const sourceCount = countObjectItems(data);
  const objectCount = await setSize(client, "feed:rules:keys");
  const keyCount = await scanCount(client, "feed:rule:*");
  const ok = printResult("feed rules set", sourceCount, objectCount) && printResult("feed rules keys", sourceCount, keyCount);
  return ok;
}

async function verifyAuth(client) {
  const store = await readJsonKey(KEYS.authStore, { users: [], sessions: {}, invites: {}, verifications: {} });
  const users = Array.isArray(store.users) ? store.users.length : 0;
  const sessions = store.sessions && typeof store.sessions === "object" ? Object.keys(store.sessions).length : 0;
  const invites = store.invites && typeof store.invites === "object" ? Object.keys(store.invites).length : 0;
  const verifications = store.verifications && typeof store.verifications === "object" ? Object.keys(store.verifications).length : 0;

  const ok = [
    printResult("auth users set", users, await setSize(client, "auth:user:ids")),
    printResult("auth users keys", users, await scanCount(client, "auth:user:*", ["auth:user:ids"])),
    printResult("auth sessions set", sessions, await setSize(client, "auth:sessions")),
    printResult("auth sessions keys", sessions, await scanCount(client, "auth:session:*")),
    printResult("auth invites set", invites, await setSize(client, "auth:invites")),
    printResult("auth invites keys", invites, await scanCount(client, "auth:invite:*")),
    printResult("auth verifications set", verifications, await setSize(client, "auth:verifications")),
    printResult("auth verifications keys", verifications, await scanCount(client, "auth:verification:*"))
  ].every(Boolean);
  return ok;
}

async function verifyChannelReads(client) {
  const data = await readJsonKey(KEYS.channelReads, { items: {} });
  const sourceCount = data?.items && typeof data.items === "object" ? Object.keys(data.items).length : 0;
  const objectCount = await setSize(client, "channel:read:users");
  const keyCount = await scanCount(client, "channel:read:user:*");
  const ok = printResult("channel reads set", sourceCount, objectCount) && printResult("channel reads keys", sourceCount, keyCount);
  return ok;
}

async function verifyUserCache(client) {
  const data = await readJsonKey(KEYS.userCache, { users: {}, actors: {} });
  const users = data?.users && typeof data.users === "object" ? Object.keys(data.users).length : 0;
  const actors = data?.actors && typeof data.actors === "object" ? Object.keys(data.actors).length : 0;
  const ok = [
    printResult("user cache users set", users, await setSize(client, "usercache:users")),
    printResult("user cache users keys", users, await scanCount(client, "usercache:user:*")),
    printResult("user cache actors set", actors, await setSize(client, "usercache:actors")),
    printResult("user cache actors keys", actors, await scanCount(client, "usercache:actor:*"))
  ].every(Boolean);
  return ok;
}

async function verifyMap(client) {
  const locations = await readJsonKey(KEYS.mapLocations, { items: [] });
  const locationCount = Array.isArray(locations?.items) ? locations.items.length : 0;
  let ok = printResult("map locations set", locationCount, await setSize(client, "map:location:index")) &&
    printResult("map locations keys", locationCount, await scanCount(client, "map:location:*", ["map:location:index"]));

  const layers = await readJsonKey(KEYS.mapLayers, {});
  for (const kind of LAYER_KINDS) {
    const sourceCount = Array.isArray(layers?.[kind]) ? layers[kind].length : 0;
    ok = printResult(`map layer ${kind} set`, sourceCount, await setSize(client, `map:layer:${kind}:index`)) && ok;
    ok = printResult(`map layer ${kind} keys`, sourceCount, await scanCount(client, `map:layer:${kind}:*`, [`map:layer:${kind}:index`])) && ok;
  }
  return ok;
}

async function verifyArrayLike(client, sourceKey, itemPattern, indexKey, label) {
  const data = await readJsonKey(sourceKey, { items: [] });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  const ok = printResult(`${label} set`, items.length, await setSize(client, indexKey)) &&
    printResult(`${label} keys`, items.length, await scanCount(client, itemPattern, [indexKey]));
  return ok;
}

async function verifyJsonList(client, sourceKey, itemPattern, indexKey, label) {
  const rows = await readJsonListKey(sourceKey);
  const ok = printResult(`${label} set`, rows.length, await setSize(client, indexKey)) &&
    printResult(`${label} keys`, rows.length, await scanCount(client, itemPattern, [indexKey]));
  return ok;
}

async function main() {
  console.log(`[verify:objects] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to verify LIAN object keys in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }
  const client = await getRedisClient();
  const results = [];
  results.push(await verifyPostMetadata(client));
  results.push(await verifyFeedRules(client));
  results.push(await verifyAuth(client));
  results.push(await verifyChannelReads(client));
  results.push(await verifyUserCache(client));
  results.push(await verifyMap(client));
  results.push(await verifyArrayLike(client, KEYS.aliasPool, "alias:pool:item:*", "alias:pool:index", "alias pool"));
  results.push(await verifyArrayLike(client, KEYS.clubs, "club:item:*", "club:index", "clubs"));
  results.push(await verifyJsonList(client, KEYS.aiDrafts, "ai:draft:item:*", "ai:draft:index", "AI drafts"));
  results.push(await verifyJsonList(client, KEYS.aiRecords, "ai:record:item:*", "ai:record:index", "AI records"));
  if (results.every(Boolean)) {
    console.log("[verify:objects] object key migration verified");
    return;
  }
  throw new Error("Redis object key verification failed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
