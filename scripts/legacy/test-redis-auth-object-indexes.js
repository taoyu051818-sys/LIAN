import assert from "node:assert/strict";

import {
  closeRedisClient,
  getRedisClient,
  redisConfig,
  redisKey
} from "../../src/server/storage/redis-client.js";
import {
  deleteRedisObjectAuthSession,
  readRedisObjectAuthInvite,
  readRedisObjectAuthSession,
  readRedisObjectAuthUserById,
  readRedisObjectAuthUserByLogin,
  readRedisObjectAuthVerification,
  writeRedisObjectAuthInvite,
  writeRedisObjectAuthSession,
  writeRedisObjectAuthUser,
  writeRedisObjectAuthVerification
} from "../../src/server/storage/redis-object-store.js";

const REQUIRED_TEST_PREFIX_FRAGMENT = ":test:";

async function clearPrefix(client) {
  const keys = [];
  for await (const key of client.scanIterator({ MATCH: redisKey("*"), COUNT: 200 })) {
    keys.push(key);
    if (keys.length >= 500) await client.del(keys.splice(0));
  }
  if (keys.length) await client.del(keys);
}

async function main() {
  console.log(`[test:redis:auth] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to test auth object indexes in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }
  if (!redisConfig.keyPrefix.includes(REQUIRED_TEST_PREFIX_FRAGMENT)) {
    throw new Error(`Refusing to run auth object index smoke test without an isolated test prefix containing ${REQUIRED_TEST_PREFIX_FRAGMENT}. Current prefix=${redisConfig.keyPrefix}`);
  }

  const client = await getRedisClient();
  await clearPrefix(client);

  const user = {
    id: "user-auth-test-1",
    email: "Auth.Test+One@Example.edu",
    username: "AuthTester",
    status: "active",
    tags: ["高校认证"],
    createdAt: "2026-05-05T00:00:00.000Z"
  };
  assert.equal(await writeRedisObjectAuthUser(user), true);
  assert.deepEqual(await readRedisObjectAuthUserById(user.id), user);
  assert.deepEqual(await readRedisObjectAuthUserByLogin("auth.test+one@example.edu"), user);
  assert.deepEqual(await readRedisObjectAuthUserByLogin("AUTHTESTER"), user);
  assert.equal(await client.sCard(redisKey("auth:user:ids")), 1);

  const token = "secret-session-token-that-should-not-be-stored-raw";
  const session = {
    userId: user.id,
    createdAt: "2026-05-05T00:00:00.000Z",
    expiresAt: "2026-06-05T00:00:00.000Z"
  };
  assert.equal(await writeRedisObjectAuthSession(token, session), true);
  const sessionRead = await readRedisObjectAuthSession(token);
  assert.equal(sessionRead.userId, user.id);
  assert.equal(sessionRead.expiresAt, session.expiresAt);
  assert.ok(sessionRead.tokenHash);
  assert.equal(JSON.stringify(sessionRead).includes(token), false);
  assert.equal(await client.sCard(redisKey("auth:sessions")), 1);
  assert.equal(await deleteRedisObjectAuthSession(token), true);
  assert.equal(await readRedisObjectAuthSession(token), null);
  assert.equal(await client.sCard(redisKey("auth:sessions")), 0);

  const invite = {
    createdBy: user.id,
    usedBy: null,
    expiresAt: "2026-06-05T00:00:00.000Z"
  };
  assert.equal(await writeRedisObjectAuthInvite("INVITE-ABC", invite), true);
  assert.deepEqual(await readRedisObjectAuthInvite("INVITE-ABC"), { code: "INVITE-ABC", ...invite });
  assert.equal(await client.sCard(redisKey("auth:invites")), 1);

  const verification = {
    hash: "verification-hash",
    createdAt: "2026-05-05T00:00:00.000Z",
    expiresAt: "2026-05-05T00:10:00.000Z"
  };
  assert.equal(await writeRedisObjectAuthVerification("Auth.Test+One@Example.edu", verification), true);
  assert.deepEqual(await readRedisObjectAuthVerification("auth.test+one@example.edu"), {
    key: "Auth.Test+One@Example.edu",
    ...verification
  });
  assert.equal(await client.sCard(redisKey("auth:verifications")), 1);

  await clearPrefix(client);
  console.log("[test:redis:auth] auth object index smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
