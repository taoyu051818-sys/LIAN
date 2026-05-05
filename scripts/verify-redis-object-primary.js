import {
  closeRedisClient,
  getRedisClient,
  redisConfig,
  redisKey
} from "../src/server/storage/redis-client.js";
import { KEYS } from "../src/server/storage/redis-store.js";
import { readRedisObjectData } from "../src/server/storage/redis-object-store.js";

function fail(message) {
  throw new Error(message);
}

async function setCount(client, key) {
  return await client.sCard(redisKey(key));
}

async function listCount(client, key) {
  return await client.lLen(redisKey(key));
}

async function keyExists(client, key) {
  return (await client.exists(redisKey(key))) > 0;
}

async function main() {
  console.log(`[verify:object-primary] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    fail("Refusing to verify LIAN object-primary data in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }

  const client = await getRedisClient();

  const metadata = await readRedisObjectData(KEYS.metadata, { items: {} });
  const channelReads = await readRedisObjectData(KEYS.channelReads, { items: {} });
  const userCache = await readRedisObjectData(KEYS.userCache, { users: {}, actors: {} });
  const locations = await readRedisObjectData(KEYS.mapLocations, { items: [] });
  const layers = await readRedisObjectData(KEYS.mapLayers, {});
  const clubs = await readRedisObjectData(KEYS.clubs, { items: [] });

  const counts = {
    postMetadata: Object.keys(metadata?.items || {}).length,
    channelReads: Object.keys(channelReads?.items || {}).length,
    userCacheUsers: Object.keys(userCache?.users || {}).length,
    userCacheActors: Object.keys(userCache?.actors || {}).length,
    mapLocations: Array.isArray(locations?.items) ? locations.items.length : 0,
    mapAssets: Array.isArray(layers?.assets) ? layers.assets.length : 0,
    clubs: Array.isArray(clubs?.items) ? clubs.items.length : 0,
    authUsers: await setCount(client, "auth:user:ids"),
    authSessions: await setCount(client, "auth:sessions"),
    authInvites: await setCount(client, "auth:invites"),
    authVerifications: await setCount(client, "auth:verifications"),
    aiDraftObjects: await setCount(client, "ai:draft:index"),
    aiRecordObjects: await setCount(client, "ai:record:index"),
    aiDraftBulkList: await listCount(client, KEYS.aiDrafts),
    aiRecordBulkList: await listCount(client, KEYS.aiRecords),
    hasMapLayerBundle: await keyExists(client, "map:layer:bundle")
  };

  console.log(JSON.stringify(counts, null, 2));

  if (counts.postMetadata < 1) fail("post metadata object index is empty");
  if (counts.authUsers < 1) fail("auth user object index is empty");
  if (counts.authSessions < 1) fail("auth session object index is empty");
  if (counts.mapLocations < 1) fail("map location object index is empty");
  if (counts.clubs < 1) fail("club object index is empty");
  if (!counts.hasMapLayerBundle) fail("map layer object bundle is missing");

  console.log("[verify:object-primary] object-primary data verified");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
