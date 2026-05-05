function makeForbiddenError(message = "interaction is not allowed") {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function isLimitedAccount(actor = {}) {
  return actor?.status === "limited";
}

function makeInteractionPolicy({ accountIsLimited = isLimitedAccount } = {}) {
  function assertActiveActor(actor) {
    if (!actor?.id) throw makeForbiddenError("login required");
    if (accountIsLimited(actor)) throw makeForbiddenError("account is limited");
  }

  return {
    assertCanLike(actor) {
      assertActiveActor(actor);
    },

    assertCanBookmark(actor) {
      assertActiveActor(actor);
    },

    assertCanReport(actor) {
      assertActiveActor(actor);
    },

    assertCanReply(actor) {
      assertActiveActor(actor);
    }
  };
}

export { makeForbiddenError, makeInteractionPolicy };
