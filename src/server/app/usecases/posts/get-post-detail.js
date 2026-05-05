function makePostNotFoundError(message = "post not found") {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function defaultMapPostDetail({ tid, topic, metadata } = {}) {
  return {
    tid: Number(tid),
    topic,
    metadata: metadata || null
  };
}

function makeGetPostDetailUseCase({
  nodebbTopics,
  audiencePolicy,
  postRepository,
  historyRepository,
  mapper = defaultMapPostDetail,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, tid, nodebbUid } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw makePostNotFoundError("tid is required");

      const metadata = await postRepository?.getByTid?.(topicId);
      audiencePolicy?.assertCanView?.(actor, {
        visibility: metadata?.visibility,
        audience: metadata?.audience
      }, "detail");

      let topic;
      try {
        topic = await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid });
      } catch (error) {
        logger.warn?.(`[get-post-detail] topic fetch failed tid=${topicId} uid=${nodebbUid || "anonymous"}: ${error.message}`);
        error.status = error.status || 404;
        throw error;
      }

      if (!topic || topic.error) throw makePostNotFoundError();

      await historyRepository?.recordView?.({
        actorId: actor?.id,
        tid: topicId,
        nodebbUid
      }).catch?.(() => {});

      cache?.touchTopic?.(topicId);

      return mapper({
        actor,
        tid: topicId,
        topic,
        metadata
      });
    }
  };
}

export { defaultMapPostDetail, makeGetPostDetailUseCase, makePostNotFoundError };
