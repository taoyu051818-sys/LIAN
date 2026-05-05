function makePublishError(message = "publish is not allowed", status = 403) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hasTitle(payload = {}) {
  return Boolean(String(payload.title || "").trim());
}

function makePublishPolicy() {
  function assertActivePublisher(actor = {}) {
    if (!actor?.id) throw makePublishError("login required", 401);
    if (actor.status === "limited") throw makePublishError("account is limited", 403);
  }

  function assertTitle(payload = {}) {
    if (!hasTitle(payload)) throw makePublishError("title is required", 400);
  }

  return {
    assertCanPublishRegular(actor, payload = {}) {
      assertActivePublisher(actor);
      assertTitle(payload);
    },

    assertCanSaveAiDraft(actor) {
      assertActivePublisher(actor);
    },

    assertCanPublishAiDraft(actor, payload = {}) {
      assertActivePublisher(actor);
      assertTitle(payload);
    },

    assertAiPreviewDoesNotPublish() {
      return true;
    }
  };
}

export { makePublishError, makePublishPolicy };
