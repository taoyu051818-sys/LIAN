import { activeAlias } from "./alias-service.js";
import { selectIdentityTag } from "./auth-service.js";

function avatarTextFor(value = "") {
  return String(value || "同").slice(0, 1);
}

function resolveDisplayActor(user = {}, alias = null) {
  const selectedAlias = alias || activeAlias(user);
  const displayName = selectedAlias?.name || user.username || "同学";
  return {
    userId: user.id || "",
    nodebbUid: user.nodebbUid || null,
    displayName,
    username: displayName,
    aliasId: selectedAlias?.id || "",
    aliasName: selectedAlias?.name || "",
    avatarText: avatarTextFor(displayName),
    avatarUrl: selectedAlias ? (selectedAlias.avatarUrl || "") : (user.avatarUrl || user.nodebbPicture || ""),
    source: selectedAlias ? "alias" : "user"
  };
}

function buildDisplayActorMeta(user = {}, { alias = null, identityTag = "" } = {}) {
  const actor = resolveDisplayActor(user, alias);
  return {
    userId: actor.userId,
    nodebbUid: actor.nodebbUid,
    username: actor.displayName,
    displayName: actor.displayName,
    aliasId: actor.aliasId,
    aliasName: actor.aliasName,
    identityTag: selectIdentityTag(user, identityTag),
    avatarText: actor.avatarText,
    avatarUrl: actor.avatarUrl,
    actorSource: actor.source,
    sentAt: new Date().toISOString()
  };
}

export {
  buildDisplayActorMeta,
  resolveDisplayActor
};
