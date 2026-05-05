import { getCurrentUser, ensureNodebbUid } from "../../auth-service.js";
import { loadMetadata, loadRules } from "../../data-store.js";
import { sendJson } from "../../http-response.js";
import { requireAdmin } from "../../request-utils.js";
import {
  extractCover,
  extractSummary,
  normalizePostImageUrl,
  parseLianUserMeta,
  proxiedPostImageUrl
} from "../../content-utils.js";
import { config } from "../../config.js";
import { makeNodebbGateways } from "../gateways/nodebb/index.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";
import { makeGetFeedUseCase } from "../usecases/feed/get-feed.js";
import { makeGetFeedDebugUseCase } from "../usecases/feed/get-feed-debug.js";
import { makeGetPostDetailUseCase } from "../usecases/posts/get-post-detail.js";

const defaultTabs = ["此刻", "精选"];

function normalizeTopicForClient(topic = {}, metadata = {}) {
  const tid = Number(topic.tid || topic.topic?.tid || topic.id || 0) || 0;
  const post = topic.posts?.[0] || topic.teaser || {};
  const contentHtml = post.content || topic.content || "";
  const userMeta = parseLianUserMeta(contentHtml);
  const meta = metadata || {};
  const tags = Array.isArray(topic.tags) ? topic.tags : [];
  const tag = tags[0]?.value || tags[0]?.name || tags[0] || "";
  const imageUrls = Array.isArray(meta.imageUrls)
    ? meta.imageUrls.map((url) => normalizePostImageUrl(url, { width: 900 })).filter(Boolean)
    : [];
  const cover = imageUrls[0] ? proxiedPostImageUrl(imageUrls[0], { width: 600 }) : extractCover(contentHtml);
  const title = topic.titleRaw || topic.title || meta.title || "未命名";
  return {
    id: String(tid),
    tid,
    title,
    tag,
    tags: tags.map((item) => item.value || item.name || item).filter(Boolean),
    summary: extractSummary(contentHtml, title),
    cover,
    timestampISO: topic.timestampISO || post.timestampISO || "",
    timeLabel: meta.timeLabel || "",
    startsAt: meta.startsAt || null,
    endsAt: meta.endsAt || null,
    expiresAt: meta.expiresAt || null,
    priority: Number(meta.priority || 0),
    isExpired: Boolean(meta.expiresAt && Date.now() > Date.parse(meta.expiresAt)),
    contentType: meta.contentType || "general",
    vibeTags: Array.isArray(meta.vibeTags) ? meta.vibeTags : [],
    sceneTags: Array.isArray(meta.sceneTags) ? meta.sceneTags : [],
    locationId: meta.locationId || "",
    locationArea: meta.locationArea || "",
    qualityScore: Number(meta.qualityScore || 0),
    imageImpactScore: Number(meta.imageImpactScore || 0),
    riskScore: Number(meta.riskScore || 0),
    officialScore: Number(meta.officialScore || 0),
    visibility: meta.visibility || "public",
    audience: meta.audience || null,
    distribution: Array.isArray(meta.distribution) ? meta.distribution : ["home", "search", "detail"],
    keepAfterExpired: Boolean(meta.keepAfterExpired),
    author: userMeta.username || post.user?.username || topic.user?.username || "同学",
    authorUserId: userMeta.userId || "",
    authorIdentityTag: userMeta.identityTag || "",
    authorAvatarText: userMeta.avatarText || String(userMeta.username || "").slice(0, 1),
    authorAvatarUrl: userMeta.avatarUrl || "",
    replyCount: topic.postcount ? Math.max(0, Number(topic.postcount) - 1) : 0,
    firstPostPid: Number(post.pid || topic.mainPid || topic.teaserPid || 0) || null,
    likeCount: Math.max(0, Number(post.upvotes ?? post.votes ?? post.reputation ?? topic.upvotes ?? topic.votes ?? 0) || 0),
    nodebbUrl: `${config.nodebbPublicBaseUrl}/topic/${tid}`,
    sourceUrl: meta.sourceUrl || ""
  };
}

