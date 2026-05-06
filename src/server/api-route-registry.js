import { handleAdmin } from "./admin-routes.js";
import { handleAiPostDraft, handleAiPostPublish } from "./ai-light-publish.js";
import { handleAiPostPreview } from "./ai-post-preview.js";
import { handleIdentityActors } from "./author-service.js";
import {
  handleActivateAlias,
  handleAuthAvatar,
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
  handleAuthRegister,
  handleAuthRules,
  handleCreateAlias,
  handleCreateInvite,
  handleDeactivateAlias,
  handleGetAliases,
  handleGetAliasPool,
  handleMe,
  handleSendEmailCode
} from "./auth-routes.js";
import { memory } from "./cache.js";
import { handleChannel, handleChannelMessage, handleChannelRead, handleCreateReply } from "./channel-service.js";
import { config, isSetupRequired, saveSetupConfig } from "./config.js";
import { handleMapV2Items } from "./map-v2-service.js";
import { handleMessages } from "./notification-service.js";
import { nodebbFetch } from "./nodebb-client.js";
import { handleOpsAction, handleOpsDeployWebhook, handleOpsHealth } from "./ops-service.js";
import { handleOpsObservability } from "./ops-observability-route.js";
import { handlePlaceSheet } from "./place-sheet-service.js";
import {
  handleFeedDebugRefactored as handleFeedDebug,
  handleFeedRefactored as handleFeed,
  handlePostDetailRefactored as handlePostDetail
} from "./app/handlers/feed-handlers.js";
import {
  handleCreatePostRefactored as handleCreatePost,
  handleGetHistoryRefactored as handleGetHistory,
  handleGetLikedPostsRefactored as handleGetLikedPosts,
  handleGetSavedPostsRefactored as handleGetSavedPosts,
  handleReportPostRefactored as handleReportPost,
  handleTogglePostLikeRefactored as handleTogglePostLike,
  handleTogglePostSaveRefactored as handleTogglePostSave
} from "./app/handlers/post-handlers.js";
import { readJsonBody, requireAdmin } from "./request-utils.js";
import { buildRouteManifest } from "./route-manifest.js";
import { isProductionMode, securityModeName } from "./security-mode.js";
import { sendJson } from "./http-response.js";
import { mapItems } from "./static-data.js";
import { handleTaskBoard } from "./task-board-service.js";
import { handleUploadImage } from "./upload.js";

const PRE_SETUP_ROUTE_IDS = new Set([
  "setup-status",
  "setup",
  "ops-health",
  "ops-observability",
  "ops-routes",
  "ops-action",
  "ops-deploy-webhook",
  "internal-task-board",
  "alias-pool",
  "ai-post-preview",
  "admin"
]);

function setupStatusPayload() {
  const base = {
    required: isSetupRequired(),
    configured: !isSetupRequired(),
    securityMode: securityModeName(),
    cloudinaryConfigured: Boolean(config.cloudinaryUrl),
    mailConfigured: Boolean(config.resendApiKey || config.smtpHost)
  };
  if (isProductionMode()) return base;
  return {
    ...base,
    nodebbBaseUrl: config.nodebbBaseUrl,
    nodebbPublicBaseUrl: config.nodebbPublicBaseUrl,
    nodebbUid: config.nodebbUid,
    nodebbCid: config.nodebbCid,
    nodebbChannelCid: config.nodebbChannelCid,
    dataSource: "api",
    remoteAuthBaseUrl: config.remoteAuthBaseUrl
  };
}

function mapItemsPayload() {
  return {
    bounds: { southWest: { lat: 18.37305, lng: 109.99538 }, northEast: { lat: 18.413856, lng: 110.036262 } },
    items: mapItems
  };
}

async function handleSetup({ req, res }) {
  if (!isSetupRequired() && isProductionMode()) requireAdmin(req);
  const payload = await readJsonBody(req);
  await saveSetupConfig(payload, () => {
    memory.feedPages.clear();
    memory.topicDetails.clear();
  });
  return sendJson(res, 200, { ok: true, configured: true });
}

