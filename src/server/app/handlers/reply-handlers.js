import { sendJson } from "../../http-response.js";
import { buildReplyHtml } from "../../post-html-service.js";
import { readJsonBody } from "../../request-utils.js";
import { ensureNodebbUid, requireUser } from "../../auth-service.js";
import { makeNodebbGateways } from "../gateways/nodebb/index.js";
import { makePostRepository } from "../adapters/post-repository-adapter.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";
import { makeInteractionPolicy } from "../policies/interaction-policy.js";
import { makeCreateReplyUseCase } from "../usecases/posts/create-reply.js";

function normalizeReplyContent(payload = {}, user = {}) {
  const raw = String(payload.content || payload.body || payload.message || "").trim();
  if (!raw) return "";
  if (raw.startsWith("<!-- lian-channel-meta") || raw.startsWith("<!-- lian-user-meta")) return raw;
  return buildReplyHtml(raw, user, { identityTag: String(payload.identityTag || "").trim() });
}

function makeReplyCache() {
  return {
    invalidateTopic() {},
    invalidateFeed() {}
  };
}

async function handleCreateReplyRefactored(tid, req, res) {
  try {
    const auth = await requireUser(req);
    const nodebbUid = await ensureNodebbUid(auth);
    const payload = await readJsonBody(req).catch(() => ({}));
    const content = normalizeReplyContent(payload, auth.user);

    const nodebb = makeNodebbGateways();
    const result = await makeCreateReplyUseCase({
      nodebbTopics: nodebb.topics,
      audiencePolicy: makeAudiencePolicy(),
      interactionPolicy: makeInteractionPolicy(),
      postRepository: makePostRepository(),
      replyRepository: { recordReply: async () => {} },
      cache: makeReplyCache()
    }).execute({
      actor: auth.user,
      tid,
      nodebbUid,
      payload: { ...payload, content }
    });

    sendJson(res, 200, result.reply);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

export {
  handleCreateReplyRefactored,
  normalizeReplyContent
};
