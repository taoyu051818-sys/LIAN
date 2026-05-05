function feedFeatureEnabled(rules, featureName) {
  return Boolean(rules?.feedFeatures?.[featureName]);
}

function scoringRules(rules = {}) {
  return {
    readPenalty: -60,
    qualityWeight: 40,
    imageImpactWeight: 24,
    riskPenalty: -220,
    officialHomePenalty: -35,
    riskHideThreshold: 0.7,
    missingLocationAreaPenalty: 0,
    contentTypeWeights: {},
    momentContentTypeWeights: {},
    momentMissingLocationAreaPenalty: 0,
    vibeWeights: {},
    sceneWeights: {},
    ...(rules.scoring || {})
  };
}

function itemScoreTags(item = {}) {
  return [
    item.tag,
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(item.vibeTags) ? item.vibeTags : []),
    ...(Array.isArray(item.sceneTags) ? item.sceneTags : [])
  ].map((tag) => String(tag || "").trim()).filter(Boolean);
}

function legacyScoreItem(item, rules) {
  if (item.isExpired) return -10_000;
  const pinnedIndex = (rules.pinnedTids || []).indexOf(Number(item.tid));
  const pinned = pinnedIndex >= 0 ? 1000 - pinnedIndex * 5 : 0;
  const tagWeight = rules.tagWeights?.[item.tag] || 0;
  const activeTime = item.startsAt || item.endsAt || item.expiresAt || item.timestampISO || new Date().toISOString();
  const ageMs = Math.abs(Date.now() - Date.parse(activeTime));
  const halfLife = Math.max(1, Number(rules.recencyHalfLifeHours || 96));
  const recency = 60 * Math.pow(0.5, ageMs / (halfLife * 3600_000));
  const cover = item.cover ? Number(rules.coverBonus || 0) : 0;
  return pinned + tagWeight + recency + cover + item.priority;
}

function scoreItem(item, rules, { readTids = new Set(), surface = "home", useOfficialPenalty = true } = {}) {
  if (!feedFeatureEnabled(rules, "enhancedScoring")) return legacyScoreItem(item, rules);

  const base = legacyScoreItem(item, rules);
  const scoring = scoringRules(rules);
  const tags = itemScoreTags(item);
  const seen = new Set();
  const tagScore = tags.reduce((sum, tag) => {
    if (seen.has(tag)) return sum;
    seen.add(tag);
    const baseTagWeight = tag === item.tag ? 0 : Number(rules.tagWeights?.[tag] || 0);
    return sum
      + baseTagWeight
      + Number(scoring.vibeWeights?.[tag] || 0)
      + Number(scoring.sceneWeights?.[tag] || 0);
  }, 0);
  const quality = Number(item.qualityScore || 0) * Number(scoring.qualityWeight || 0);
  const imageImpact = Number(item.imageImpactScore || 0) * Number(scoring.imageImpactWeight || 0);
  const risk = Number(item.riskScore || 0) * Number(scoring.riskPenalty || 0);
  const official = surface === "home" && useOfficialPenalty
    ? Number(item.officialScore || 0) * Number(scoring.officialHomePenalty || 0)
    : 0;
  const contentType = Number(scoring.contentTypeWeights?.[item.contentType] || 0);
  const locationArea = item.locationArea ? 0 : Number(scoring.missingLocationAreaPenalty || 0);
  const read = readTids.has(Number(item.tid)) ? Number(scoring.readPenalty || 0) : 0;
  return base + tagScore + quality + imageImpact + risk + official + contentType + locationArea + read;
}

