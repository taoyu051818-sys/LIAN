import path from "node:path";
import { fileURLToPath } from "node:url";

import { sendJson } from "./http-response.js";
import { requireOpsAdmin } from "./ops-auth.js";
import { buildOpsObservability } from "./ops-observability.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_OBSERVABILITY_OPTIONS = Object.freeze({
  backendRepoDir: process.env.LIAN_BACKEND_REPO_DIR || repoRoot,
  frontendRepoDir: process.env.LIAN_FRONTEND_REPO_DIR || "/opt/lian-mobile-web",
  backendPm2Name: process.env.LIAN_BACKEND_PM2_NAME || "lian-platform-server",
  frontendServiceName: process.env.LIAN_FRONTEND_SERVICE || "lian-frontend.service"
});

async function handleOpsObservability(req, _reqUrl, res, options = DEFAULT_OBSERVABILITY_OPTIONS) {
  await requireOpsAdmin(req);
  const data = await buildOpsObservability(options);
  sendJson(res, 200, {
    ok: Boolean(data.summary?.ok),
    ...data
  });
}

export { handleOpsObservability };