function makePostRepository() {
  return {
    async getByTid(tid) {
      const metadata = await loadMetadata();
      return metadata[String(tid)] || {};
    },
    async listByTids(tids = []) {
      const metadata = await loadMetadata();
      return Object.fromEntries(tids.map((tid) => [String(tid), metadata[String(tid)] || {}]));
    }
  };
}

function makeFeedCache() {
  return {
    async get() { return null; },
    async set() {},
    touchTopic() {}
  };
}

function rankFeedItems(items = []) {
  return [...items].sort((a, b) => {
    const aMeta = a.metadata || {};
    const bMeta = b.metadata || {};
    const aScore = Number(aMeta.priority || 0) + Number(aMeta.qualityScore || 0) * 40 + Number(aMeta.imageImpactScore || 0) * 20 - Number(aMeta.riskScore || 0) * 200;
    const bScore = Number(bMeta.priority || 0) + Number(bMeta.qualityScore || 0) * 40 + Number(bMeta.imageImpactScore || 0) * 20 - Number(bMeta.riskScore || 0) * 200;
    if (bScore !== aScore) return bScore - aScore;
    return Number(b.topic?.timestamp || 0) - Number(a.topic?.timestamp || 0);
  });
}

async function handleFeedRefactored(req, reqUrl, res) {
  try {
    const auth = await getCurrentUser(req);
    const page = Math.max(1, Number(reqUrl.searchParams.get("page") || 1));
    const limit = Math.min(24, Math.max(4, Number(reqUrl.searchParams.get("limit") || 10)));
    const tab = reqUrl.searchParams.get("tab") || "此刻";
    const nodebb = makeNodebbGateways();
    const usecase = makeGetFeedUseCase({
      nodebbTopics: nodebb.topics,
      postRepository: makePostRepository(),
      audiencePolicy: makeAudiencePolicy(),
      ranker: rankFeedItems,
      mapper: ({ topic, metadata }) => normalizeTopicForClient(topic, metadata),
      cache: makeFeedCache()
    });
    const result = await usecase.execute({ actor: auth.user, page, context: "feed" });
    let items = result.items;
    if (tab && !["此刻", "精选"].includes(tab)) {
      items = items.filter((item) => item.tags.includes(tab) || item.tag === tab);
    }
    const start = (page - 1) * limit;
    const selected = items.slice(start, start + limit);
    const rules = await loadRules().catch(() => ({}));
    const tabs = Array.isArray(rules.tabs) && rules.tabs.length ? rules.tabs : defaultTabs;
    sendJson(res, 200, {
      items: selected,
      page,
      nextPage: start + limit < items.length ? page + 1 : null,
      hasMore: start + limit < items.length,
      tabs,
      feedEdition: { mode: "usecase" },
      dataSource: "api"
    });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handleFeedDebugRefactored(req, reqUrl, res) {
  try {
    requireAdmin(req);
    const auth = await getCurrentUser(req);
    const page = Math.max(1, Number(reqUrl.searchParams.get("page") || 1));
    const nodebb = makeNodebbGateways();
    const result = await makeGetFeedDebugUseCase({
      nodebbTopics: nodebb.topics,
      postRepository: makePostRepository(),
      audiencePolicy: makeAudiencePolicy(),
      ranker: rankFeedItems
    }).execute({ actor: auth.user, page });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

async function handlePostDetailRefactored(req, tid, res) {
  try {
    const auth = await getCurrentUser(req);
    const nodebbUid = auth.user?.id ? await ensureNodebbUid(auth) : null;
    const nodebb = makeNodebbGateways();
    const detail = await makeGetPostDetailUseCase({
      nodebbTopics: nodebb.topics,
      audiencePolicy: makeAudiencePolicy(),
      postRepository: makePostRepository(),
      historyRepository: { recordView: async () => {} },
      mapper: ({ topic, metadata }) => {
        const item = normalizeTopicForClient(topic, metadata || {});
        return {
          ...item,
          contentHtml: topic.posts?.[0]?.content || "",
          posts: topic.posts || [],
          raw: topic
        };
      },
      cache: makeFeedCache()
    }).execute({ actor: auth.user, tid, nodebbUid });
    sendJson(res, 200, detail);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

export { handleFeedDebugRefactored, handleFeedRefactored, handlePostDetailRefactored };
