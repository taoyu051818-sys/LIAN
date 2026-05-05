import { makeNodebbClient } from "./client.js";

const USER_COLLECTION_ENDPOINTS = new Map([
  ["bookmarks", "bookmarks"],
  ["bookmark", "bookmarks"],
  ["saved", "bookmarks"],
  ["upvoted", "upvoted"],
  ["liked", "upvoted"],
  ["likes", "upvoted"],
  ["posts", "posts"],
  ["topics", "topics"]
]);

function normalizeUserCollectionEndpoint(endpoint = "") {
  const key = String(endpoint || "").trim().toLowerCase();
  const value = USER_COLLECTION_ENDPOINTS.get(key);
  if (!value) {
    const error = new Error(`unsupported NodeBB user collection: ${endpoint}`);
    error.status = 400;
    throw error;
  }
  return value;
}

function userCollectionPath(userslug, collection, nodebbUid) {
  const base = `/api/user/${encodeURIComponent(userslug)}/${collection}`;
  return nodebbUid ? `${base}?_uid=${encodeURIComponent(String(nodebbUid))}` : base;
}

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
      if (!userslug) throw new Error("slug is required");
      const collection = normalizeUserCollectionEndpoint(endpoint);
      return await client.fetch(userCollectionPath(userslug, collection, nodebbUid), { headers });
    }
  };
}

export {
  makeNodebbUsersGateway,
  normalizeUserCollectionEndpoint,
  userCollectionPath
};
