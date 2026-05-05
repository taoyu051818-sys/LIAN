import { memory } from "./cache.js";

function invalidateFeedCache() {
  memory.feedPages.clear();
}

function invalidateTopicDetailCache(tid) {
  if (tid === undefined || tid === null || tid === "") return;
  memory.topicDetails.delete(Number(tid));
  memory.topicDetails.delete(String(tid));
}

function invalidateTopicDetailsCache() {
  memory.topicDetails.clear();
}

function invalidateAfterPostPublish({ tid } = {}) {
  invalidateFeedCache();
  invalidateTopicDetailCache(tid);
}

function invalidateAfterSetupChange() {
  invalidateFeedCache();
  invalidateTopicDetailsCache();
}

export {
  invalidateAfterPostPublish,
  invalidateAfterSetupChange,
  invalidateFeedCache,
  invalidateTopicDetailCache,
  invalidateTopicDetailsCache
};
