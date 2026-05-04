import { getRedisClient, redisKey } from "./redis-client.js";

const KEYS = {
  rules: "feed:rules:current",
  metadata: "postmeta:items",
  channelReads: "channel:reads",
  authStore: "auth:store",
  userCache: "usercache",
  mapLocations: "map:locations",
  mapLayers: "map:layers",
  aliasPool: "alias:pool",
  clubs: "clubs",
  aiDrafts: "ai:drafts",
  aiRecords: "ai:records"
};

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readJsonKey(name, fallback) {
  const client = await getRedisClient();
  return parseJson(await client.get(redisKey(name)), fallback);
}

async function writeJsonKey(name, data) {
  const client = await getRedisClient();
  await client.set(redisKey(name), JSON.stringify(data));
}

async function appendJsonArrayKey(name, data) {
  const client = await getRedisClient();
  await client.rPush(redisKey(name), JSON.stringify(data));
}

async function readJsonListKey(name) {
  const client = await getRedisClient();
  const values = await client.lRange(redisKey(name), 0, -1);
  return values.map((value) => parseJson(value, null)).filter(Boolean);
}

async function keyExists(name) {
  const client = await getRedisClient();
  return (await client.exists(redisKey(name))) === 1;
}

async function deleteLianKeys() {
  const client = await getRedisClient();
  for await (const key of client.scanIterator({ MATCH: redisKey("*"), COUNT: 200 })) {
    await client.del(key);
  }
}

export {
  KEYS,
  appendJsonArrayKey,
  deleteLianKeys,
  keyExists,
  readJsonKey,
  readJsonListKey,
  writeJsonKey
};
