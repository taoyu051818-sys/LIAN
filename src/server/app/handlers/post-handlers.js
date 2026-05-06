import { config } from "../../config.js";
import {
  normalizePostImageUrl,
  warmupPostImages
} from "../../content-utils.js";
import {
  loadMetadata,
  recordUserLike,
  recordUserSave,
  getUserLikedTids,
  getUserSavedTids,
  loadUserCache,
  saveUserCache
} from "../../data-store.js";
import { sendJson } from "../../http-response.js";
import { nodebbFetch, withNodebbUid } from "../../nodebb-client.js";
import {
  buildReplyHtml,
  buildTopicHtml,
  normalizeProfileTopic
} from "../../post-html-service.js";
import {
  buildMapMetadataPatch,
  metadataVisibilityFromAudience
} from "../../post-metadata-service.js";
import { readJsonBody } from "../../request-utils.js";
import { ensureNodebbUid, requireUser } from "../../auth-service.js";
import { findUserAlias } from "../../alias-service.js";
import { makeCacheAdapter } from "../adapters/cache-adapter.js";
import { makeNodebbDeps } from "../adapters/nodebb-deps-adapter.js";
import { makePostRepository } from "../adapters/post-repository-adapter.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";
import { makeInteractionPolicy } from "../policies/interaction-policy.js";
import { makePublishPolicy } from "../policies/publish-policy.js";
import { makeTogglePostLikeUseCase } from "../usecases/posts/toggle-post-like.js";
import { makeTogglePostBookmarkUseCase } from "../usecases/posts/toggle-post-bookmark.js";
import { makeReportPostUseCase } from "../usecases/posts/report-post.js";
import { makeCreateReplyUseCase } from "../usecases/posts/create-reply.js";
import { makeCreatePostUseCase } from "../usecases/posts/create-post.js";
import { makeGetSavedPostsUseCase } from "../usecases/profile/get-saved-posts.js";
import { makeGetLikedPostsUseCase } from "../usecases/profile/get-liked-posts.js";
import { makeGetHistoryPostsUseCase } from "../usecases/profile/get-history-posts.js";

function makeCommonDeps() {
  return {
    nodebb: makeNodebbDeps(),
    audiencePolicy: makeAudiencePolicy(),
    interactionPolicy: makeInteractionPolicy(),
    publishPolicy: makePublishPolicy(),
    postRepository: makePostRepository(),
    cache: makeCacheAdapter()
  };
}

