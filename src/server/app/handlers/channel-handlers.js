import crypto from "node:crypto";

import { config } from "../../config.js";
import { memory } from "../../cache.js";
import { stripHtml } from "../../content-utils.js";
import {
  loadChannelReads,
  loadMetadata,
  saveChannelReadItems
} from "../../data-store.js";
import { sendJson } from "../../http-response.js";
import { buildChannelMessageHtml } from "../../post-html-service.js";
import { readJsonBody } from "../../request-utils.js";
import {
  ensureNodebbUid,
  getCurrentUser,
  requireUser
} from "../../auth-service.js";
import { makeNodebbGateways } from "../gateways/nodebb/index.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";

function extractRecentTopics(data = {}) {
  if (Array.isArray(data?.topics)) return data.topics;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.response?.topics)) return data.response.topics;
  if (Array.isArray(data)) return data;
  return [];
}

function parseLianUserMeta(html = "") {
  const match = String(html || "").match(/<!--\s*lian-user-meta\s+([\s\S]*?)\s*-->/) ||
    String(html || "").match(/<!--\s*lian-channel-meta\s+([\s\S]*?)\s*-->/);
  if (!match) return {};
  try { return JSON.parse(match[1]); } catch { return {}; }
}

function normalizeChannelEvent(topic = {}, post = {}, reads = {}) {
  const content = post.content || "";
  const userMeta = parseLianUserMeta(content);
  const pid = Number(post.pid || 0);
  const tid = Number(topic.tid || post.tid || 0);
  const id = `${tid}:${pid || topic.timestamp || post.timestamp || "topic"}`;
  return {
    id,
    tid,
    pid,
    title: topic.titleRaw || topic.title || "校园频道",
    contentHtml: content,
    text: stripHtml(content).trim(),
    author: userMeta.displayName || userMeta.username || post.user?.username || topic.user?.username || "同学",
    authorUserId: userMeta.userId || "",
    authorIdentityTag: userMeta.identityTag || "",
    authorAvatarText: userMeta.avatarText || String(userMeta.displayName || userMeta.username || "同").slice(0, 1),
    authorAvatarUrl: userMeta.avatarUrl || "",
    authorAliasId: userMeta.aliasId || "",
    authorAliasName: userMeta.aliasName || "",
    authorActorSource: userMeta.actorSource || "",
    timestampISO: post.timestampISO || topic.timestampISO || "",
    readCount: Array.isArray(reads.items?.[id]?.readers) ? reads.items[id].readers.length : 0,
    nodebbUrl: `${config.nodebbPublicBaseUrl}/post/${pid || tid}`
  };
}

function clientReaderId(req, payload = {}) {
  const raw = payload.readerId || req.headers["x-client-id"] || req.headers["user-agent"] || "anonymous";
  return crypto.createHash("sha1").update(String(raw)).digest("hex").slice(0, 24);
}

function jsonBearerHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${config.nodebbToken}`
  };
}

async function listRecentTopics(nodebbTopics, maxPages = 3) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    try {
      const data = await nodebbTopics.getRecentTopics({ page });
      all.push(...extractRecentTopics(data));
    } catch {
      break;
    }
  }
  return all;
}

async function handleChannelRefactored(reqUrl, req, res) {
  try {
    const limit = Math.min(80, Math.max(10, Number(reqUrl.searchParams.get("limit") || 40)));
    const offset = Math.max(0, Number(reqUrl.searchParams.get("offset") || 0));

    let viewer = null;
    try {
      const auth = await getCurrentUser(req);
      viewer = auth.user || null;
    } catch {
      viewer = null;
    }

    const nodebb = makeNodebbGateways();
    const audiencePolicy = makeAudiencePolicy();
    const reads = await loadChannelReads();
    const metadata = await loadMetadata();
    const topics = await listRecentTopics(nodebb.topics, 3);
    const selectedTopics = topics.slice(offset, offset + limit);
    const events = [];

    for (const topic of selectedTopics) {
      const tid = Number(topic.tid || 0);
      if (!tid) continue;
      try {
        const detail = await nodebb.topics.getTopicDetail({ tid });
        const postMeta = metadata[String(tid)] || {};
        if (!audiencePolicy.canView(viewer, {
          tid,
          visibility: postMeta.visibility || "public",
          audience: postMeta.audience,
          metadata: postMeta
        }, "channel")) continue;

        for (const post of detail?.posts || []) {
          if (!post || post.deleted) continue;
          events.push(normalizeChannelEvent({ ...topic, ...detail, tid }, post, reads));
        }
      } catch {
        // keep channel readable if one topic is unavailable
      }
    }

    events.sort((a, b) => Date.parse(b.timestampISO || 0) - Date.parse(a.timestampISO || 0));
    const selected = events.slice(0, limit);
    sendJson(res, 200, {
      items: selected,
      offset,
      nextOffset: offset + selectedTopics.length < topics.length ? offset + selectedTopics.length : null,
      hasMore: offset + selectedTopics.length < topics.length,
      channelTid: config.nodebbChannelTopicTid || null,
      source: "nodebb"
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleChannelReadRefactored(req, res) {
  try {
    const payload = await readJsonBody(req).catch(() => ({}));
    const eventIds = Array.isArray(payload.eventIds) ? payload.eventIds.map(String).filter(Boolean) : [];
    const readerId = clientReaderId(req, payload);
    const reads = await loadChannelReads();
    const counts = {};
    for (const id of eventIds) {
      if (!reads.items[id]) reads.items[id] = { readers: [] };
      const readers = new Set(Array.isArray(reads.items[id].readers) ? reads.items[id].readers : []);
      readers.add(readerId);
      reads.items[id].readers = Array.from(readers);
      counts[id] = reads.items[id].readers.length;
    }
    await saveChannelReadItems(reads, eventIds);

    const nodebb = makeNodebbGateways();
    let nodebbUid = 0;
    try {
      const auth = await getCurrentUser(req);
      if (auth.user) nodebbUid = await ensureNodebbUid(auth);
    } catch {
      nodebbUid = 0;
    }
    if (nodebbUid) {
      for (const tid of new Set((payload.tids || []).map(Number).filter(Number.isFinite))) {
        await nodebb.topics.markRead({ tid, nodebbUid, headers: jsonBearerHeaders() }).catch(() => {});
      }
    }
    sendJson(res, 200, { ok: true, readCounts: counts });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleChannelMessageRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    if (!config.nodebbToken) return sendJson(res, 500, { error: "LIAN API token is missing" });
    if (auth.user.status === "limited") return sendJson(res, 403, { error: "account is limited" });

    const payload = await readJsonBody(req).catch(() => ({}));
    const content = String(payload.content || "").trim();
    const identityTag = String(payload.identityTag || "").trim();
    if (!content) return sendJson(res, 400, { error: "content is required" });
    if (content.length > 800) return sendJson(res, 400, { error: "content is too long" });

    const nodebbUid = await ensureNodebbUid(auth);
    const nodebb = makeNodebbGateways();
    const html = buildChannelMessageHtml(content, auth.user, identityTag);
    let data;

    if (config.nodebbChannelTopicTid) {
      data = await nodebb.topics.createReply({
        tid: config.nodebbChannelTopicTid,
        nodebbUid,
        headers: jsonBearerHeaders(),
        body: { content: html }
      });
    } else {
      data = await nodebb.topics.createTopic({
        nodebbUid,
        headers: jsonBearerHeaders(),
        body: {
          cid: config.nodebbChannelCid,
          title: "校园频道",
          content: html,
          tags: ["频道消息"]
        }
      });
    }

    const createdTid = Number(data?.response?.tid || data?.tid || data?.topicData?.tid || data?.response?.topicData?.tid || 0);
    if (createdTid) config.nodebbChannelTopicTid = createdTid;
    memory.feedPages.clear();
    memory.topicDetails.clear();
    sendJson(res, 200, data);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

export {
  handleChannelMessageRefactored,
  handleChannelReadRefactored,
  handleChannelRefactored,
  normalizeChannelEvent
};
