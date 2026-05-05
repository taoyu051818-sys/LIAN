import { sendJson } from "./http-response.js";
import { requireOpsAdmin } from "./ops-auth.js";
import { buildOpsObservability } from "./ops-observability.js";

async function handleOpsObservability(req, _reqUrl, res, options = {}) {
  await requireOpsAdmin(req);
  const data = await buildOpsObservability(options);
  sendJson(res, 200, {
    ok: Boolean(data.summary?.ok),
    ...data
  });
}

export { handleOpsObservability };
