import { config } from "./config.js";

const LLM_DEFAULT_TIMEOUT_MS = 20_000;
const LLM_PROVIDERS = new Set(["mimo"]);

function normalizeLlmProvider(provider = "mimo") {
  const value = String(provider || "mimo").trim().toLowerCase();
  return LLM_PROVIDERS.has(value) ? value : "mimo";
}

function isLlmProviderAvailable(provider = "mimo") {
  switch (normalizeLlmProvider(provider)) {
    case "mimo": return Boolean(config.mimoApiKey);
    default: return false;
  }
}

function safeParseLlmJson(text = "") {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = fenced || raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
    }
    return null;
  }
}

function extractLlmMessageContent(data = {}) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "string" ? part : part?.text || "").join("\n");
  return "";
}

function imageContentPart({ imageUrl = "", imageBase64 = "" } = {}) {
  const url = String(imageUrl || "").trim();
  if (url) return { type: "image_url", image_url: { url } };
  const base64 = String(imageBase64 || "").trim();
  if (!base64) return null;
  return { type: "image_url", image_url: { url: base64.startsWith("data:image/") ? base64 : `data:image/jpeg;base64,${base64}` } };
}

function missingProviderError(provider) {
  const error = new Error(`${provider.toUpperCase()} provider is not configured`);
  error.status = 500;
  return error;
}

async function callMimoChatCompletion({ messages = [], temperature = 0.3, maxCompletionTokens = 2048, timeoutMs = LLM_DEFAULT_TIMEOUT_MS } = {}) {
  if (!config.mimoApiKey) throw missingProviderError("mimo");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.mimoBaseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", "api-key": config.mimoApiKey },
      body: JSON.stringify({ model: config.mimoModel, messages, temperature, max_completion_tokens: maxCompletionTokens, thinking: { type: "disabled" } })
    });
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(`MiMo chat completion failed with status ${response.status}`);
      error.status = 502;
      error.detail = text;
      throw error;
    }
    const data = safeParseLlmJson(text) || JSON.parse(text);
    return { provider: "mimo", model: config.mimoModel, data, content: extractLlmMessageContent(data) };
  } finally {
    clearTimeout(timeout);
  }
}

async function callLlmChatCompletion({ provider = "mimo", ...options } = {}) {
  const normalizedProvider = normalizeLlmProvider(provider);
  switch (normalizedProvider) {
    case "mimo": return callMimoChatCompletion(options);
    default: throw missingProviderError(normalizedProvider);
  }
}

async function runLlmJsonTask({ task = "generic_json_task", provider = "mimo", systemPrompt = "You return strict JSON only.", userContent = "", temperature = 0.3, maxCompletionTokens = 2048, timeoutMs = LLM_DEFAULT_TIMEOUT_MS } = {}) {
  const completion = await callLlmChatCompletion({ provider, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }], temperature, maxCompletionTokens, timeoutMs });
  const parsed = safeParseLlmJson(completion.content);
  if (!parsed) {
    const error = new Error(`${task} returned invalid JSON`);
    error.status = 502;
    error.provider = completion.provider;
    throw error;
  }
  return { ...completion, task, parsed };
}

export { LLM_DEFAULT_TIMEOUT_MS, callLlmChatCompletion, extractLlmMessageContent, imageContentPart, isLlmProviderAvailable, normalizeLlmProvider, runLlmJsonTask, safeParseLlmJson };
