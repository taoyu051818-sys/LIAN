import { mapItems } from "./static-data.js";

const AI_DEFAULT_LOCATION_DRAFT = {
  source: "legacy_map",
  locationId: "",
  locationArea: "",
  displayName: "",
  lat: null,
  lng: null,
  legacyPoint: { x: null, y: null },
  imagePoint: { x: null, y: null },
  mapVersion: "legacy",
  confidence: 0,
  skipped: false,
  note: ""
};
const AI_LOCATION_SOURCES = new Set(["legacy_map", "map_v2", "manual", "ai_suggestion", "skipped"]);

function truncateLocationText(value = "", maxLength = 80) {
  return Array.from(String(value || "").trim()).slice(0, maxLength).join("");
}

function clampLocationNumber(value, min = 0, max = 1, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function knownLocationId(value = "") {
  const id = String(value || "").trim();
  if (!id) return "";
  return mapItems.some((item) => item.id === id) ? id : "";
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullablePoint(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return { x: nullableNumber(input.x), y: nullableNumber(input.y) };
}

function skippedLocationDraft(note = "") {
  return { ...AI_DEFAULT_LOCATION_DRAFT, source: "skipped", skipped: true, note: truncateLocationText(note, 120) };
}

function normalizeLocationDraft(value = {}, { aiLocationArea = "", locationHint = "" } = {}) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  if (input.skipped || input.source === "skipped") return skippedLocationDraft(input.note || "");
  const locationArea = truncateLocationText(input.locationArea || input.displayName || aiLocationArea || locationHint || "", 40);
  const displayName = truncateLocationText(input.displayName || locationArea, 40);
  const source = AI_LOCATION_SOURCES.has(input.source) ? input.source : (locationArea ? "manual" : "legacy_map");
  return {
    ...AI_DEFAULT_LOCATION_DRAFT,
    source,
    locationId: knownLocationId(input.locationId),
    locationArea,
    displayName,
    lat: nullableNumber(input.lat),
    lng: nullableNumber(input.lng),
    legacyPoint: nullablePoint(input.legacyPoint),
    imagePoint: nullablePoint(input.imagePoint),
    mapVersion: input.mapVersion === "gaode_v2" || source === "map_v2" ? "gaode_v2" : "legacy",
    confidence: clampLocationNumber(input.confidence, 0, 1, locationArea ? 0.55 : 0),
    skipped: false,
    note: truncateLocationText(input.note || "", 120)
  };
}

function locationDraftPlaceName(locationDraft = {}, fallback = "") {
  return truncateLocationText(locationDraft.displayName || locationDraft.locationArea || fallback || "", 40);
}

function locationDraftToNodebbMapLocation(locationDraft = {}) {
  if (!locationDraft || locationDraft.skipped) return null;
  return {
    x: locationDraft.legacyPoint?.x ?? locationDraft.imagePoint?.x ?? undefined,
    y: locationDraft.legacyPoint?.y ?? locationDraft.imagePoint?.y ?? undefined,
    lat: locationDraft.lat ?? undefined,
    lng: locationDraft.lng ?? undefined,
    placeName: locationDraftPlaceName(locationDraft)
  };
}

export {
  AI_DEFAULT_LOCATION_DRAFT,
  AI_LOCATION_SOURCES,
  knownLocationId,
  locationDraftPlaceName,
  locationDraftToNodebbMapLocation,
  normalizeLocationDraft,
  skippedLocationDraft
};
