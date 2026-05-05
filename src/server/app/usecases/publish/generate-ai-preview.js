function normalizeAiPreviewInput(payload = {}) {
  const prompt = String(payload.prompt || payload.text || "").trim();
  const context = payload.context && typeof payload.context === "object" ? payload.context : {};
  const audience = payload.audience || context.audience || null;
  const options = payload.options && typeof payload.options === "object" ? payload.options : {};
  return { prompt, context, audience, options };
}

function makeAiPreviewError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makeGenerateAiPreviewUseCase({
  aiGateway,
  publishPolicy,
  audiencePolicy,
  aiRecordRepository,
  clock = () => new Date().toISOString()
} = {}) {
  return {
    async execute({ actor, payload } = {}) {
      publishPolicy?.assertCanSaveAiDraft?.(actor);
      publishPolicy?.assertAiPreviewDoesNotPublish?.();

      const input = normalizeAiPreviewInput(payload);
      if (!input.prompt) throw makeAiPreviewError("prompt is required");

      const audience = audiencePolicy?.normalizeForCreate
        ? audiencePolicy.normalizeForCreate(actor, input.audience, input.context.visibility || "public")
        : input.audience;
      audiencePolicy?.assertCanCreate?.(actor, audience);

      const preview = await aiGateway?.generatePreview?.({
        actor,
        prompt: input.prompt,
        context: {
          ...input.context,
          audience
        },
        options: input.options
      });

      const record = {
        actorId: actor?.id,
        prompt: input.prompt,
        audience,
        preview: preview || null,
        status: "preview",
        createdAt: clock()
      };
      await aiRecordRepository?.recordPreview?.(record).catch?.(() => {});

      return {
        ok: true,
        publishable: false,
        preview: preview || null,
        record
      };
    }
  };
}

export { makeAiPreviewError, makeGenerateAiPreviewUseCase, normalizeAiPreviewInput };