const ROUTE_HANDLERS = {
  "setup-status": ({ res }) => sendJson(res, 200, setupStatusPayload()),
  setup: handleSetup,
  "ops-health": ({ req, reqUrl, res }) => handleOpsHealth(req, reqUrl, res),
  "ops-observability": ({ req, reqUrl, res }) => handleOpsObservability(req, reqUrl, res),
  "ops-routes": ({ res }) => sendJson(res, 200, buildRouteManifest()),
  "ops-action": ({ req, reqUrl, res }) => handleOpsAction(req, reqUrl, res),
  "ops-deploy-webhook": ({ req, reqUrl, res }) => handleOpsDeployWebhook(req, reqUrl, res),
  "internal-task-board": ({ req, res }) => {
    if (isProductionMode()) requireAdmin(req);
    return handleTaskBoard(req, res);
  },
  "alias-pool": ({ req, res }) => handleGetAliasPool(req, res),
  "ai-post-preview": ({ req, res }) => handleAiPostPreview(req, res),
  admin: ({ req, reqUrl, res }) => handleAdmin(req, reqUrl, res),
  "ai-post-drafts": ({ req, res }) => handleAiPostDraft(req, res),
  "ai-post-publish": ({ req, res }) => handleAiPostPublish(req, res),
  "auth-rules": ({ res }) => handleAuthRules(res),
  "auth-me": ({ req, res }) => handleAuthMe(req, res),
  "auth-avatar": ({ req, res }) => handleAuthAvatar(req, res),
  "auth-email-code": ({ req, res }) => handleSendEmailCode(req, res),
  "auth-register": ({ req, res }) => handleAuthRegister(req, res),
  "auth-login": ({ req, res }) => handleAuthLogin(req, res),
  "auth-logout": ({ req, res }) => handleAuthLogout(req, res),
  "auth-invites": ({ req, res }) => handleCreateInvite(req, res),
  "auth-aliases-get": ({ req, res }) => handleGetAliases(req, res),
  "auth-aliases-post": ({ req, res }) => handleCreateAlias(req, res),
  "auth-alias-deactivate": ({ req, res }) => handleDeactivateAlias(req, res),
  "auth-alias-activate": ({ req, res }) => handleActivateAlias(req, res),
  "identity-actors": ({ reqUrl, res }) => handleIdentityActors(reqUrl, res),
  feed: ({ req, reqUrl, res }) => handleFeed(req, reqUrl, res),
  "feed-debug": ({ req, reqUrl, res }) => handleFeedDebug(req, reqUrl, res),
  tags: async ({ res }) => sendJson(res, 200, await nodebbFetch("/api/tags")),
  "map-v2-items": ({ req, res }) => handleMapV2Items(req, res),
  "map-items": ({ res }) => sendJson(res, 200, mapItemsPayload()),
  channel: ({ reqUrl, req, res }) => handleChannel(reqUrl, req, res),
  "channel-read": ({ req, res }) => handleChannelRead(req, res),
  "channel-messages": ({ req, res }) => handleChannelMessage(req, res),
  messages: ({ req, res }) => handleMessages(req, res),
  me: ({ req, res }) => handleMe(req, res),
  "me-saved": ({ req, res }) => handleGetSavedPosts(req, res),
  "me-liked": ({ req, res }) => handleGetLikedPosts(req, res),
  "me-history": ({ req, res }) => handleGetHistory(req, res),
  "place-sheet": ({ route, req, res }) => handlePlaceSheet(req, route.params.placeId, res),
  "post-detail": ({ route, req, res }) => handlePostDetail(req, Number(route.params.tid), res),
  "post-replies": ({ route, req, res }) => handleCreateReply(Number(route.params.tid), req, res),
  "post-like": ({ route, req, res }) => handleTogglePostLike(Number(route.params.tid), req, res),
  "post-save": ({ route, req, res }) => handleTogglePostSave(Number(route.params.tid), req, res),
  "post-report": ({ route, req, res }) => handleReportPost(Number(route.params.tid), req, res),
  "upload-image": ({ req, reqUrl, res }) => handleUploadImage(req, res, reqUrl),
  "create-post": ({ req, res }) => handleCreatePost(req, res)
};

function getRouteHandlerIds() {
  return Object.keys(ROUTE_HANDLERS);
}

async function dispatchRoute(route, req, reqUrl, res) {
  const handler = ROUTE_HANDLERS[route.routeId];
  if (!handler) return sendJson(res, 404, { error: "not found" });
  return await handler({ route, req, reqUrl, res });
}

export { PRE_SETUP_ROUTE_IDS, dispatchRoute, getRouteHandlerIds, setupStatusPayload };
