import crypto from "node:crypto";

import { canCreatePostWithAudience, normalizeAudienceForCreate } from "./audience-service.js";
import { selectIdentityTag } from "./auth-service.js";
import { warmupPostImages, normalizePostImageUrl } from "./content-utils.js";
import { appendJsonLine, patchPostMetadata } from "./data-store.js";
import { aiPostDraftsPath, aiPostRecordsPath } from "./paths.js";
import { createNodebbTopicFromPayload } from "./post-service.js";
import {
  clampNumber,
  normalizeHashtags,
  normalizeLocationDraft,
  normalizeRiskFlags,
  truncateText
} from "./ai-post-preview-schema.js";
import { invalidateAfterPostPublish } from "./cache-invalidation-service.js";
import {
  metadataVisibilityFromAudience,
  normalizeAiPublishMetadata
} from "./post-metadata-service.js";
import {
  locationDraftPlaceName,
  locationDraftToNodebbMapLocation
} from "./location-draft-service.js";
import { config } from "./config.js";

function httpError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSingleTag(payload = {}) {
  const raw = payload.tag || payload.primaryTag || payload.metadata?.primaryTag || (Array.isArray(payload.tags) ? payload.tags[0] : "");
  return normalizeHashtags([raw], 1)[0] || "";
}

function normalizeAiPostPayload(payload = {}, { requireImage = false, user = null } = {}) {
  const imageUrls = Array.isArray(payload.imageUrls)
    ? payload.imageUrls.map((url) => normalizePostImageUrl(url, { width: 1200 })).filter(Boolean)
    : (payload.imageUrl ? [normalizePostImageUrl(payload.imageUrl, { width: 1200 })].filter(Boolean) : []);
  const imageUrl = imageUrls[0] || "";
  if (requireImage && !imageUrl) throw httpError("imageUrl is required", 400);

  const title = truncateText(payload.title || "", 40);
  const body = truncateText(payload.body || payload.content || "", 300);
  if (!title) throw httpError("title is required", 400);
  if (!body) throw httpError("body is required", 400);

  const metadataInput = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
    ? payload.metadata
    : {};
  const primaryTag = normalizeSingleTag(payload);
  const identityTag = selectIdentityTag(user || {}, payload.identityTag || metadataInput.identityTag || "");
  const locationDraft = normalizeLocationDraft(payload.locationDraft, {
    aiLocationArea: metadataInput.locationArea || "",
    locationHint: payload.locationHint || ""
  });
  const metadata = normalizeAiPublishMetadata(metadataInput, locationDraft, {
    template: metadataInput.contentType,
    locationHint: payload.locationHint || "",
    primaryTag,
    identityTag
  });
  metadata.title = title;
  metadata.imageUrls = imageUrls;

  return {
    imageUrl,
    imageUrls,
    title,
    body,
    tag: primaryTag,
    tags: primaryTag ? [primaryTag] : [],
    identityTag,
    metadata,
    locationDraft,
    riskFlags: normalizeRiskFlags(payload.riskFlags),
    confidence: clampNumber(payload.confidence, 0, 1, 0),
    needsHumanReview: Boolean(payload.needsHumanReview),
    aiMode: truncateText(payload.aiMode || payload.mode || "", 20) || "unknown"
  };
}

function lianUserRecord(user = {}) {
  return {
    id: user.id || "",
    email: user.email || "",
    username: user.username || "",
    displayName: user.displayName || user.username || ""
  };
}

function buildAiPostRecordBase(normalized = {}, auth = {}, { id = crypto.randomUUID(), status = "pending_publish", aliasId = "" } = {}) {
  return {
    id,
    source: "ai_light_publish",
    status,
    createdAt: new Date().toISOString(),
    imageUrl: normalized.imageUrl,
    imageUrls: normalized.imageUrls,
    title: normalized.title,
    body: normalized.body,
    tag: normalized.tag,
    tags: normalized.tags,
    identityTag: normalized.identityTag,
    metadata: normalized.metadata,
    locationDraft: normalized.locationDraft,
    riskFlags: normalized.riskFlags,
    confidence: normalized.confidence,
    needsHumanReview: normalized.needsHumanReview,
    aiMode: normalized.aiMode,
    ...(aliasId ? { aliasId } : {}),
    lianUser: lianUserRecord(auth.user)
  };
}

