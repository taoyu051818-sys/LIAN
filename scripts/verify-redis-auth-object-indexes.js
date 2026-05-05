import assert from "node:assert/strict";

import {
  closeRedisClient,
  redisConfig
} from "../src/server/storage/redis-client.js";
import {
  readRedisObjectAuthInvite,
  readRedisObjectAuthSession,
  readRedisObjectAuthUserById,
  readRedisObjectAuthUserByLogin,
  readRedisObjectAuthVerification
} from "../src/server/storage/redis-object-store.js";
import { KEYS, readJsonKey } from "../src/server/storage/redis-store.js";

function normalizeLogin(value = "") {
  return String(value || "").trim().toLowerCase();
}

function redact(value = "") {
  const raw = String(value || "");
  if (raw.length <= 8) return "***";
  return `${raw.slice(0, 3)}...${raw.slice(-3)}`;
}

async function verifyUsers(store) {
  const users = Array.isArray(store.users) ? store.users : [];
  let byId = 0;
  let byEmail = 0;
  let byUsername = 0;

  for (const user of users) {
    const id = user.id || user.userId || user.uid || user.email || user.username;
    const objectUser = await readRedisObjectAuthUserById(id);
    assert.deepEqual(objectUser, user, `auth user id lookup mismatch for ${id}`);
    byId += 1;

    if (user.email) {
      const emailUser = await readRedisObjectAuthUserByLogin(normalizeLogin(user.email));
      assert.deepEqual(emailUser, user, `auth user email lookup mismatch for ${redact(user.email)}`);
      byEmail += 1;
    }

    if (user.username) {
      const usernameUser = await readRedisObjectAuthUserByLogin(user.username.toUpperCase());
      assert.deepEqual(usernameUser, user, `auth user username lookup mismatch for ${user.username}`);
      byUsername += 1;
    }
  }

  console.log(`[ok] auth users: id=${byId} email=${byEmail} username=${byUsername}`);
}

async function verifySessions(store) {
  const sessions = store.sessions && typeof store.sessions === "object" ? store.sessions : {};
  let count = 0;
  for (const [token, session] of Object.entries(sessions)) {
    const objectSession = await readRedisObjectAuthSession(token);
    assert.ok(objectSession, `auth session lookup failed for token ${redact(token)}`);
    assert.equal(objectSession.userId, session.userId, `auth session userId mismatch for token ${redact(token)}`);
    assert.equal(objectSession.expiresAt, session.expiresAt, `auth session expiresAt mismatch for token ${redact(token)}`);
    assert.ok(objectSession.tokenHash, `auth session tokenHash missing for token ${redact(token)}`);
    assert.equal(JSON.stringify(objectSession).includes(token), false, `auth session stores raw token for ${redact(token)}`);
    count += 1;
  }
  console.log(`[ok] auth sessions: ${count}`);
}

async function verifyInvites(store) {
  const invites = store.invites && typeof store.invites === "object" ? store.invites : {};
  let count = 0;
  for (const [code, invite] of Object.entries(invites)) {
    const objectInvite = await readRedisObjectAuthInvite(code);
    assert.deepEqual(objectInvite, { code, ...invite }, `auth invite lookup mismatch for ${redact(code)}`);
    count += 1;
  }
  console.log(`[ok] auth invites: ${count}`);
}

async function verifyVerifications(store) {
  const verifications = store.verifications && typeof store.verifications === "object" ? store.verifications : {};
  let count = 0;
  for (const [key, verification] of Object.entries(verifications)) {
    const objectVerification = await readRedisObjectAuthVerification(key);
    assert.deepEqual(objectVerification, { key, ...verification }, `auth verification lookup mismatch for ${redact(key)}`);
    count += 1;
  }
  console.log(`[ok] auth verifications: ${count}`);
}

async function main() {
  console.log(`[verify:redis:auth] redis ${redisConfig.host}:${redisConfig.port} db=${redisConfig.database} prefix=${redisConfig.keyPrefix}`);
  if (redisConfig.database === 1) {
    throw new Error("Refusing to verify auth object indexes in Redis DB 1 because NodeBB uses DB 1 on this server.");
  }

  const store = await readJsonKey(KEYS.authStore, { users: [], sessions: {}, invites: {}, verifications: {} });

  await verifyUsers(store);
  await verifySessions(store);
  await verifyInvites(store);
  await verifyVerifications(store);

  console.log("[verify:redis:auth] auth object indexes verified");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await closeRedisClient().catch(() => null);
});
