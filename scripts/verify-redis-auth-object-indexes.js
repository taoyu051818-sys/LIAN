import crypto from "node:crypto";

import {
  closeRedisClient,
  getRedisClient,
  redisConfig,
  redisKey
} from "../src/server/storage/redis-client.js";

function stableId(value, fallback = "") {
  const raw = String(value || fallback || "").trim();
  if (raw) return raw.replace(/[^a-zA-Z0-9:_@.-]/g, "_").slice(0, 160);
  return crypto.createHash("sha256").update(JSON.stringify(value ?? fallback)).digest("hex");
}

function normalizeIndexValue(value = "") {
  return String(value || "").trim().toLowerCase();
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

function fail(message) {
  throw new Error(message);
}

async function main() {
  console.log(`[verify:redis:auth] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);

  if (redisConfig.database === 1) {
    fail("Refusing to verify LIAN auth data in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }

  const client = await getRedisClient();

  const userIds = (await client.sMembers(redisKey("auth:user:ids"))).sort();
  const sessionIds = (await client.sMembers(redisKey("auth:sessions"))).sort();
  const inviteIds = (await client.sMembers(redisKey("auth:invites"))).sort();
  const verificationIds = (await client.sMembers(redisKey("auth:verifications"))).sort();

  const counts = {
    users: userIds.length,
    sessions: sessionIds.length,
    invites: inviteIds.length,
    verifications: verificationIds.length
  };

  console.log(JSON.stringify(counts, null, 2));

  if (userIds.length < 1) fail("auth:user:ids is empty");

  for (const id of userIds) {
    const user = await getJson(client, `auth:user:${id}`, null);
    if (!user) fail(`missing auth:user:${id}`);

    if (user.email) {
      const emailKey = stableId(normalizeIndexValue(user.email));
      const indexedId = await client.get(redisKey(`auth:email:${emailKey}`));
      if (indexedId !== id) fail(`email index mismatch for ${user.email}: expected ${id}, got ${indexedId}`);
    }

    if (user.username) {
      const usernameKey = stableId(normalizeIndexValue(user.username));
      const indexedId = await client.get(redisKey(`auth:username:${usernameKey}`));
      if (indexedId !== id) fail(`username index mismatch for ${user.username}: expected ${id}, got ${indexedId}`);
    }
  }

  for (const hash of sessionIds) {
    const session = await getJson(client, `auth:session:${hash}`, null);
    if (!session) fail(`missing auth:session:${hash}`);
    if (!session.userId) fail(`auth:session:${hash} missing userId`);
    const user = await getJson(client, `auth:user:${stableId(session.userId)}`, null);
    if (!user) fail(`auth:session:${hash} points to missing user ${session.userId}`);
  }

  for (const code of inviteIds) {
    const invite = await getJson(client, `auth:invite:${code}`, null);
    if (!invite) fail(`missing auth:invite:${code}`);
    if (!invite.code) fail(`auth:invite:${code} missing code`);
  }

  for (const key of verificationIds) {
    const verification = await getJson(client, `auth:verification:${key}`, null);
    if (!verification) fail(`missing auth:verification:${key}`);
    if (!verification.email && !verification.key) fail(`auth:verification:${key} missing email/key`);
  }

  console.log("[verify:redis:auth] auth object-native indexes verified");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
