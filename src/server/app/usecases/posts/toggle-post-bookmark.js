function firstPostBookmarkState(detail = {}) {
  const post = detail?.posts?.[0] || {};
  const pid = Number(post.pid || detail.mainPid || 0) || 0;
  return { pid, saved: Boolean(post.bookmarked) };
}

function makeTogglePostBookmarkUseCase({
  nodebbTopics,
  nodebbPosts,
  audiencePolicy,
  interactionPolicy,
  postRepository,
  userInteractionRepository,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, tid, nodebbUid, desiredSaved } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");

      interactionPolicy?.assertCanBookmark?.(actor);

      const meta = await postRepository?.getByTid?.(topicId);
      audiencePolicy?.assertCanView?.(actor, {
        visibility: meta?.visibility,
        audience: meta?.audience
      }, "detail");

      let detail;
      try {
        detail = await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid });
      } catch (error) {
        logger.warn?.(`[toggle-post-bookmark] topic fetch failed tid=${topicId} uid=${nodebbUid}: ${error.message}`);
        await userInteractionRepository?.recordSave?.(actor?.id, topicId, false).catch?.(() => {});
        error.status = error.status || 404;
        throw error;
      }

      const before = firstPostBookmarkState(detail);
      if (!before.pid) {
        const error = new Error("post not found");
        error.status = 404;
        await userInteractionRepository?.recordSave?.(actor?.id, topicId, false).catch?.(() => {});
        throw error;
      }

      const shouldSave = typeof desiredSaved === "boolean" ? desiredSaved : !before.saved;
      if (shouldSave) {
        await nodebbPosts.bookmarkPost({ pid: before.pid, nodebbUid });
      } else {
        await nodebbPosts.unbookmarkPost({ pid: before.pid, nodebbUid });
      }

      await userInteractionRepository?.recordSave?.(actor?.id, topicId, shouldSave).catch?.(() => {});
      cache?.invalidateTopic?.(topicId);
      cache?.invalidateFeed?.();

      return {
        ok: true,
        tid: topicId,
        pid: before.pid,
        saved: shouldSave
      };
    }
  };
}

export { firstPostBookmarkState, makeTogglePostBookmarkUseCase };