function buildNodebbPayloadFromAiPost(normalized = {}, { aliasId = "" } = {}) {
  return {
    title: normalized.title,
    content: normalized.body,
    imageUrl: normalized.imageUrl,
    imageUrls: normalized.imageUrls,
    tag: normalized.tag,
    tags: normalized.tags,
    identityTag: normalized.identityTag,
    aliasId,
    placeName: locationDraftPlaceName(normalized.locationDraft, normalized.metadata.locationArea),
    mapLocation: locationDraftToNodebbMapLocation(normalized.locationDraft)
  };
}

async function createAiPostDraft(auth = {}, payload = {}) {
  const normalized = normalizeAiPostPayload(payload, { user: auth.user });
  const id = crypto.randomUUID();
  await appendJsonLine(aiPostDraftsPath, buildAiPostRecordBase(normalized, auth, {
    id,
    status: "draft"
  }));
  return { ok: true, draftId: id, status: "draft" };
}

function assertAiPublishAllowed(auth = {}) {
  if (!config.nodebbToken) throw httpError("LIAN API token is missing", 500);
  if (auth.user?.status === "limited") throw httpError("account is limited", 403);
}

function normalizeAiPublishAudience(auth = {}, normalized = {}) {
  normalized.metadata.audience = normalizeAudienceForCreate(
    auth.user,
    normalized.metadata.audience,
    normalized.metadata.visibility || "public"
  );
  normalized.metadata.visibility = metadataVisibilityFromAudience(normalized.metadata.audience);
  if (!canCreatePostWithAudience(auth.user, normalized.metadata.audience)) {
    throw httpError("audience is not allowed", 403);
  }
  return normalized;
}

async function publishAiPost(auth = {}, payload = {}) {
  assertAiPublishAllowed(auth);
  const normalized = normalizeAiPublishAudience(
    auth,
    normalizeAiPostPayload(payload, { requireImage: true, user: auth.user })
  );
  const aliasId = String(payload.aliasId || "").trim();
  const recordId = crypto.randomUUID();
  const recordBase = buildAiPostRecordBase(normalized, auth, {
    id: recordId,
    status: "pending_publish",
    aliasId
  });

  let tid = 0;
  try {
    const nodebbResult = await createNodebbTopicFromPayload(
      auth,
      buildNodebbPayloadFromAiPost(normalized, { aliasId })
    );
    tid = nodebbResult.tid;
    if (!tid) throw new Error("NodeBB did not return tid");

    try {
      await patchPostMetadata(tid, normalized.metadata);
    } catch (metadataError) {
      await appendJsonLine(aiPostRecordsPath, {
        ...recordBase,
        status: "metadata_error",
        nodebbUid: nodebbResult.nodebbUid || null,
        tid,
        url: `${config.nodebbPublicBaseUrl}/topic/${tid}`,
        error: metadataError.message || "metadata write failed",
        failedAt: new Date().toISOString()
      });
      return {
        statusCode: 500,
        body: {
          ok: false,
          error: "metadata write failed after NodeBB publish",
          tid,
          url: `${config.nodebbPublicBaseUrl}/topic/${tid}`,
          recordId
        }
      };
    }

    await appendJsonLine(aiPostRecordsPath, {
      ...recordBase,
      status: "published",
      nodebbUid: nodebbResult.nodebbUid || null,
      tid,
      url: `${config.nodebbPublicBaseUrl}/topic/${tid}`,
      publishedAt: new Date().toISOString()
    });
    if (normalized.imageUrls.length) await warmupPostImages(normalized.imageUrls);
    invalidateAfterPostPublish({ tid });
    return {
      statusCode: 200,
      body: {
        ok: true,
        tid,
        url: `${config.nodebbPublicBaseUrl}/topic/${tid}`,
        recordId
      }
    };
  } catch (error) {
    await appendJsonLine(aiPostRecordsPath, {
      ...recordBase,
      status: "error",
      nodebbUid: auth.user?.nodebbUid || null,
      tid,
      error: error.message || "publish failed",
      failedAt: new Date().toISOString()
    }).catch(() => {});
    throw error;
  }
}

export {
  buildAiPostRecordBase,
  buildNodebbPayloadFromAiPost,
  createAiPostDraft,
  normalizeAiPostPayload,
  publishAiPost
};
