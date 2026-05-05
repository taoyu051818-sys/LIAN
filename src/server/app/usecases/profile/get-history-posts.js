function historyTopicId(item = {}) {
  return Number(item.tid || item.topic?.tid || item.topicId || item.id || 0) || 0;
}

function defaultMapHistoryPost({ item, metadata } = {}) {
  return {
    ...item,
    history: true,
    metadata: metadata || null
  };
}

function makeGetHistoryPostsUseCase({
  historyRepository,
  postRepository,
  audiencePolicy,
  mapper = defaultMapHistoryPost,
  cache
} = {}) {
  return {
    async execute({ actor, limit = 50 } = {}) {
      if (!actor?.id) {
        const error = new Error("login required");
        error.status = 401;
        throw error;
      }

      const cacheKey = `profile:history:${actor.id}:${Number(limit) || 50}`;
      const cached = await cache?.get?.(cacheKey);
      if (cached) return cached;

      const items = await historyRepository?.listByActor?.(actor.id, { limit }) || [];
      const tids = [...new Set(items.map(historyTopicId).filter(Boolean))];
      const metadataByTid = await postRepository?.listByTids?.(tids) || {};

      const visible = items.filter((item) => {
        const tid = historyTopicId(item);
        if (!tid) return true;
        const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
        if (!audiencePolicy?.canView) return true;
        return audiencePolicy.canView(actor, {
          tid,
          visibility: metadata?.visibility,
          audience: metadata?.audience,
          metadata
        }, "profile-history");
      });

      const result = {
        ok: true,
        items: visible.map((item) => {
          const tid = historyTopicId(item);
          const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
          return mapper({ actor, item, metadata });
        }),
        source: "lian"
      };
      await cache?.set?.(cacheKey, result, { ttlSeconds: 30 });
      return result;
    }
  };
}

export { defaultMapHistoryPost, historyTopicId, makeGetHistoryPostsUseCase };
