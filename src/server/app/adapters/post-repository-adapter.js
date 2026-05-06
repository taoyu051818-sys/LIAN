import {
  loadMetadata,
  patchPostMetadata
} from "../../data-store.js";

function makePostRepository() {
  return {
    async getByTid(tid) {
      const metadata = await loadMetadata();
      return metadata[String(tid)] || {};
    },
    async listByTids(tids = []) {
      const metadata = await loadMetadata();
      return Object.fromEntries(tids.map((tid) => [String(tid), metadata[String(tid)] || {}]));
    },
    async patchByTid(tid, patch) {
      return await patchPostMetadata(tid, patch);
    }
  };
}

export { makePostRepository };
