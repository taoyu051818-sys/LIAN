import { makeNodebbClient } from "./client.js";

function makeNodebbTopicsGateway({ client = makeNodebbClient() } = {}) {
  return {
    async getRecentTopics({ page = 1 } = {}) {
      return await client.fetch(`/api/recent?page=${Number(page) || 1}`);
    },

    async getTopicDetail({ tid, nodebbUid } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      const path = nodebbUid ? client.withUid(`/api/topic/${topicId}`, nodebbUid) : `/api/topic/${topicId}`;
      return await client.fetch(path);
    },

    async createTopic({ nodebbUid, body, headers } = {}) {
      if (!nodebbUid) throw new Error("nodebbUid is required");
      return await client.fetch(client.withUid("/api/v3/topics", nodebbUid), {
        method: "POST",
        headers,
        body: JSON.stringify(body || {})
      });
    },

    async createReply({ tid, nodebbUid, body, headers } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      const attempts = [
        client.withUid(`/api/v3/topics/${topicId}`, nodebbUid),
        client.withUid(`/api/v3/topics/${topicId}/posts`, nodebbUid)
      ];
      let lastError;
      for (const path of attempts) {
        try {
          return await client.fetch(path, {
            method: "POST",
            headers,
            body: JSON.stringify(body || {})
          });
        } catch (error) {
          lastError = error;
          if (![404, 405].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    },

    async markRead({ tid, nodebbUid, headers } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      const attempts = [
        { method: "PUT", path: client.withUid(`/api/v3/topics/${topicId}/read`, nodebbUid) },
        { method: "POST", path: client.withUid(`/api/v3/topics/${topicId}/read`, nodebbUid) },
        { method: "POST", path: client.withUid(`/api/topic/${topicId}/read`, nodebbUid) }
      ];
      let lastError;
      for (const attempt of attempts) {
        try {
          return await client.fetch(attempt.path, { method: attempt.method, headers });
        } catch (error) {
          lastError = error;
          if (![404, 405].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    }
  };
}

export { makeNodebbTopicsGateway };
