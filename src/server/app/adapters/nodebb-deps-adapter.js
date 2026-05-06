import { config } from "../../config.js";
import { makeNodebbGateways } from "../gateways/nodebb/index.js";

function jsonBearerHeaders() {
  return {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${config.nodebbToken}`
  };
}

function makeNodebbDeps() {
  const base = makeNodebbGateways();
  return {
    topics: {
      ...base.topics,
      createTopic: (args) => base.topics.createTopic({ ...args, headers: jsonBearerHeaders() }),
      createReply: (args) => base.topics.createReply({ ...args, headers: jsonBearerHeaders() }),
      markRead: (args) => base.topics.markRead({ ...args, headers: jsonBearerHeaders() })
    },
    posts: {
      ...base.posts,
      votePost: (args) => base.posts.votePost({ ...args, headers: jsonBearerHeaders() }),
      unvotePost: (args) => base.posts.unvotePost({ ...args, headers: jsonBearerHeaders() }),
      bookmarkPost: async (args) => {
        try {
          return await base.posts.bookmarkPost({ ...args, headers: jsonBearerHeaders() });
        } catch (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("already bookmarked") || msg.includes("already saved")) return {};
          throw error;
        }
      },
      unbookmarkPost: async (args) => {
        try {
          return await base.posts.unbookmarkPost({ ...args, headers: jsonBearerHeaders() });
        } catch (error) {
          const msg = String(error.message || "").toLowerCase();
          if (msg.includes("not bookmarked") || msg.includes("not saved")) return {};
          throw error;
        }
      },
      flagPost: (args) => base.posts.flagPost({ ...args, headers: jsonBearerHeaders() })
    },
    users: base.users,
    notifications: base.notifications
  };
}

export {
  jsonBearerHeaders,
  makeNodebbDeps
};
