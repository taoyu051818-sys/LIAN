import {
  closeRedisClient,
  getRedisClient,
  redisConfig,
  redisKey
} from "../../src/server/storage/redis-client.js";
import { KEYS } from "../../src/server/storage/redis-store.js";

const LEGACY_BULK_KEYS = [
  KEYS.rules,
  KEYS.metadata,
  KEYS.channelReads,
  KEYS.userCache,
  KEYS.mapLocations,
  KEYS.mapLayers,
  KEYS.aliasPool,
  KEYS.clubs,
  KEYS.aiDrafts,
  KEYS.aiRecords
];

function requireDevObjectPrimary() {
  if (redisConfig.database === 1) {
    throw new Error("Refusing to delete LIAN keys in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }
  if (String(process.env.LIAN_REDIS_OBJECT_PRIMARY || "").toLowerCase() !== "true") {
    throw new Error("Refusing to delete legacy bulk keys unless LIAN_REDIS_OBJECT_PRIMARY=true.");
  }
  if (String(process.env.LIAN_REDIS_OBJECT_READS || "").toLowerCase() !== "true") {
    throw new Error("Refusing to delete legacy bulk keys unless LIAN_REDIS_OBJECT_READS=true.");
  }
}

async function main() {
  requireDevObjectPrimary();
  console.log(`[delete:legacy-bulk] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  console.log("[delete:legacy-bulk] preserving auth:store for current login/invite compatibility");

  const client = await getRedisClient();
  const removed = {};

  for (const key of LEGACY_BULK_KEYS) {
    const fullKey = redisKey(key);
    const existed = await client.exists(fullKey);
    if (existed) await client.del(fullKey);
    removed[key] = Boolean(existed);
  }

  console.log(JSON.stringify({ removed }, null, 2));
  console.log("[delete:legacy-bulk] done");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
