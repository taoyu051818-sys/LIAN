import {
  canCreatePostWithAudience,
  canViewPost,
  normalizeAudienceForCreate
} from "../../audience-service.js";

function makeAccessDeniedError(message = "access denied") {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function makeAudiencePolicy({
  canView = canViewPost,
  canCreate = canCreatePostWithAudience,
  normalizeForCreate = normalizeAudienceForCreate
} = {}) {
  return {
    canView(actor, post, context = "detail") {
      return canView(actor, post, context);
    },

    assertCanView(actor, post, context = "detail") {
      if (!canView(actor, post, context)) throw makeAccessDeniedError();
    },

    filterVisible(actor, posts = [], context = "feed") {
      return posts.filter((post) => canView(actor, post, context));
    },

    normalizeForCreate(actor, audience, fallbackVisibility = "public") {
      return normalizeForCreate(actor, audience, fallbackVisibility);
    },

    canCreate(actor, audience) {
      return canCreate(actor, audience);
    },

    assertCanCreate(actor, audience) {
      if (!canCreate(actor, audience)) throw makeAccessDeniedError("audience is not allowed");
    }
  };
}

export { makeAccessDeniedError, makeAudiencePolicy };
