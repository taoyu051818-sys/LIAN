import { selectIdentityTag } from "./auth-service.js";
import {
  buildTextPostHtml,
  escapeHtml,
  extractCover,
  normalizePostImageUrl,
  proxiedPostImageUrl
} from "./content-utils.js";

function userSignature(user, alias = null, identityTag = "") {
  if (!user) return "";
  const displayName = alias?.name || user.username || "同学";
  const signal = identityTag
    ? `｜${identityTag}`
    : (Array.isArray(user.tags) && user.tags.length ? `｜${user.tags.join(" ")}` : "");
  return `\n\n<p style="color:#69706b;font-size:13px">来自 ${escapeHtml(displayName)}${escapeHtml(signal)}</p>`;
}

function buildLianUserMeta(user = {}, identityTag = "", alias = null) {
  if (!user?.id) return "";
  const displayName = alias?.name || user.username || "";
  const selectedIdentityTag = selectIdentityTag(user, identityTag);
  const meta = {
    userId: user.id,
    nodebbUid: user.nodebbUid || null,
    username: displayName,
    aliasId: alias?.id || "",
    aliasName: alias?.name || "",
    identityTag: selectedIdentityTag,
    avatarText: String(displayName || "同").slice(0, 1),
    avatarUrl: alias ? (alias.avatarUrl || "") : (user.avatarUrl || user.nodebbPicture || ""),
    sentAt: new Date().toISOString()
  };
  return `<!-- lian-user-meta ${escapeHtml(JSON.stringify(meta))} -->`;
}

function normalizeDisplayTag(value = "") {
  const tag = String(value || "").trim();
  if (!tag) return "";
  return tag.startsWith("#") ? tag : `#${tag}`;
}

function buildChannelMessageHtml(content, user, identityTag = "") {
  const selectedIdentityTag = selectIdentityTag(user, identityTag);
  const meta = {
    userId: user.id,
    nodebbUid: user.nodebbUid || null,
    username: user.username,
    identityTag: selectedIdentityTag,
    avatarText: String(user.username || "同").slice(0, 1),
    avatarUrl: user.avatarUrl || "",
    sentAt: new Date().toISOString()
  };
  return `<!-- lian-channel-meta ${escapeHtml(JSON.stringify(meta))} -->\n${buildTextPostHtml(content)}`;
}

function buildTopicHtml(payload) {
  const blocks = [];
  const identityTag = selectIdentityTag(payload.currentUser || {}, payload.identityTag || "");
  if (payload.currentUser) blocks.push(buildLianUserMeta(payload.currentUser, identityTag, payload.alias || null));
  const imageUrls = Array.isArray(payload.imageUrls) && payload.imageUrls.length
    ? payload.imageUrls
    : [payload.imageUrl].filter(Boolean);
  for (const rawImageUrl of imageUrls) {
    const imageUrl = normalizePostImageUrl(rawImageUrl, { width: 1200 });
    blocks.push(`<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(payload.title || "cover")}" style="max-width:100%;height:auto" />`);
  }
  const tag = normalizeDisplayTag(payload.tag);
  if (tag) blocks.push(`<p><strong>${escapeHtml(tag)}</strong></p>`);
  const content = String(payload.content || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`);
  blocks.push(...content);
  if (payload.placeName || (payload.lat && payload.lng)) {
    const place = [payload.placeName, payload.lat && payload.lng ? `${payload.lat}, ${payload.lng}` : ""].filter(Boolean).join(" ");
    blocks.push(`<p>地点：${escapeHtml(place)}</p>`);
  }
  if (payload.mapLocation && typeof payload.mapLocation === "object") {
    blocks.push(`<!-- lian-map-location ${escapeHtml(JSON.stringify(payload.mapLocation))} -->`);
  }
  return `${blocks.join("\n\n").trim()}${userSignature(payload.currentUser, payload.alias || null, identityTag)}`.trim();
}

function normalizeProfileTopic(topic, metadata = {}) {
  const tid = Number(topic.tid || 0);
  const meta = metadata[String(tid)] || {};
  const title = topic.titleRaw || topic.title || meta.title || "未命名";
  const timestampISO = topic.timestampISO || topic.lastposttimeISO || "";
  const contentHtml = topic.posts?.[0]?.content || topic.teaser?.content || "";
  const cover = meta.imageUrls?.[0]
    ? proxiedPostImageUrl(meta.imageUrls[0], { width: 400 })
    : extractCover(contentHtml);
  return {
    tid,
    title,
    cover,
    timestampISO,
    visibility: meta.visibility || "public",
    audience: meta.audience || null,
    author: topic.user?.username || topic.author?.username || "同学"
  };
}

function buildReplyHtml(content, user = null) {
  return String(content || "").trim().startsWith("<!-- lian-channel-meta")
    ? String(content || "").trim()
    : `${buildLianUserMeta(user)}\n${buildTextPostHtml(content)}${userSignature(user)}`.trim();
}

export {
  buildChannelMessageHtml,
  buildLianUserMeta,
  buildReplyHtml,
  buildTopicHtml,
  normalizeProfileTopic,
  userSignature
};
