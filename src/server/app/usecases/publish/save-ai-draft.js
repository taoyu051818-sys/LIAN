function normalizeAiDraftPayload(payload = {}) {
  const title = String(payload.title || payload.draft?.title || "").trim();
  const content = String(payload.content || payload.body || payload.draft?.content || "").trim();
  const tags = Array.isArray(payload.tags) ? payload.tags.filter(Boolean)
    : Array.isArray(payload.draft?.tags) ? payload.draft.tags.filter(Boolean)
    : [];
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const audience = payload.audience || metadata.audience || payload.draft?.audience || null;
  return { title, content, tags, metadata, audience };
}

function makeSaveAiDraftError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makeSaveAiDraftUseCase({
  publishPolicy,
  audiencePolicy,
  aiDraftRepository,
  clock = () => new Date().toISOString()
} = {}) {
  return {
    async execute({ actor, payload } = {}) {
      publishPolicy?.assertCanSaveAiDraft?.(actor);

      const normalized = normalizeAiDraftPayload(payload);
      if (!normalized.title && !normalized.content) {
        throw makeSaveAiDraftError("draft content is required");
      }

      const audience = audiencePolicy?.normalizeForCreate
        ? audiencePolicy.normalizeForCreate(actor, normalized.audience, normalized.metadata.visibility || "public")
        : normalized.audience;
      audiencePolicy?.assertCanCreate?.(actor, audience);

      const draft = {
        actorId: actor?.id,
        title: normalized.title,
        content: normalized.content,
        tags: normalized.tags,
        metadata: {
          ...normalized.metadata,
          audience,
          source: normalized.metadata.source || "ai-draft"
        },
        audience,
        status: "draft",
        updatedAt: clock()
      };

      const saved = await aiDraftRepository?.save?.(draft);
      return {
        ok: true,
        draft: saved || draft
      };
    }
  };
}

export { makeSaveAiDraftError, makeSaveAiDraftUseCase, normalizeAiDraftPayload };
