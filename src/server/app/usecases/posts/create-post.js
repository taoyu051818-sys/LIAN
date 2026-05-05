function normalizeCreatePostPayload(payload = {}) {
  const title = String(payload.title || "").trim();
  const content = String(payload.content || payload.body || "").trim();
  const cid = Number(payload.cid || payload.categoryId || 0) || undefined;
  const tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : [];
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const audience = payload.audience || metadata.audience || null;
  return { title, content, cid, tags, metadata, audience };
}

function makeCreatePostError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makeCreatePostUseCase({
  nodebbTopics,
  publishPolicy,
  audiencePolicy,
  postRepository,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, nodebbUid, payload } = {}) {
      if (!nodebbUid) throw makeCreatePostError("nodebbUid is required", 401);

      const normalized = normalizeCreatePostPayload(payload);
      publishPolicy?.assertCanPublishRegular?.(actor, normalized);

      const audience = audiencePolicy?.normalizeForCreate
        ? audiencePolicy.normalizeForCreate(actor, normalized.audience, normalized.metadata.visibility || "public")
        : normalized.audience;
      audiencePolicy?.assertCanCreate?.(actor, audience);

      const body = {
        title: normalized.title,
        content: normalized.content,
        cid: normalized.cid,
        tags: normalized.tags
      };

      let nodebbResult;
      try {
        nodebbResult = await nodebbTopics.createTopic({ nodebbUid, body });
      } catch (error) {
        logger.warn?.(`[create-post] NodeBB topic create failed uid=${nodebbUid}: ${error.message}`);
        throw error;
      }

      const tid = Number(nodebbResult?.response?.tid || nodebbResult?.tid || nodebbResult?.topic?.tid || 0) || undefined;
      const metadata = {
        ...normalized.metadata,
        audience,
        source: normalized.metadata.source || "lian",
        nodebbUid
      };

      if (tid) {
        await postRepository?.patchByTid?.(tid, metadata).catch?.((error) => {
          logger.warn?.(`[create-post] metadata write failed tid=${tid}: ${error.message}`);
        });
        cache?.invalidateTopic?.(tid);
      }
      cache?.invalidateFeed?.();

      return {
        ok: true,
        tid,
        topic: nodebbResult,
        metadata
      };
    }
  };
}

export { makeCreatePostError, makeCreatePostUseCase, normalizeCreatePostPayload };
