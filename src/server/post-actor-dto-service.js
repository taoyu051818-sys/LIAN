const BLOCKED_IDENTITY_TAGS = new Set(["nodebb", "system", "lian", "imported"]);
const ALLOWED_SOURCE_PROVIDERS = new Set(["nodebb", "lian", "imported", "official"]);

function initialsFromName(value = "") {
  return Array.from(String(value || "同学").trim()).slice(0, 2).join("").toUpperCase() || "同";
}

function normalizeIdentityTag(value = "") {
  const tag = String(value || "").trim();
  if (!tag) return "";
  return BLOCKED_IDENTITY_TAGS.has(tag.toLowerCase()) ? "" : tag;
}

function normalizeSourceProvider(value = "") {
  const provider = String(value || "").trim().toLowerCase();
  return ALLOWED_SOURCE_PROVIDERS.has(provider) ? provider : "";
}

function buildSourceSignal(author = {}, metadata = {}) {
  const provider = normalizeSourceProvider(metadata.sourceProvider || author.sourceProvider || "");
  if (!provider) return undefined;
  return {
    provider,
    label: String(metadata.sourceLabel || author.sourceLabel || "").trim(),
    visible: Boolean(metadata.sourceVisible || author.sourceVisible)
  };
}

function buildDisplayActorDto(author = {}) {
  const displayName = String(author.displayName || author.name || author.username || "同学").trim() || "同学";
  return {
    displayName,
    avatarUrl: String(author.avatarUrl || "").trim(),
    avatarText: String(author.avatarText || initialsFromName(displayName)).trim(),
    identityTag: normalizeIdentityTag(author.identityTag)
  };
}

function buildActorSourcePair(author = {}, metadata = {}) {
  const actor = buildDisplayActorDto(author);
  return {
    actor,
    source: buildSourceSignal(author, metadata)
  };
}

export {
  buildActorSourcePair,
  buildDisplayActorDto,
  buildSourceSignal,
  normalizeIdentityTag,
  normalizeSourceProvider
};
