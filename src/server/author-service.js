import { activeAlias } from "./alias-service.js";
import { allowedIdentityTags } from "./auth-service.js";
import { absoluteNodebbUrl, optimizeCloudinaryAvatarUrl } from "./content-utils.js";
import { loadAuthStore } from "./data-store.js";
import { sendJson } from "./http-response.js";
import { makeNodebbGateways } from "./app/gateways/nodebb/index.js";

function normalizeNodebbUid(value) {
  const uid = Number(value || 0);
  return Number.isFinite(uid) && uid > 0 ? uid : 0;
}

function normalizeAvatarUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/assets/aliases/") || raw.startsWith("/assets/")) return raw;
  return optimizeCloudinaryAvatarUrl(absoluteNodebbUrl(raw));
}

function normalizeDisplayName(value = "") {
  return String(value || "").trim().slice(0, 24);
}

function nodebbAuthorFromUser(user = {}) {
  return {
    nodebbUid: normalizeNodebbUid(user.uid),
    displayName: normalizeDisplayName(user.displayname || user.fullname || user.name || user.username || "同学") || "同学",
    avatarUrl: normalizeAvatarUrl(user.picture || user.userslugpicture || user.avatarUrl || ""),
    identityTag: "NodeBB",
    source: "nodebb"
  };
}

function fallbackAuthor(nodebbUid = 0) {
  return {
    nodebbUid: normalizeNodebbUid(nodebbUid),
    displayName: "同学",
    avatarUrl: "",
    identityTag: "校园身份",
    source: "fallback"
  };
}

function authorFromLianUser(user = {}, fallback = {}) {
  const nodebbUid = normalizeNodebbUid(user.nodebbUid || fallback.nodebbUid || fallback.uid);
  const alias = activeAlias(user);
  if (alias && alias.status !== "inactive") {
    return {
      nodebbUid,
      displayName: normalizeDisplayName(alias.name) || "匿名同学",
      avatarUrl: normalizeAvatarUrl(alias.avatarUrl || ""),
      identityTag: "马甲",
      source: "alias",
      aliasId: alias.id || null,
      aliasPoolId: alias.poolId || null
    };
  }

  const identityTag = allowedIdentityTags(user)[0] || user.institution || fallback.identityTag || "校园身份";
  return {
    nodebbUid,
    displayName: normalizeDisplayName(user.displayName || user.nickname || user.username || fallback.displayName || fallback.username) || "同学",
    avatarUrl: normalizeAvatarUrl(user.avatarUrl || user.nodebbPicture || fallback.avatarUrl || fallback.picture || ""),
    identityTag,
    source: "user",
    aliasId: null,
    aliasPoolId: null
  };
}

function buildLianUserIndex(users = []) {
  const byNodebbUid = new Map();
  for (const user of users) {
    const uid = normalizeNodebbUid(user.nodebbUid);
    if (uid && !byNodebbUid.has(uid)) byNodebbUid.set(uid, user);
  }
  return byNodebbUid;
}

async function fetchNodebbAuthorMap(nodebbUids = [], { nodebbUsers = makeNodebbGateways().users } = {}) {
  const uniqueUids = [...new Set(nodebbUids.map(normalizeNodebbUid).filter(Boolean))];
  const entries = await Promise.all(uniqueUids.map(async (uid) => {
    try {
      const data = await nodebbUsers.getUserByUid({ uid });
      return [uid, nodebbAuthorFromUser(data || {})];
    } catch {
      return [uid, fallbackAuthor(uid)];
    }
  }));
  return new Map(entries);
}

async function resolveAuthorsByNodebbUids(nodebbUids = [], options = {}) {
  const uniqueUids = [...new Set(nodebbUids.map(normalizeNodebbUid).filter(Boolean))];
  if (!uniqueUids.length) return new Map();

  const store = await loadAuthStore();
  const lianUsers = buildLianUserIndex(store.users || []);
  const missingNodebbUids = uniqueUids.filter((uid) => !lianUsers.has(uid));
  const nodebbAuthors = await fetchNodebbAuthorMap(missingNodebbUids, options);

  return new Map(uniqueUids.map((uid) => {
    const lianUser = lianUsers.get(uid);
    if (lianUser) return [uid, authorFromLianUser(lianUser, { nodebbUid: uid })];
    return [uid, nodebbAuthors.get(uid) || fallbackAuthor(uid)];
  }));
}

function authorFromTopic(topic = {}, post = {}) {
  const user = post.user || topic.user || {};
  const uid = normalizeNodebbUid(post.uid || user.uid || topic.uid || topic.userId);
  return {
    nodebbUid: uid,
    displayName: normalizeDisplayName(user.displayname || user.fullname || user.name || user.username || topic.username || post.username) || "同学",
    avatarUrl: normalizeAvatarUrl(user.picture || user.userslugpicture || user.avatarUrl || ""),
    identityTag: "校园身份",
    source: uid ? "topic" : "fallback"
  };
}

async function handleAuthors(reqUrl, res) {
  const raw = reqUrl.searchParams.get("nodebbUids") || reqUrl.searchParams.get("uids") || "";
  const uids = raw.split(",").map((item) => normalizeNodebbUid(item)).filter(Boolean).slice(0, 50);
  const authors = await resolveAuthorsByNodebbUids(uids);
  sendJson(res, 200, {
    authors: uids.map((uid) => authors.get(uid) || fallbackAuthor(uid))
  });
}

export {
  authorFromLianUser,
  authorFromTopic,
  fallbackAuthor,
  handleAuthors,
  normalizeAvatarUrl,
  normalizeNodebbUid,
  resolveAuthorsByNodebbUids
};
