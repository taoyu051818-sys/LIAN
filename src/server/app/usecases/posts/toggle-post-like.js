function firstPostVoteState(detail = {}) {
  const post = detail?.posts?.[0] || {};
  const pid = Number(post.pid || detail.mainPid || 0) || 0;
  const likeCount = Number(post.upvotes ?? post.votes ?? post.reputation ?? 0) || 0;
  const liked = post.upvoted === undefined && post.voted === undefined && post.vote === undefined
    ? null
    : Boolean(post.upvoted || post.voted === 1 || post.vote === 1);
  return { pid, likeCount: Math.max(0, likeCount), liked };
}

function makeTogglePostLikeUseCase({
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
    async execute({ actor, tid, nodebbUid, desiredLiked } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");

      interactionPolicy?.assertCanLike?.(actor);

      const meta = await postRepository?.getByTid?.(topicId);
      audiencePolicy?.assertCanView?.(actor, {
        visibility: meta?.visibility,
        audience: meta?.audience
      }, "detail");

      let detail;
      try {
        detail = await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid });
      } catch (error) {
        logger.warn?.(`[toggle-post-like] topic fetch failed tid=${topicId} uid=${nodebbUid}: ${error.message}`);
        await userInteractionRepository?.recordLike?.(actor?.id, topicId, false).catch?.(() => {});
        error.status = error.status || 404;
        throw error;
      }

      const before = firstPostVoteState(detail);
      if (!before.pid) {
        const error = new Error("post not found");
        error.status = 404;
        await userInteractionRepository?.recordLike?.(actor?.id, topicId, false).catch?.(() => {});
        throw error;
      }

      const shouldLike = typeof desiredLiked === "boolean" ? desiredLiked : !before.liked;
      if (shouldLike) {
        await nodebbPosts.votePost({ pid: before.pid, nodebbUid });
      } else {
        await nodebbPosts.unvotePost({ pid: before.pid, nodebbUid });
      }

      await userInteractionRepository?.recordLike?.(actor?.id, topicId, shouldLike).catch?.(() => {});
      cache?.invalidateTopic?.(topicId);
      cache?.invalidateFeed?.();

      let likeCount = Math.max(0, before.likeCount + (shouldLike ? 1 : -1));
      try {
        const after = firstPostVoteState(await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid }));
        if (after.likeCount) likeCount = after.likeCount;
      } catch {
        // Refetch failure does not change the successful toggle result.
      }

      return {
        ok: true,
        tid: topicId,
        pid: before.pid,
        liked: shouldLike,
        likeCount
      };
    }
  };
}

export { firstPostVoteState, makeTogglePostLikeUseCase };