function scoreBreakdown(item, rules, { readTids = new Set(), surface = "home", useOfficialPenalty = true } = {}) {
  const legacy = legacyScoreItem(item, rules);
  if (!feedFeatureEnabled(rules, "enhancedScoring")) {
    return {
      legacy,
      tag: 0,
      vibe: 0,
      scene: 0,
      quality: 0,
      imageImpact: 0,
      risk: 0,
      official: 0,
      contentType: 0,
      locationArea: 0,
      read: 0,
      final: legacy
    };
  }

  const scoring = scoringRules(rules);
  const tags = itemScoreTags(item);
  const seen = new Set();
  let tag = 0;
  let vibe = 0;
  let scene = 0;
  for (const scoreTag of tags) {
    if (seen.has(scoreTag)) continue;
    seen.add(scoreTag);
    tag += scoreTag === item.tag ? 0 : Number(rules.tagWeights?.[scoreTag] || 0);
    vibe += Number(scoring.vibeWeights?.[scoreTag] || 0);
    scene += Number(scoring.sceneWeights?.[scoreTag] || 0);
  }
  const quality = Number(item.qualityScore || 0) * Number(scoring.qualityWeight || 0);
  const imageImpact = Number(item.imageImpactScore || 0) * Number(scoring.imageImpactWeight || 0);
  const risk = Number(item.riskScore || 0) * Number(scoring.riskPenalty || 0);
  const official = surface === "home" && useOfficialPenalty
    ? Number(item.officialScore || 0) * Number(scoring.officialHomePenalty || 0)
    : 0;
  const contentType = Number(scoring.contentTypeWeights?.[item.contentType] || 0);
  const locationArea = item.locationArea ? 0 : Number(scoring.missingLocationAreaPenalty || 0);
  const read = readTids.has(Number(item.tid)) ? Number(scoring.readPenalty || 0) : 0;
  const final = legacy + tag + vibe + scene + quality + imageImpact + risk + official + contentType + locationArea + read;
  return { legacy, tag, vibe, scene, quality, imageImpact, risk, official, contentType, locationArea, read, final };
}

function diversityKey(value) {
  const key = String(value || "").trim();
  return key || "";
}

function exceedsDiversityLimits(item, counters, diversity) {
  const contentType = diversityKey(item.contentType);
  const locationArea = diversityKey(item.locationArea);
  const primaryTag = diversityKey(item.tag || item.tags?.[0]);
  return Boolean(
    (contentType && counters.contentType[contentType] >= Number(diversity.maxSameContentType || Infinity)) ||
    (locationArea && counters.locationArea[locationArea] >= Number(diversity.maxSameLocationArea || Infinity)) ||
    (primaryTag && counters.primaryTag[primaryTag] >= Number(diversity.maxSamePrimaryTag || Infinity))
  );
}

function addDiversityCounters(item, counters) {
  const contentType = diversityKey(item.contentType);
  const locationArea = diversityKey(item.locationArea);
  const primaryTag = diversityKey(item.tag || item.tags?.[0]);
  if (contentType) counters.contentType[contentType] = (counters.contentType[contentType] || 0) + 1;
  if (locationArea) counters.locationArea[locationArea] = (counters.locationArea[locationArea] || 0) + 1;
  if (primaryTag) counters.primaryTag[primaryTag] = (counters.primaryTag[primaryTag] || 0) + 1;
}

function diversifyItems(items, rules) {
  const diversity = rules.diversity || {};
  if (!feedFeatureEnabled(rules, "diversity") || diversity.enabled === false) return items;
  const selected = [];
  const delayed = [];
  const counters = { contentType: {}, locationArea: {}, primaryTag: {} };

  for (const item of items) {
    if (exceedsDiversityLimits(item, counters, diversity)) {
      delayed.push(item);
      continue;
    }
    selected.push(item);
    addDiversityCounters(item, counters);
  }
  return [...selected, ...delayed];
}

function momentScoreItem(item, rules) {
  const scoring = scoringRules(rules);
  const activeTime = item.startsAt || item.endsAt || item.expiresAt || item.timestampISO || new Date().toISOString();
  const ageMs = Math.max(0, Date.now() - Date.parse(activeTime));
  const halfLife = Math.max(1, Number(rules.recencyHalfLifeHours || 48));
  const recency = 90 * Math.pow(0.5, ageMs / (halfLife * 3600_000));
  const quality = Number(item.qualityScore || 0) * 35;
  const imageImpact = Number(item.imageImpactScore || 0) * 30;
  const replies = Number(item.replyCount || 0) * 4;
  const priority = Number(item.priority || 0);
  const tags = new Set(itemScoreTags(item));
  const momentVibe = ["真实", "在地", "有网感", "生活感", "现场感", "实用", "路况", "饭点", "夜宵", "傍晚", "夜间"];
  const vibe = momentVibe.reduce((sum, tag) => sum + (tags.has(tag) ? 12 : 0), 0);
  const contentTypeWeights = scoring.momentContentTypeWeights || {};
  const contentType = Number(contentTypeWeights[item.contentType] || 0);
  const locationArea = item.locationArea ? 0 : Number(scoring.momentMissingLocationAreaPenalty || 0);
  return recency + quality + imageImpact + replies + priority + vibe + contentType + locationArea;
}

export {
  diversifyItems,
  feedFeatureEnabled,
  itemScoreTags,
  legacyScoreItem,
  momentScoreItem,
  scoreBreakdown,
  scoreItem,
  scoringRules
};
