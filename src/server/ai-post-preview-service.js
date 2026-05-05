import {
  buildPostPreviewPrompt,
  normalizePostPreviewResult
} from "./ai-post-preview-schema.js";
import {
  imageContentPart,
  runLlmJsonTask
} from "./llm-service.js";

const AI_POST_PREVIEW_TASK = "ai_post_preview";
const AI_POST_PREVIEW_SYSTEM_PROMPT = "你是 LIAN 校园轻投稿助手。你只能输出严格 JSON，不要输出解释文字。";

function buildPostPreviewUserContent(request = {}) {
  const content = [];
  const imagePart = imageContentPart(request);
  if (imagePart) content.push(imagePart);
  content.push({ type: "text", text: buildPostPreviewPrompt(request) });
  return content;
}

async function generatePostPreviewWithLlm(request = {}, { provider = "mimo" } = {}) {
  const completion = await runLlmJsonTask({
    task: AI_POST_PREVIEW_TASK,
    provider,
    systemPrompt: AI_POST_PREVIEW_SYSTEM_PROMPT,
    userContent: buildPostPreviewUserContent(request),
    temperature: 0.3,
    maxCompletionTokens: 2048
  });
  return normalizePostPreviewResult(completion.parsed, request);
}

export {
  AI_POST_PREVIEW_TASK,
  buildPostPreviewUserContent,
  generatePostPreviewWithLlm
};
