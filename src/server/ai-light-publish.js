import { requireUser } from "./auth-service.js";
import { createAiPostDraft, publishAiPost } from "./ai-light-publish-service.js";
import { AI_POST_PREVIEW_MAX_BODY_BYTES } from "./ai-post-preview-schema.js";
import { sendJson } from "./http-response.js";
import { readJsonBody } from "./request-utils.js";

async function handleAiPostDraft(req, res) {
  const auth = await requireUser(req);
  const payload = await readJsonBody(req, AI_POST_PREVIEW_MAX_BODY_BYTES);
  const result = await createAiPostDraft(auth, payload);
  return sendJson(res, 200, result);
}

async function handleAiPostPublish(req, res) {
  const auth = await requireUser(req);
  const payload = await readJsonBody(req, AI_POST_PREVIEW_MAX_BODY_BYTES);
  const result = await publishAiPost(auth, payload);
  return sendJson(res, result.statusCode, result.body);
}

export { handleAiPostDraft, handleAiPostPublish };
