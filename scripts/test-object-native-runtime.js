import assert from "node:assert/strict";

import {
  getCurrentUser,
  hashPassword
} from "../src/server/auth-service.js";
import {
  appendJsonLine,
  loadMetadata,
  loadUserCache,
  patchPostMetadata,
  recordUserLike,
  recordUserSave
} from "../src/server/data-store.js";
import { closeRedisClient } from "../src/server/storage/redis-client.js";
import { KEYS } from "../src/server/storage/redis-store.js";
import {
  deleteRedisObjectAuthSession,
  readRedisObjectAuthInvite,
  readRedisObjectAuthSession,
  readRedisObjectAuthUserById,
  readRedisObjectAuthUserByLogin,
  readRedisObjectAuthVerification,
  readRedisObjectData,
  writeRedisObjectAuthInvite,
  writeRedisObjectAuthSession,
  writeRedisObjectAuthUser,
  writeRedisObjectAuthVerification,
  writeRedisObjectChannelReadItem
} from "../src/server/storage/redis-object-store.js";

function requireSwitch(name) {
  if (String(process.env[name] || "").toLowerCase() !== "true") {
    throw new Error(`${name}=true is required`);
  }
}

async function main() {
  requireSwitch("LIAN_REDIS_OBJECT_READS");
  requireSwitch("LIAN_REDIS_OBJECT_PRIMARY");
  requireSwitch("LIAN_AUTH_OBJECT_READS");
  requireSwitch("LIAN_AUTH_OBJECT_NATIVE");

  const suffix = Date.now();
  const userId = `object-native-user-${suffix}`;
  const username = `object_native_${suffix}`;
  const email = `object-native-${suffix}@dev.local`;
  const token = `object-native-token-${suffix}`;
  const tid = 990000 + Math.floor(Math.random() * 1000);
  const inviteCode = `DEV${String(suffix).slice(-5)}`;
  const verificationKey = email.toLowerCase();

  const user = {
    id: userId,
    email,
    username,
    password: hashPassword("object-native-password"),
    tags: ["开发注册"],
    status: "active",
    registerMethod: "object-native-test",
    invitePermission: true,
    createdAt: new Date().toISOString()
  };

  await writeRedisObjectAuthUser(user);
  await writeRedisObjectAuthSession(token, {
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600_000).toISOString()
  });

  assert.equal((await readRedisObjectAuthUserById(userId)).id, userId);
  assert.equal((await readRedisObjectAuthUserByLogin(username)).id, userId);
  assert.equal((await readRedisObjectAuthUserByLogin(email)).id, userId);
  assert.equal((await readRedisObjectAuthSession(token)).userId, userId);

  const auth = await getCurrentUser({ headers: { cookie: `lian_session=${encodeURIComponent(token)}` } });
  assert.equal(auth.user.id, userId);
  assert.equal(auth.token, token);

  await writeRedisObjectAuthInvite(inviteCode, {
    code: inviteCode,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    usedBy: null,
    usedAt: null
  });
  assert.equal((await readRedisObjectAuthInvite(inviteCode)).createdBy, userId);

  await writeRedisObjectAuthVerification(verificationKey, {
    email,
    hash: "dev-hash",
    sentAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    usedAt: null,
    attempts: 0
  });
  assert.equal((await readRedisObjectAuthVerification(verificationKey)).email, email);

  await patchPostMetadata(tid, { title: "object native unified test", testRun: suffix });
  const metadata = await loadMetadata();
  assert.equal(metadata[String(tid)].testRun, suffix);

  await recordUserLike(userId, tid, true);
  await recordUserSave(userId, tid, true);
  const cache = await loadUserCache();
  assert.equal(cache.users[userId].likedTids.includes(tid), true);
  assert.equal(cache.users[userId].savedTids.includes(tid), true);

  await writeRedisObjectChannelReadItem(`object-native-channel-${suffix}`, {
    readers: [userId],
    updatedAt: new Date().toISOString()
  });
  const reads = await readRedisObjectData(KEYS.channelReads, { items: {} });
  assert.ok(reads.items[`object-native-channel-${suffix}`]);

  await appendJsonLine("/opt/lian-platform-server/data/ai-post-drafts.jsonl", { id: `draft-${suffix}`, ok: true });
  await appendJsonLine("/opt/lian-platform-server/data/ai-post-records.jsonl", { id: `record-${suffix}`, ok: true });

  await deleteRedisObjectAuthSession(token);
  const loggedOut = await getCurrentUser({ headers: { cookie: `lian_session=${encodeURIComponent(token)}` } });
  assert.equal(loggedOut.user, null);

  console.log(JSON.stringify({
    ok: true,
    mode: "object-native",
    userId,
    username,
    tid,
    inviteCode
  }, null, 2));
}

main().finally(async () => {
  await closeRedisClient().catch(() => null);
});
