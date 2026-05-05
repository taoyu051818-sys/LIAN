import {
  extractRecentTopics,
  topicIdOf
} from "./get-feed.js";

function defaultExplainFeedItem({ item, visible, rankIndex } = {}) {
  return {
    tid: item?.tid || topicIdOf(item?.topic),
    visible: Boolean(visible),
    rankIndex,
    hasMetadata: Boolean(item?.metadata),
    visibility: item?.metadata?.visibility || null,
    audience: item?.metadata?.audience || null
  };
}

function makeGetFeedDebugUseCase({
  nodebbTopics,
  postRepository,
  audiencePolicy,
  ranker = (items) => items,
  explain = defaultExplainFeedItem,
  logger = console
} = {}) {
  return {
    async execute({ actor, page = 1, nodebbUid, context = "feed-debug" } = {}) {
      let recent;
      try {
        recent = await nodebbTopics.getRecentTopics({ page });
      } catch (error) {
        logger.warn?.(`[get-feed-debug] recent topics fetch failed page=${page}: ${error.message}`);
        throw error;
      }

      const topics = extractRecentTopics(recent);
      const tids = topics.map(topicIdOf).filter(Boolean);
      const metadataByTid = await postRepository?.listByTids?.(tids) || {};
      const composed = topics.map((topic) => {
        const tid = topicIdOf(topic);
        return {
          tid,
          topic,
          metadata: metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null
        };
      });

      const visiblePosts = audiencePolicy?.filterVisible
        ? audiencePolicy.filterVisible(actor, composed.map((item) => ({
            ...item.topic,
            visibility: item.metadata?.visibility,
            audience: item.metadata?.audience,
            metadata: item.metadata
          })), "feed")
        : composed.map((item) => item.topic);
      const visibleIds = new Set(visiblePosts.map(topicIdOf).filter(Boolean));
      const filtered = composed.filter((item) => visibleIds.has(item.tid));
      const ranked = ranker(filtered, { actor, page, context });
      const rankByTid = new Map(ranked.map((item, index) => [item.tid, index]));

      return {
        ok: true,
        page: Number(page) || 1,
        counts: {
          recent: topics.length,
          withMetadata: composed.filter((item) => item.metadata).length,
          visible: filtered.length,
          ranked: ranked.length
        },
        items: composed.map((item) => explain({
          item,
          actor,
          visible: visibleIds.has(item.tid),
          rankIndex: rankByTid.has(item.tid) ? rankByTid.get(item.tid) : null
        })),
        source: "nodebb"
      };
    }
  };
}

export { defaultExplainFeedItem, makeGetFeedDebugUseCase };
