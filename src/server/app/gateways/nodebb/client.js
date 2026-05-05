import { nodebbFetch, retryApi, withNodebbUid } from "../../../nodebb-client.js";

function nodebbStatusToHttpStatus(code) {
  if (code === "not-found") return 404;
  if (code === "forbidden") return 403;
  if (code === "unauthorized") return 401;
  if (code === "bad-request") return 400;
  return 400;
}

function assertNodebbOk(data) {
  const code = data?.status?.code;
  if (!code || code === "ok") return data;
  const error = new Error(data?.status?.message || code || "NodeBB API error");
  error.status = nodebbStatusToHttpStatus(code);
  error.data = data;
  throw error;
}

function makeNodebbClient({ transport = nodebbFetch, withUid = withNodebbUid, retry = retryApi } = {}) {
  return {
    async fetch(path, options = {}) {
      return assertNodebbOk(await transport(path, options));
    },
    withUid,
    retry
  };
}

export { assertNodebbOk, makeNodebbClient, nodebbStatusToHttpStatus };
