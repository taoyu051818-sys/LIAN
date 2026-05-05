function extractUserCollectionTopics(data = {}) {
  if (Array.isArray(data?.topics)) return data.topics;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function collectionTopicId(item = {}) {
  return Number(item.tid || item.topic?.tid || item.topicId || item.id || 0) || 0;
}

function defaultMapSavedPost({ item, metadata } = {}) {
  return {
    ...item,
    saved: true,
    metadata: metadata || null
  };
}

function makeGetSavedPostsUseCase({
  nodebbUsers,
  postRepository,
  audiencePolicy,
  mapper = defaultMapSavedPost,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, slug, nodebbUid } = {}) {
      if (!nodebbUid) {
        const error = new Error("nodebbUid is required");
        error.status = 401;
        throw error;
      }

      const userslug = String(slug || actor?.slug || actor?.username || "").trim();
      if (!userslug) {
        const error = new Error("user slug is required");
        error.status = 400;
        throw error;
      }

      const cacheKey = `profile:saved:${actor?.id || nodebbUid}:${userslug}`;
      const cached = await cache?.get?.(cacheKey);
      if (cached) return cached;

      let data;
      try {
        data = await nodebbUsers.getUserCollection({
          slug: userslug,
          endpoint: "bookmarks",
          nodebbUid
        });
      } catch (error) {
        logger.warn?.(`[get-saved-posts] NodeBB bookmarks fetch failed uid=${nodebbUid} slug=${userslug}: ${error.message}`);
        throw error;
      }

      const items = extractUserCollectionTopics(data);
      const tids = [...new Set(items.map(collectionTopicId).filter(Boolean))];
      const metadataByTid = await postRepository?.listByTids?.(tids) || {};

      const visible = items.filter((item) => {
        const tid = collectionTopicId(item);
        if (!tid) return true;
        const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
        if (!audiencePolicy?.canView) return true;
        return audiencePolicy.canView(actor, {
          tid,
          visibility: metadata?.visibility,
          audience: metadata?.audience,
          metadata
        }, "profile-saved");
      });

      const result = {
        ok: true,
        items: visible.map((item) => {
          const tid = collectionTopicId(item);
          const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
          return mapper({ actor, item, metadata });
        }),
        source: "nodebb"
      };
      await cache?.set?.(cacheKey, result, { ttlSeconds: 30 });
      return result;
    }
  };
}

export {
  collectionTopicId,
  defaultMapSavedPost,
  extractUserCollectionTopics,
  makeGetSavedPostsUseCase
};
