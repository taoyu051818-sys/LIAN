import {
  invalidateFeedCache,
  invalidateTopicDetailCache
} from "../../cache-invalidation-service.js";

function makeCacheAdapter() {
  return {
    async get() { return null; },
    async set() {},
    invalidateTopic(tid) { invalidateTopicDetailCache(tid); },
    invalidateFeed() { invalidateFeedCache(); },
    touchTopic() {}
  };
}

export { makeCacheAdapter };
