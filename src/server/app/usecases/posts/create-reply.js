function normalizeReplyPayload(payload = {}) {
  const content = String(payload.content || payload.body || "").trim();
  return {
    content,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    attachments: Array.isArray(payload.attachments) ? payload.attachments : []
  };
}

function makeReplyError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makeCreateReplyUseCase({
  nodebbTopics,
  audiencePolicy,
  interactionPolicy,
  postRepository,
  replyRepository,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, tid, nodebbUid, payload } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw makeReplyError("tid is required");
      if (!nodebbUid) throw makeReplyError("nodebbUid is required", 401);

      const normalized = normalizeReplyPayload(payload);
      if (!normalized.content) throw makeReplyError("content is required");

      interactionPolicy?.assertCanReply?.(actor);

      const meta = await postRepository?.getByTid?.(topicId);
      audiencePolicy?.assertCanView?.(actor, {
        visibility: meta?.visibility,
        audience: meta?.audience
      }, "detail");

      try {
        await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid });
      } catch (error) {
        logger.warn?.(`[create-reply] topic fetch failed tid=${topicId} uid=${nodebbUid}: ${error.message}`);
        error.status = error.status || 404;
        throw error;
      }

      const nodebbResult = await nodebbTopics.createReply({
        tid: topicId,
        nodebbUid,
        body: {
          content: normalized.content
        }
      });

      await replyRepository?.recordReply?.({
        actorId: actor?.id,
        tid: topicId,
        nodebbUid,
        content: normalized.content,
        result: nodebbResult
      }).catch?.(() => {});

      cache?.invalidateTopic?.(topicId);
      cache?.invalidateFeed?.();

      return {
        ok: true,
        tid: topicId,
        reply: nodebbResult
      };
    }
  };
}

export { makeCreateReplyUseCase, makeReplyError, normalizeReplyPayload };
