import { makeNodebbClient } from "./client.js";

function makeNodebbUsersGateway({ client = makeNodebbClient() } = {}) {
  return {
    async getUserByUid({ uid, headers } = {}) {
      const nodebbUid = Number(uid);
      if (!nodebbUid) throw new Error("uid is required");
      return await client.fetch(`/api/user/uid/${nodebbUid}`, { headers });
    },

    async searchUsers({ query, headers } = {}) {
      const value = String(query || "").trim();
      if (!value) return [];
      const attempts = [
        `/api/users?query=${encodeURIComponent(value)}`,
        `/api/search/users?query=${encodeURIComponent(value)}`
      ];
      let lastError;
      for (const path of attempts) {
        try {
          return await client.fetch(path, { headers });
        } catch (error) {
          lastError = error;
          if (![404, 405].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    },

    async createUser({ body, headers } = {}) {
      return await client.fetch("/api/v3/users", {
        method: "POST",
        headers,
        body: JSON.stringify(body || {})
      });
    },

    async getUserCollection({ slug, endpoint, nodebbUid, headers } = {}) {
      const userslug = String(slug || "").trim();
      const collection = String(endpoint || "").trim();
      if (!userslug) throw new Error("slug is required");
      if (!collection) throw new Error("endpoint is required");
      const attempts = [
        nodebbUid ? client.withUid(`/api/user/${userslug}/${collection}`, nodebbUid) : `/api/user/${userslug}/${collection}`,
        nodebbUid ? `/api/user/${userslug}/${collection}?_uid=${nodebbUid}` : `/api/user/${userslug}/${collection}`,
        nodebbUid ? client.withUid(`/api/v3/users/${nodebbUid}/${collection}`, nodebbUid) : ""
      ].filter(Boolean);
      let lastError;
      for (const path of attempts) {
        try {
          return await client.fetch(path, { headers });
        } catch (error) {
          lastError = error;
          if (![404, 405, 401, 403].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    }
  };
}

export { makeNodebbUsersGateway };
