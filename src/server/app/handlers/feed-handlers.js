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
import { makeNodebbGateways } from "../gateways/nodebb/index.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";
import { makeGetFeedUseCase } from "../usecases/feed/get-feed.js";
import { makeGetFeedDebugUseCase } from "../usecases/feed/get-feed-debug.js";
import { makeGetPostDetailUseCase } from "../usecases/posts/get-post-detail.js";

const defaultTabs = [
  { id: "此刻", label: "此刻" },
  { id: "精选", label: "精选" }
];

function normalizeTabs(tabs = []) {
  const source = Array.isArray(tabs) && tabs.length ? tabs : defaultTabs;
  return source
    .map((tab) => {
      if (typeof tab === "string") return { id: tab, label: tab };
      const id = String(tab?.id || tab?.label || "").trim();
      const label = String(tab?.label || tab?.id || "").trim();
      return id && label ? { id, label } : null;
    })
    .filter(Boolean);
}

function normalizeTopicForDomain(topic = {}, metadata = {}) {
  const tid = Number(topic.tid || topic.topic?.tid || 0) || 0;
  const post = topic.posts?.[0] || topic.teaser || {};
  const contentHtml = post.content || topic.content || "";
  const userMeta = parseLianUserMeta(contentHtml);
  const tags = Array.isArray(topic.tags) ? topic.tags : [];
  const tagValues = tags.map((item) => item.value || item.name || item).filter(Boolean);
  const imageUrls = Array.isArray(metadata.imageUrls)
    ? metadata.imageUrls.map((url) => normalizePostImageUrl(url, { width: 900 })).filter(Boolean)
    : [];
  const cover = imageUrls[0] ? proxiedPostImageUrl(imageUrls[0], { width: 600 }) : extractCover(contentHtml);
  const title = topic.titleRaw || topic.title || metadata.title || "未命名";

  return {
    tid,
    title,
    bodyPreview: extractSummary(contentHtml, title),
    contentHtml,
    cover,
    imageUrls,
    tags: tagValues,
    primaryTag: tagValues[0] || "",
    timestampISO: topic.timestampISO || post.timestampISO || "",
    timeLabel: metadata.timeLabel || "",
    contentType: metadata.contentType || "general",
    locationArea: metadata.locationArea || "",
    author: userMeta.username || post.user?.username || topic.user?.username || "同学",
    authorAvatarUrl: userMeta.avatarUrl || "",
    authorIdentityTag: userMeta.identityTag || "",
    likeCount: Math.max(0, Number(post.upvotes ?? post.votes ?? post.reputation ?? topic.upvotes ?? topic.votes ?? 0) || 0),
    liked: false,
    bookmarked: false,
    sourceUrl: metadata.sourceUrl || "",
    metadata,
    topic
  };
}

function toFeedItemDto(item = {}) {
  return {
    tid: Number(item.tid),
    title: String(item.title || "未命名"),
    bodyPreview: String(item.bodyPreview || ""),
    cover: String(item.cover || ""),
    author: String(item.author || "同学"),
    authorAvatarUrl: String(item.authorAvatarUrl || ""),
    authorIdentityTag: String(item.authorIdentityTag || ""),
    timeLabel: String(item.timeLabel || ""),
    timestampISO: String(item.timestampISO || ""),
    likeCount: Math.max(0, Number(item.likeCount || 0) || 0),
    liked: Boolean(item.liked),
    locationArea: String(item.locationArea || ""),
    contentType: String(item.contentType || "general")
  };
}

function toReplyDto(post = {}) {
  return {
    id: Number(post.pid || post.index || 0) || 0,
    content: String(post.content || ""),
    author: String(post.user?.username || "同学"),
    authorAvatarUrl: String(post.user?.picture || post.user?.userslugpicture || ""),
    timestampISO: String(post.timestampISO || "")
  };
}

function toPostDetailDto(item = {}) {
  const posts = Array.isArray(item.topic?.posts) ? item.topic.posts : [];
  const imageUrls = Array.isArray(item.imageUrls) ? item.imageUrls : [];
  return {
    tid: Number(item.tid),
    title: String(item.title || "未命名"),
    contentHtml: String(item.contentHtml || ""),
    cover: String(item.cover || ""),
    imageUrls,
    author: String(item.author || "同学"),
    authorAvatarUrl: String(item.authorAvatarUrl || ""),
    authorIdentityTag: String(item.authorIdentityTag || ""),
    timestampISO: String(item.timestampISO || ""),
    timeLabel: String(item.timeLabel || ""),
    likeCount: Math.max(0, Number(item.likeCount || 0) || 0),
    liked: Boolean(item.liked),
    bookmarked: Boolean(item.bookmarked),
    locationArea: String(item.locationArea || ""),
    sourceUrl: String(item.sourceUrl || ""),
    replies: posts.slice(1).map(toReplyDto)
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
      mapper: ({ topic, metadata }) => normalizeTopicForDomain(topic, metadata),
      cache: makeFeedCache()
    });
    const result = await usecase.execute({ actor: auth.user, page, context: "feed" });
    let items = result.items;
    if (tab && !["此刻", "精选"].includes(tab)) {
      items = items.filter((item) => item.tags.includes(tab) || item.primaryTag === tab);
    }
    const start = (page - 1) * limit;
    const selected = items.slice(start, start + limit);
    const rules = await loadRules().catch(() => ({}));
    const tabs = normalizeTabs(rules.tabs);
    sendJson(res, 200, {
      tabs,
      items: selected.map(toFeedItemDto),
      hasMore: start + limit < items.length,
      nextPage: start + limit < items.length ? page + 1 : null
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
      mapper: ({ topic, metadata }) => normalizeTopicForDomain(topic, metadata || {}),
      cache: makeFeedCache()
    }).execute({ actor: auth.user, tid, nodebbUid });
    sendJson(res, 200, toPostDetailDto(detail));
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

export { handleFeedDebugRefactored, handleFeedRefactored, handlePostDetailRefactored };
