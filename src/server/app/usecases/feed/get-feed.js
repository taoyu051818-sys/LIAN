function extractRecentTopics(data = {}) {
  if (Array.isArray(data?.topics)) return data.topics;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function topicIdOf(topic = {}) {
  return Number(topic.tid || topic.topicId || topic.id || 0) || 0;
}

function defaultRankFeedItems(items = []) {
  return items;
}

function defaultMapFeedItem({ topic, metadata } = {}) {
  return {
    ...topic,
    metadata: metadata || null
  };
}

function makeGetFeedUseCase({
  nodebbTopics,
  postRepository,
  audiencePolicy,
  ranker = defaultRankFeedItems,
  mapper = defaultMapFeedItem,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, page = 1, nodebbUid, context = "feed" } = {}) {
      const cacheKey = `feed:${context}:${actor?.id || "anonymous"}:${Number(page) || 1}`;
      const cached = await cache?.get?.(cacheKey);
      if (cached) return cached;

      let recent;
      try {
        recent = await nodebbTopics.getRecentTopics({ page });
      } catch (error) {
        logger.warn?.(`[get-feed] recent topics fetch failed page=${page}: ${error.message}`);
        throw error;
      }

      const topics = extractRecentTopics(recent);
      const tids = topics.map(topicIdOf).filter(Boolean);
      const metadataByTid = await postRepository?.listByTids?.(tids) || {};

      const composed = topics.map((topic) => {
        const tid = topicIdOf(topic);
        const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
        return { topic, metadata, tid };
      });

      const visible = audiencePolicy?.filterVisible
        ? audiencePolicy.filterVisible(actor, composed.map((item) => ({
            ...item.topic,
            visibility: item.metadata?.visibility,
            audience: item.metadata?.audience,
            metadata: item.metadata
          })), context)
        : composed.map((item) => item.topic);

      const visibleIds = new Set(visible.map(topicIdOf).filter(Boolean));
      const filtered = composed.filter((item) => visibleIds.has(item.tid));
      const ranked = ranker(filtered, { actor, page, context });
      const items = ranked.map((item) => mapper({ actor, topic: item.topic, metadata: item.metadata, context }));

      const result = {
        ok: true,
        page: Number(page) || 1,
        items,
        source: "nodebb"
      };
      await cache?.set?.(cacheKey, result, { ttlSeconds: 30 });
      return result;
    }
  };
}

export {
  defaultMapFeedItem,
  defaultRankFeedItems,
  extractRecentTopics,
  makeGetFeedUseCase,
  topicIdOf
};
