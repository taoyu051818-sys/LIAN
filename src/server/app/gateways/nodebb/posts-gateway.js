import { makeNodebbClient } from "./client.js";

function makeNodebbPostsGateway({ client = makeNodebbClient() } = {}) {
  return {
    async votePost({ pid, nodebbUid, delta = 1, headers } = {}) {
      const postId = Number(pid);
      if (!postId) throw new Error("pid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      const attempts = [
        client.withUid(`/api/v3/posts/${postId}/vote`, nodebbUid),
        client.withUid(`/api/v3/posts/${postId}/votes`, nodebbUid)
      ];
      let lastError;
      for (const path of attempts) {
        try {
          return await client.fetch(path, {
            method: "PUT",
            headers,
            body: JSON.stringify({ delta })
          });
        } catch (error) {
          lastError = error;
          if (![404, 405].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    },

    async unvotePost({ pid, nodebbUid, headers } = {}) {
      const postId = Number(pid);
      if (!postId) throw new Error("pid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      const attempts = [
        client.withUid(`/api/v3/posts/${postId}/vote`, nodebbUid),
        client.withUid(`/api/v3/posts/${postId}/votes`, nodebbUid)
      ];
      let lastError;
      for (const path of attempts) {
        try {
          return await client.fetch(path, { method: "DELETE", headers });
        } catch (error) {
          lastError = error;
          if (![404, 405].includes(Number(error.status))) break;
        }
      }
      throw lastError;
    },

    async bookmarkPost({ pid, nodebbUid, headers } = {}) {
      const postId = Number(pid);
      if (!postId) throw new Error("pid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      return await client.fetch(client.withUid(`/api/v3/posts/${postId}/bookmark`, nodebbUid), {
        method: "PUT",
        headers
      });
    },

    async unbookmarkPost({ pid, nodebbUid, headers } = {}) {
      const postId = Number(pid);
      if (!postId) throw new Error("pid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      return await client.fetch(client.withUid(`/api/v3/posts/${postId}/bookmark`, nodebbUid), {
        method: "DELETE",
        headers
      });
    },

    async flagPost({ pid, nodebbUid, reason, headers } = {}) {
      const postId = Number(pid);
      if (!postId) throw new Error("pid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");
      return await client.fetch(client.withUid(`/api/v3/posts/${postId}/flag`, nodebbUid), {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: reason || "unspecified" })
      });
    }
  };
}

export { makeNodebbPostsGateway };
