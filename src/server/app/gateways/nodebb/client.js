import { nodebbFetch, retryApi, withNodebbUid } from "../../../nodebb-client.js";

function makeNodebbClient({ transport = nodebbFetch, withUid = withNodebbUid, retry = retryApi } = {}) {
  return {
    fetch: transport,
    withUid,
    retry
  };
}

export { makeNodebbClient };
