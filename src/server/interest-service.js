const INTEREST_CATALOG = [
  {
    id: "campus-life",
    label: "校园日常",
    description: "真实的校园瞬间、生活观察和随手记录。",
    aliasCategories: ["record", "conversation"],
    contentTypes: ["campus_moment", "place_memory", "general"],
    tags: ["#校园日常", "#生活感", "#随手拍"],
    sceneTags: ["校园", "生活", "日常"]
  },
  {
    id: "food",
    label: "饭堂美食",
    description: "饭点、菜单、真实上桌和周边小吃。",
    aliasCategories: ["discovery", "guide"],
    contentTypes: ["food"],
    tags: ["#饭堂", "#校园美食", "#周边小吃"],
    sceneTags: ["食堂", "美食", "饭点"]
  },
  {
    id: "study",
    label: "学习自习",
    description: "图书馆、自习室、课程资料和学习经验。",
    aliasCategories: ["organize", "guide"],
    contentTypes: ["library_moment", "learning_scene", "guide"],
    tags: ["#图书馆", "#自习", "#学习经验"],
    sceneTags: ["图书馆", "学习", "自习"]
  },
  {
    id: "activities",
    label: "活动机会",
    description: "校园活动、社团、报名、志愿和项目机会。",
    aliasCategories: ["notice", "guide", "discovery"],
    contentTypes: ["activity_scene", "opportunity"],
    tags: ["#校园活动", "#报名机会", "#社团"],
    sceneTags: ["活动", "报名", "社团"]
  },
  {
    id: "places",
    label: "地点探索",
    description: "地图地点、路线、空间记忆和现场变化。",
    aliasCategories: ["discovery", "witness"],
    contentTypes: ["map_tip", "place_memory", "campus_tip"],
    tags: ["#地点", "#路线", "#现场"],
    sceneTags: ["地图", "地点", "路线"]
  },
  {
    id: "mutual-aid",
    label: "互助组队",
    description: "寻物、搭子、经验求助和低负担互助。",
    aliasCategories: ["mutual-aid", "conversation"],
    contentTypes: ["guide", "general", "opportunity"],
    tags: ["#互助", "#组队", "#求助"],
    sceneTags: ["互助", "组队", "求助"]
  },
  {
    id: "notices",
    label: "提醒通知",
    description: "截止、风险、变动和公共信息提醒。",
    aliasCategories: ["notice", "witness"],
    contentTypes: ["campus_tip", "map_tip", "opportunity"],
    tags: ["#提醒", "#通知", "#安全"],
    sceneTags: ["提醒", "通知", "安全"]
  }
];

const INTEREST_BY_ID = new Map(INTEREST_CATALOG.map((item) => [item.id, item]));

function normalizeInterestIds(value = []) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\s,，]+/);
  return [...new Set(source
    .map((item) => String(item || "").trim())
    .filter((item) => INTEREST_BY_ID.has(item)))]
    .slice(0, 5);
}

function publicInterestCatalog() {
  return INTEREST_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description
  }));
}

function buildInterestProfile(interestIds = []) {
  const normalized = normalizeInterestIds(interestIds);
  const contentTypes = new Set();
  const tags = new Set();
  const sceneTags = new Set();
  const aliasCategories = [];
  for (const id of normalized) {
    const item = INTEREST_BY_ID.get(id);
    if (!item) continue;
    item.contentTypes.forEach((value) => contentTypes.add(value));
    item.tags.forEach((value) => tags.add(value));
    item.sceneTags.forEach((value) => sceneTags.add(value));
    aliasCategories.push(...item.aliasCategories);
  }
  return {
    ids: normalized,
    contentTypes,
    tags,
    sceneTags,
    aliasCategories
  };
}

function scoreItemForInterests(item = {}, interestIds = []) {
  const profile = buildInterestProfile(interestIds);
  if (!profile.ids.length) return 0;
  const metadata = item.metadata || {};
  const contentType = String(item.contentType || metadata.contentType || "").trim();
  const primaryTag = String(item.primaryTag || metadata.primaryTag || metadata.tag || "").trim();
  const tags = [
    primaryTag,
    ...(Array.isArray(item.tags) ? item.tags : []),
    ...(Array.isArray(metadata.vibeTags) ? metadata.vibeTags : []),
    ...(Array.isArray(metadata.sceneTags) ? metadata.sceneTags : [])
  ].map((tag) => String(tag || "").trim()).filter(Boolean);

  let score = 0;
  if (contentType && profile.contentTypes.has(contentType)) score += 1.2;
  for (const tag of tags) {
    if (profile.tags.has(tag) || profile.sceneTags.has(tag.replace(/^#/, ""))) score += 0.55;
  }
  return Math.min(2.8, score);
}

function chooseAliasPoolIdForInterests(pool = [], interestIds = [], users = []) {
  const profile = buildInterestProfile(interestIds);
  const usedPoolIds = new Set();
  for (const user of users) {
    for (const alias of Array.isArray(user.aliases) ? user.aliases : []) {
      if (alias?.poolId && alias.status !== "inactive") usedPoolIds.add(alias.poolId);
    }
  }

  const preferred = pool
    .filter((item) => profile.aliasCategories.includes(item.category))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const candidates = [...preferred, ...pool.sort((a, b) => Number(a.order || 0) - Number(b.order || 0))];
  const unique = [];
  const seen = new Set();
  for (const item of candidates) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return (unique.find((item) => !usedPoolIds.has(item.id)) || unique[0] || null)?.id || "";
}

export {
  INTEREST_CATALOG,
  buildInterestProfile,
  chooseAliasPoolIdForInterests,
  normalizeInterestIds,
  publicInterestCatalog,
  scoreItemForInterests
};