async function handleTogglePostLikeRefactored(tid, req, res) {
  try {
    const auth = await requireUser(req);
    if (!config.nodebbToken) return sendJson(res, 500, { error: "LIAN API token is missing" });
    const payload = await readJsonBody(req).catch(() => ({}));
    const nodebbUid = await ensureNodebbUid(auth);
    const deps = makeCommonDeps();
    const result = await makeTogglePostLikeUseCase({
      nodebbTopics: deps.nodebb.topics,
      nodebbPosts: deps.nodebb.posts,
      audiencePolicy: deps.audiencePolicy,
      interactionPolicy: deps.interactionPolicy,
      postRepository: deps.postRepository,
      userInteractionRepository: {
        recordLike: (actorId, topicId, liked) => recordUserLike(actorId, topicId, liked)
      },
      cache: deps.cache
    }).execute({ actor: auth.user, tid, nodebbUid, desiredLiked: payload.liked });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleTogglePostSaveRefactored(tid, req, res) {
  try {
    const auth = await requireUser(req);
    if (!config.nodebbToken) return sendJson(res, 500, { error: "LIAN API token is missing" });
    const payload = await readJsonBody(req).catch(() => ({}));
    const nodebbUid = await ensureNodebbUid(auth);
    const deps = makeCommonDeps();
    const result = await makeTogglePostBookmarkUseCase({
      nodebbTopics: deps.nodebb.topics,
      nodebbPosts: deps.nodebb.posts,
      audiencePolicy: deps.audiencePolicy,
      interactionPolicy: deps.interactionPolicy,
      postRepository: deps.postRepository,
      userInteractionRepository: {
        recordSave: (actorId, topicId, saved) => recordUserSave(actorId, topicId, saved)
      },
      cache: deps.cache
    }).execute({ actor: auth.user, tid, nodebbUid, desiredSaved: payload.saved });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleReportPostRefactored(tid, req, res) {
  try {
    const auth = await requireUser(req);
    if (!config.nodebbToken) return sendJson(res, 500, { error: "LIAN API token is missing" });
    const payload = await readJsonBody(req).catch(() => ({}));
    const nodebbUid = await ensureNodebbUid(auth);
    const deps = makeCommonDeps();
    const result = await makeReportPostUseCase({
      nodebbTopics: deps.nodebb.topics,
      nodebbPosts: deps.nodebb.posts,
      audiencePolicy: deps.audiencePolicy,
      interactionPolicy: deps.interactionPolicy,
      postRepository: deps.postRepository,
      reportRepository: { recordReport: async () => {} },
      cache: deps.cache
    }).execute({ actor: auth.user, tid, nodebbUid, reason: payload.reason || payload.category });
    sendJson(res, 200, { ok: true, tid: result.tid, pid: result.pid });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleCreatePostRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    if (!config.nodebbToken) return sendJson(res, 500, { error: "LIAN API token is missing" });
    const payload = await readJsonBody(req);
    const title = String(payload.title || "").trim();
    if (!title) return sendJson(res, 400, { error: "title is required" });

    const nodebbUid = await ensureNodebbUid(auth);
    const aliasId = String(payload.aliasId || "").trim();
    const alias = aliasId ? findUserAlias(auth.user, aliasId) : null;
    if (aliasId && !alias) return sendJson(res, 400, { error: "aliasId is invalid or does not belong to current user" });

    const imageUrls = Array.isArray(payload.imageUrls) && payload.imageUrls.length
      ? payload.imageUrls.map((url) => normalizePostImageUrl(url, { width: 1200 })).filter(Boolean)
      : (payload.imageUrl ? [normalizePostImageUrl(payload.imageUrl, { width: 1200 })] : []);
    const audience = makeAudiencePolicy().normalizeForCreate(auth.user, payload.audience, payload.visibility || "public");
    const visibility = metadataVisibilityFromAudience(audience);
    const content = buildTopicHtml({
      ...payload,
      title,
      imageUrls,
      imageUrl: imageUrls[0] || "",
      currentUser: auth.user,
      alias
    });
    const tags = Array.isArray(payload.tags) && payload.tags.length ? payload.tags : (payload.tag ? [payload.tag] : []);
    const deps = makeCommonDeps();
    const result = await makeCreatePostUseCase({
      nodebbTopics: deps.nodebb.topics,
      publishPolicy: deps.publishPolicy,
      audiencePolicy: deps.audiencePolicy,
      postRepository: deps.postRepository,
      cache: deps.cache
    }).execute({
      actor: auth.user,
      nodebbUid,
      payload: {
        ...payload,
        title,
        content,
        cid: Number(payload.cid || config.nodebbCid),
        tags,
        audience,
        metadata: {
          title,
          imageUrls,
          visibility,
          audience,
          ...buildMapMetadataPatch(payload.mapLocation)
        }
      }
    });
    if (imageUrls.length) await warmupPostImages(imageUrls);
    sendJson(res, 200, result.topic);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function getUserSlug(nodebbUid) {
  try {
    const data = await nodebbFetch(`/api/user/uid/${nodebbUid}`);
    return data?.userslug || data?.slug || "";
  } catch {
    return "";
  }
}

async function hydrateProfileItems(items, auth, nodebbUid) {
  const metadata = await loadMetadata();
  const output = [];
  for (const item of items.slice(0, 50)) {
    const tid = Number(item.tid || item.topic?.tid || item.topicId || item.id || 0) || 0;
    if (!tid) continue;
    const meta = metadata[String(tid)] || {};
    if (!makeAudiencePolicy().canView(auth.user, { visibility: meta.visibility, audience: meta.audience })) continue;
    try {
      const detail = await nodebbFetch(withNodebbUid(`/api/topic/${tid}`, nodebbUid));
      output.push(normalizeProfileTopic(detail, metadata));
    } catch {
      output.push(normalizeProfileTopic({ ...item, tid }, metadata));
    }
  }
  return output;
}

async function handleGetSavedPostsRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    const nodebbUid = await ensureNodebbUid(auth);
    const slug = await getUserSlug(nodebbUid);
    const deps = makeCommonDeps();
    const result = await makeGetSavedPostsUseCase({
      nodebbUsers: deps.nodebb.users,
      postRepository: deps.postRepository,
      audiencePolicy: deps.audiencePolicy,
      cache: deps.cache
    }).execute({ actor: auth.user, slug, nodebbUid });
    let items = result.items;
    if (items.length) {
      const tids = items.map((item) => Number(item.tid || item.topic?.tid)).filter(Boolean);
      const cache = await loadUserCache();
      cache.users[auth.user.id] = { ...(cache.users[auth.user.id] || {}), savedTids: tids, updatedAt: new Date().toISOString() };
      saveUserCache(cache).catch(() => {});
    } else {
      items = getUserSavedTids(auth.user.id).map((tid) => ({ tid }));
    }
    sendJson(res, 200, { items: await hydrateProfileItems(items, auth, nodebbUid) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleGetLikedPostsRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    const nodebbUid = await ensureNodebbUid(auth);
    const slug = await getUserSlug(nodebbUid);
    const deps = makeCommonDeps();
    const result = await makeGetLikedPostsUseCase({
      nodebbUsers: deps.nodebb.users,
      postRepository: deps.postRepository,
      audiencePolicy: deps.audiencePolicy,
      cache: deps.cache
    }).execute({ actor: auth.user, slug, nodebbUid });
    let items = result.items;
    if (items.length) {
      const tids = items.map((item) => Number(item.tid || item.topic?.tid)).filter(Boolean);
      const cache = await loadUserCache();
      cache.users[auth.user.id] = { ...(cache.users[auth.user.id] || {}), likedTids: tids, updatedAt: new Date().toISOString() };
      saveUserCache(cache).catch(() => {});
    } else {
      items = getUserLikedTids(auth.user.id).map((tid) => ({ tid }));
    }
    sendJson(res, 200, { items: await hydrateProfileItems(items, auth, nodebbUid) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleGetHistoryRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    const nodebbUid = await ensureNodebbUid(auth);
    const payload = await readJsonBody(req).catch(() => ({}));
    const tids = Array.isArray(payload.tids) ? payload.tids.map(Number).filter(Boolean) : [];
    if (!tids.length) return sendJson(res, 200, { items: [] });
    const deps = makeCommonDeps();
    const result = await makeGetHistoryPostsUseCase({
      historyRepository: { listByActor: async () => tids.map((tid) => ({ tid })) },
      postRepository: deps.postRepository,
      audiencePolicy: deps.audiencePolicy,
      cache: deps.cache
    }).execute({ actor: auth.user, limit: 50 });
    sendJson(res, 200, { items: await hydrateProfileItems(result.items, auth, nodebbUid) });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function replyToNodebbTopicRefactored(tid, content, user = null, nodebbUid = null) {
  const html = buildReplyHtml(content, user);
  const deps = makeCommonDeps();
  const result = await makeCreateReplyUseCase({
    nodebbTopics: deps.nodebb.topics,
    audiencePolicy: { assertCanView: () => true },
    interactionPolicy: { assertCanReply: () => true },
    postRepository: { getByTid: async () => ({}) },
    replyRepository: { recordReply: async () => {} },
    cache: deps.cache
  }).execute({
    actor: user || { id: "system" },
    tid,
    nodebbUid: nodebbUid || config.nodebbUid,
    payload: { content: html }
  });
  return result.reply;
}

export {
  handleCreatePostRefactored,
  handleGetHistoryRefactored,
  handleGetLikedPostsRefactored,
  handleGetSavedPostsRefactored,
  handleReportPostRefactored,
  handleTogglePostLikeRefactored,
  handleTogglePostSaveRefactored,
  replyToNodebbTopicRefactored
};
