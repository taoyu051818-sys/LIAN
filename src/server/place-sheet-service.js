import { canViewPost } from "./audience-service.js";
import { extractSummary, normalizePostImageUrl, proxiedPostImageUrl } from "./content-utils.js";
import { loadMetadata } from "./data-store.js";
import { sendJson } from "./http-response.js";
import { loadMapV2Data } from "./map-v2-service.js";

const PLACE_STATUS = new Set(["confirmed", "pending", "disputed", "expired", "ai-organized", "official"]);
const PLACE_TYPES = new Set(["building", "room", "facility", "outdoor", "merchant", "service", "unknown"]);

function compactText(value = "", maxLength = 120) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizePlaceType(value = "") {
  const type = compactText(value, 40);
  if (PLACE_TYPES.has(type)) return type;
  if (["school", "study", "campus", "transport", "food", "sports", "location", "village"].includes(type)) {
    if (type === "food") return "merchant";
    if (type === "transport") return "service";
    if (type === "sports") return "facility";
    return "facility";
  }
  return "unknown";
}

function normalizePlaceStatus(value = "") {
  const status = compactText(value, 40);
  return PLACE_STATUS.has(status) ? status : "confirmed";
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function buildPlaceRef(location = {}) {
  const place = {
    id: compactText(location.id, 80),
    name: compactText(location.name || location.card?.title || "未知地点", 80),
    type: normalizePlaceType(location.type),
    status: normalizePlaceStatus(location.placeStatus || (location.status === "active" ? "confirmed" : location.status)),
    lat: numberOrUndefined(location.lat),
    lng: numberOrUndefined(location.lng)
  };
  return Object.fromEntries(Object.entries(place).filter(([, value]) => value !== undefined && value !== ""));
}

function metadataMatchesPlace(metadata = {}, place = {}) {
  if (!metadata || typeof metadata !== "object") return false;
  if (metadata.locationId && metadata.locationId === place.id) return true;
  if (metadata.placeId && metadata.placeId === place.id) return true;
  return false;
}

function firstImageUrl(metadata = {}) {
  if (!Array.isArray(metadata.imageUrls)) return "";
  const image = metadata.imageUrls.find(Boolean);
  return image ? proxiedPostImageUrl(normalizePostImageUrl(image, { width: 600 }), { width: 400 }) : "";
}

function buildRecentPostPreview(tid, metadata = {}) {
  const title = compactText(metadata.title || metadata.locationArea || "校园内容", 80);
  const summarySource = metadata.summary || metadata.description || metadata.sourceTimeText || metadata.contentPreview || "";
  return {
    tid: Number(tid) || String(tid),
    title,
    excerpt: extractSummary(summarySource, title).slice(0, 120),
    imageUrl: firstImageUrl(metadata),
    primaryTag: compactText(metadata.primaryTag || metadata.tag || "", 40),
    timestampISO: compactText(metadata.createdAt || metadata.timestampISO || metadata.updatedAt || "", 40)
  };
}

function buildPlaceStats(posts = []) {
  return {
    postCount: posts.length,
    savedCount: 0,
    correctionCount: 0
  };
}

function buildPlaceSummary(place = {}, posts = []) {
  if (!posts.length) return undefined;
  return {
    text: `${place.name} 相关内容已开始沉淀，可先查看最近发布的校园信息。`,
    sourceCount: posts.length,
    aiGenerated: false,
    confidenceLabel: posts.length >= 3 ? "medium" : "low"
  };
}

function sortRecentPosts(entries = []) {
  return [...entries].sort((a, b) => {
    const at = Date.parse(a.metadata.createdAt || a.metadata.timestampISO || a.metadata.updatedAt || 0) || Number(a.tid) || 0;
    const bt = Date.parse(b.metadata.createdAt || b.metadata.timestampISO || b.metadata.updatedAt || 0) || Number(b.tid) || 0;
    return bt - at;
  });
}

function buildPlaceSheetDto(location = {}, metadata = {}, viewer = null) {
  const place = buildPlaceRef(location);
  const relatedEntries = Object.entries(metadata)
    .filter(([, item]) => metadataMatchesPlace(item, place))
    .filter(([, item]) => canViewPost(viewer, item, "place"))
    .map(([tid, item]) => ({ tid, metadata: item }));
  const recentPosts = sortRecentPosts(relatedEntries)
    .slice(0, 6)
    .map(({ tid, metadata: item }) => buildRecentPostPreview(tid, item));

  return {
    place,
    status: place.status || "confirmed",
    source: {
      provider: "lian",
      label: "LIAN 地点库",
      visible: false
    },
    updatedAt: compactText(location.updatedAt || "", 40),
    stats: buildPlaceStats(relatedEntries),
    summary: buildPlaceSummary(place, relatedEntries),
    recentPosts
  };
}

async function getPlaceSheetById(placeId, { viewer = null } = {}) {
  const id = compactText(placeId, 80);
  if (!id) {
    const error = new Error("place id is required");
    error.status = 400;
    throw error;
  }
  const { locations } = await loadMapV2Data();
  const location = (locations.items || []).find((item) => item.id === id && item.status === "active");
  if (!location) {
    const error = new Error("place not found");
    error.status = 404;
    throw error;
  }
  const metadata = await loadMetadata();
  return buildPlaceSheetDto(location, metadata, viewer);
}

async function handlePlaceSheet(req, placeId, res) {
  try {
    const sheet = await getPlaceSheetById(placeId, { viewer: null });
    return sendJson(res, 200, { ok: true, ...sheet });
  } catch (error) {
    return sendJson(res, error.status || 500, { error: error.message });
  }
}

export {
  buildPlaceRef,
  buildPlaceSheetDto,
  getPlaceSheetById,
  handlePlaceSheet,
  normalizePlaceStatus,
  normalizePlaceType
};
