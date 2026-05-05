import { config } from "./config.js";
import { sendJson } from "./http-response.js";
import { readJsonBody } from "./request-utils.js";
import {
  AI_POST_PREVIEW_MAX_BODY_BYTES,
  mockPostPreview,
  normalizePostPreviewRequest
} from "./ai-post-preview-schema.js";
import { generatePostPreviewWithLlm } from "./ai-post-preview-service.js";
import { isLlmProviderAvailable } from "./llm-service.js";

async function handleAiPostPreview(req, res) {
  const payload = await readJsonBody(req, AI_POST_PREVIEW_MAX_BODY_BYTES);
  const request = normalizePostPreviewRequest(payload);
  const provider = "mimo";
  const useMock = config.aiPostPreviewMode === "mock" || !isLlmProviderAvailable(provider);
  if (useMock) {
    return sendJson(res, 200, {
      ok: true,
      mode: "mock",
      ...mockPostPreview(request)
    });
  }

  try {
    const result = await generatePostPreviewWithLlm(request, { provider });
    return sendJson(res, 200, {
      ok: true,
      mode: provider,
      ...result
    });
  } catch (error) {
    const fallback = mockPostPreview(request);
    return sendJson(res, 200, {
      ok: true,
      mode: "mock",
      fallbackReason: "mimo_unavailable",
      draft: fallback.draft,
      locationDraft: fallback.locationDraft,
      locationSuggestions: fallback.locationSuggestions,
      riskFlags: fallback.riskFlags,
      confidence: Math.min(fallback.confidence, 0.5),
      needsHumanReview: true
    });
  }
}

export { handleAiPostPreview };
