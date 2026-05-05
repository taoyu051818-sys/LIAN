import { isSetupRequired } from "./config.js";
import { sendJson } from "./http-response.js";
import { requireSameOrigin } from "./request-security.js";
import { matchRoute } from "./route-matcher.js";
import { PRE_SETUP_ROUTE_IDS, dispatchRoute, setupStatusPayload } from "./api-route-registry.js";

async function handleApi(req, reqUrl, res) {
  try {
    requireSameOrigin(req);

    const route = matchRoute(req.method, reqUrl.pathname);
    if (!route) return sendJson(res, 404, { error: "not found" });

    if (isSetupRequired() && !PRE_SETUP_ROUTE_IDS.has(route.routeId)) {
      return sendJson(res, 428, { error: "setup required" });
    }

    return await dispatchRoute(route, req, reqUrl, res);
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "server error" });
  }
}

export { handleApi, setupStatusPayload };
