function normalizeAiDraftPublishPayload(payload = {}) {
  const draftId = String(payload.draftId || payload.id || "").trim();
  const title = String(payload.title || payload.draft?.title || "").trim();
  const content = String(payload.content || payload.body || payload.draft?.content || "").trim();
  const cid = Number(payload.cid || payload.categoryId || payload.draft?.cid || 0) || undefined;
  const tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean)
    : Array.isArray(payload.draft?.tags) ? payload.draft.tags.filter(Boolean)
    : [];
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const audience = payload.audience || metadata.audience || payload.draft?.audience || null;
  return { draftId, title, content, cid, tags, metadata, audience };
}

function makePublishAiDraftError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makePublishAiDraftUseCase({
  nodebbTopics,
  publishPolicy,
  audiencePolicy,
  aiDraftRepository,
  postRepository,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, nodebbUid, payload } = {}) {
      if (!nodebbUid) throw makePublishAiDraftError("nodebbUid is required", 401);

      const normalized = normalizeAiDraftPublishPayload(payload);
      if (!normalized.draftId) throw makePublishAiDraftError("draftId is required");

      const draft = await aiDraftRepository?.getById?.(normalized.draftId);
      if (!draft) throw makePublishAiDraftError("draft not found", 404);
      if (draft.actorId && actor?.id && String(draft.actorId) !== String(actor.id)) {
        throw makePublishAiDraftError("draft owner mismatch", 403);
      }

      const merged = {
        ...draft,
        ...normalized,
        title: normalized.title || draft.title || "",
        content: normalized.content || draft.content || "",
        metadata: {
          ...(draft.metadata || {}),
          ...(normalized.metadata || {})
        },
        audience: normalized.audience || draft.audience || draft.metadata?.audience || null
      };

      publishPolicy?.assertCanPublishAiDraft?.(actor, merged);

      const audience = audiencePolicy?.normalizeForCreate
        ? audiencePolicy.normalizeForCreate(actor, merged.audience, merged.metadata.visibility || "public")
        : merged.audience;
      audiencePolicy?.assertCanCreate?.(actor, audience);

      let nodebbResult;
      try {
        nodebbResult = await nodebbTopics.createTopic({
          nodebbUid,
          body: {
            title: merged.title,
            content: merged.content,
            cid: merged.cid,
            tags: merged.tags || []
          }
        });
      } catch (error) {
        logger.warn?.(`[publish-ai-draft] NodeBB topic create failed draft=${normalized.draftId} uid=${nodebbUid}: ${error.message}`);
        throw error;
      }

      const tid = Number(nodebbResult?.response?.tid || nodebbResult?.tid || nodebbResult?.topic?.tid || 0) || undefined;
      const metadata = {
        ...merged.metadata,
        audience,
        source: merged.metadata.source || "ai-draft",
        aiDraftId: normalized.draftId,
        nodebbUid
      };

      if (tid) {
        await postRepository?.patchByTid?.(tid, metadata).catch?.((error) => {
          logger.warn?.(`[publish-ai-draft] metadata write failed tid=${tid}: ${error.message}`);
        });
        await aiDraftRepository?.markPublished?.(normalized.draftId, { tid }).catch?.((error) => {
          logger.warn?.(`[publish-ai-draft] mark published failed draft=${normalized.draftId}: ${error.message}`);
        });
        cache?.invalidateTopic?.(tid);
      }
      cache?.invalidateFeed?.();

      return {
        ok: true,
        tid,
        draftId: normalized.draftId,
        topic: nodebbResult,
        metadata
      };
    }
  };
}

export { makePublishAiDraftError, makePublishAiDraftUseCase, normalizeAiDraftPublishPayload };
