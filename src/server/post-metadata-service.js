import { normalizeAudience } from "./audience-service.js";

const AI_ALLOWED_CONTENT_TYPES = new Set([
  "campus_moment",
  "food",
  "place_memory",
  "campus_tip",
  "library_moment",
  "activity_scene",
  "learning_scene",
  "map_tip",
  "guide",
  "opportunity",
  "general"
]);
const AI_ALLOWED_VISIBILITY = new Set(["public", "campus", "school", "linkOnly", "private"]);
const AI_ALLOWED_DISTRIBUTION = new Set(["home", "moment", "map", "search", "detail", "detailOnly"]);
const AI_DEFAULT_METADATA = {
  contentType: "general",
  vibeTags: [],
  sceneTags: [],
  locationId: "",
  locationArea: "",
  qualityScore: 0,
  imageImpactScore: 0,
  riskScore: 0,
  officialScore: 0,
  visibility: "public",
  distribution: ["home", "search", "detail"],
  keepAfterExpired: false
};

function truncateMetadataText(value = "", maxLength = 80) {
  return Array.from(String(value || "").trim()).slice(0, maxLength).join("");
}

function clampMetadataNumber(value, min = 0, max = 1, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function compactMetadataStringArray(value, maxItems = 5, maxLength = 16) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => truncateMetadataText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function normalizeMetadataHashtag(value = "") {
  const body = Array.from(String(value || "").trim().replace(/^#+/, ""))
    .filter((char) => /[\p{L}\p{N}_-]/u.test(char))
    .join("")
    .slice(0, 15);
  return body ? `#${body}` : "";
}

function normalizeMetadataHashtags(value, maxItems = 5) {
  const source = Array.isArray(value) ? value.join(" ") : String(value || "");
  return [...new Set(source.replace(/#/g, " #").split(/[\s,，]+/).map(normalizeMetadataHashtag).filter(Boolean))].slice(0, maxItems);
}

function metadataArray(value, fallback = []) {
  if (!Array.isArray(value)) return [...fallback];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function metadataVisibilityFromAudience(audience = {}) {
  return audience.linkOnly ? "linkOnly" : (audience.visibility || "public");
}

function normalizeAiPublishMetadata(value = {}, locationDraft = {}, request = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const contentType = AI_ALLOWED_CONTENT_TYPES.has(input.contentType)
    ? input.contentType
    : (AI_ALLOWED_CONTENT_TYPES.has(request.template) ? request.template : AI_DEFAULT_METADATA.contentType);
  const visibility = AI_ALLOWED_VISIBILITY.has(input.visibility) ? input.visibility
    : (AI_ALLOWED_VISIBILITY.has(request.visibilityHint) ? request.visibilityHint : "public");
  const locationArea = locationDraft?.skipped
    ? truncateMetadataText(input.locationArea || request.locationHint || "", 40)
    : truncateMetadataText(locationDraft.locationArea || input.locationArea || request.locationHint || "", 40);
  const distribution = compactMetadataStringArray(input.distribution, 4, 20).filter((item) => AI_ALLOWED_DISTRIBUTION.has(item));
  const hasLatLng = !locationDraft?.skipped && Number.isFinite(Number(locationDraft?.lat)) && Number.isFinite(Number(locationDraft?.lng));
  return {
    ...AI_DEFAULT_METADATA,
    contentType,
    vibeTags: normalizeMetadataHashtags(input.vibeTags, 5),
    sceneTags: normalizeMetadataHashtags(input.sceneTags, 5),
    locationId: "",
    locationArea,
    qualityScore: clampMetadataNumber(input.qualityScore),
    imageImpactScore: clampMetadataNumber(input.imageImpactScore),
    riskScore: clampMetadataNumber(input.riskScore),
    officialScore: clampMetadataNumber(input.officialScore),
    visibility,
    audience: normalizeAudience(input.audience, visibility),
    distribution: distribution.length ? distribution : (locationArea ? ["home", "map", "search", "detail"] : ["home", "search", "detail"]),
    keepAfterExpired: Boolean(input.keepAfterExpired),
    imageUrls: metadataArray(input.imageUrls, []),
    lat: hasLatLng ? Number(locationDraft.lat) : undefined,
    lng: hasLatLng ? Number(locationDraft.lng) : undefined,
    mapVersion: locationDraft?.mapVersion || (hasLatLng ? "gaode_v2" : "legacy"),
    primaryTag: String(input.primaryTag || request.primaryTag || "").trim(),
    identityTag: String(request.identityTag || input.identityTag || "").trim(),
    locationDraft
  };
}

export {
  AI_ALLOWED_CONTENT_TYPES,
  AI_ALLOWED_DISTRIBUTION,
  AI_ALLOWED_VISIBILITY,
  AI_DEFAULT_METADATA,
  metadataArray,
  metadataVisibilityFromAudience,
  normalizeAiPublishMetadata
};
