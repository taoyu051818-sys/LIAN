import { ensureNodebbUid, requireUser } from "../../auth-service.js";
import { loadMetadata } from "../../data-store.js";
import { sendJson } from "../../http-response.js";
import { makeNodebbGateways } from "../gateways/nodebb/index.js";
import { makeAudiencePolicy } from "../policies/audience-policy.js";
import { makeGetMessagesUseCase } from "../usecases/messages/get-messages.js";

function makePostRepository() {
  return {
    async listByTids(tids = []) {
      const metadata = await loadMetadata();
      return Object.fromEntries(tids.map((tid) => [String(tid), metadata[String(tid)] || {}]));
    }
  };
}

function makeMessageCache() {
  return {
    async get() { return null; },
    async set() {}
  };
}

async function handleMessagesRefactored(req, res) {
  try {
    const auth = await requireUser(req);
    const nodebbUid = await ensureNodebbUid(auth);
    const nodebb = makeNodebbGateways();
    const result = await makeGetMessagesUseCase({
      nodebbNotifications: nodebb.notifications,
      postRepository: makePostRepository(),
      audiencePolicy: makeAudiencePolicy(),
      cache: makeMessageCache()
    }).execute({ actor: auth.user, nodebbUid });
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message });
  }
}

export { handleMessagesRefactored };
