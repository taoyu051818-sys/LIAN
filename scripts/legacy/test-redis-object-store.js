import assert from "node:assert/strict";

import { closeRedisClient, getRedisClient, redisConfig, redisKey } from "../../src/server/storage/redis-client.js";
import { appendRedisObjectListItem, readRedisObjectData, writeRedisObjectData } from "../../src/server/storage/redis-object-store.js";
import { KEYS } from "../../src/server/storage/redis-store.js";

const REQUIRED_TEST_PREFIX_FRAGMENT = ":test:";

async function clearPrefix(client) {
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: redisKey("*"), COUNT: 200 })) {
    keys.push(key);
    if (keys.length >= 500) await client.del(keys.splice(0));
  }
  if (keys.length) await client.del(keys);
}

async function setSize(client, key) {
  return await client.sCard(redisKey(key));
}

async function main() {
  console.log(`[test:redis:objects] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to test object store in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }
  if (!redisConfig.keyPrefix.includes(REQUIRED_TEST_PREFIX_FRAGMENT)) {
    throw new Error(`Refusing to run object-store smoke test without an isolated test prefix containing ${REQUIRED_TEST_PREFIX_FRAGMENT}. Current prefix=${redisConfig.keyPrefix}`);
  }

  const client = await getRedisClient();
  await clearPrefix(client);

  await writeRedisObjectData(KEYS.metadata, {
    version: 1,
    items: {
      "101": { title: "Alpha", priority: 10 },
      "102": { title: "Beta", priority: 20 }
    }
  });
  assert.deepEqual(await readRedisObjectData(KEYS.metadata, { version: 1, items: {} }), {
    version: 1,
    items: {
      "101": { title: "Alpha", priority: 10 },
      "102": { title: "Beta", priority: 20 }
    }
  });
  assert.equal(await setSize(client, "postmeta:tids"), 2);

  await writeRedisObjectData(KEYS.rules, { tabs: ["精选"], coverBonus: 5 });
  assert.deepEqual(await readRedisObjectData(KEYS.rules, {}), { tabs: ["精选"], coverBonus: 5 });
  assert.equal(await setSize(client, "feed:rules:keys"), 2);

  await writeRedisObjectData(KEYS.channelReads, {
    version: 1,
    items: {
      ty: { lastReadAt: "2026-05-04T00:00:00.000Z" },
      guest: { lastReadAt: "2026-05-04T00:01:00.000Z" }
    }
  });
  assert.equal(Object.keys((await readRedisObjectData(KEYS.channelReads, null)).items).length, 2);
  assert.equal(await setSize(client, "channel:read:users"), 2);

  await writeRedisObjectData(KEYS.userCache, {
    version: 1,
    users: {
      ty: { likedTids: [101], savedTids: [102], updatedAt: "2026-05-04T00:00:00.000Z" }
    },
    actors: {
      "3": { username: "ty", updatedAt: "2026-05-04T00:00:00.000Z" }
    }
  });
  const userCache = await readRedisObjectData(KEYS.userCache, null);
  assert.deepEqual(userCache.users.ty.likedTids, [101]);
  assert.equal(userCache.actors["3"].username, "ty");
  assert.equal(await setSize(client, "usercache:users"), 1);
  assert.equal(await setSize(client, "usercache:actors"), 1);

  await writeRedisObjectData(KEYS.mapLocations, {
    version: 1,
    coordSystem: "gcj02",
    items: [
      { id: "school", name: "School", lat: 18.1, lng: 110.1 },
      { id: "gate", name: "Gate", lat: 18.2, lng: 110.2 }
    ]
  });
  assert.equal((await readRedisObjectData(KEYS.mapLocations, null)).items.length, 2);
  assert.equal(await setSize(client, "map:location:index"), 2);

  await writeRedisObjectData(KEYS.mapLayers, {
    version: 1,
    assets: [{ id: "asset-1", type: "marker" }]
  });
  assert.equal((await readRedisObjectData(KEYS.mapLayers, null)).assets.length, 1);
  assert.equal(await setSize(client, "map:layer:assets:index"), 1);

  await writeRedisObjectData(KEYS.aliasPool, { version: 1, items: [{ id: "a", value: "alias" }] });
  assert.equal((await readRedisObjectData(KEYS.aliasPool, null)).items.length, 1);
  assert.equal(await setSize(client, "alias:pool:index"), 1);

  await writeRedisObjectData(KEYS.clubs, { version: 1, items: [{ id: "club-1", name: "Club" }] });
  assert.equal((await readRedisObjectData(KEYS.clubs, null)).items.length, 1);
  assert.equal(await setSize(client, "club:index"), 1);

  await appendRedisObjectListItem(KEYS.aiDrafts, { id: "draft-1", text: "draft" });
  await appendRedisObjectListItem(KEYS.aiRecords, { id: "record-1", text: "record" });
  assert.equal(await setSize(client, "ai:draft:index"), 1);
  assert.equal(await setSize(client, "ai:record:index"), 1);

  await clearPrefix(client);
  console.log("[test:redis:objects] object store smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
