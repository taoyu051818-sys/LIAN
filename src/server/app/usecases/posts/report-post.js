function normalizeReportReason(reason) {
  const value = String(reason || "").trim();
  return value || "unspecified";
}

function firstPostForReport(detail = {}) {
  const post = detail?.posts?.[0] || {};
  const pid = Number(post.pid || detail.mainPid || 0) || 0;
  return { pid };
}

function makeReportPostUseCase({
  nodebbTopics,
  nodebbPosts,
  audiencePolicy,
  interactionPolicy,
  postRepository,
  reportRepository,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, tid, nodebbUid, reason } = {}) {
      const topicId = Number(tid);
      if (!topicId) throw new Error("tid is required");
      if (!nodebbUid) throw new Error("nodebbUid is required");

      interactionPolicy?.assertCanReport?.(actor);

      const meta = await postRepository?.getByTid?.(topicId);
      audiencePolicy?.assertCanView?.(actor, {
        visibility: meta?.visibility,
        audience: meta?.audience
      }, "detail");

      let detail;
      try {
        detail = await nodebbTopics.getTopicDetail({ tid: topicId, nodebbUid });
      } catch (error) {
        logger.warn?.(`[report-post] topic fetch failed tid=${topicId} uid=${nodebbUid}: ${error.message}`);
        error.status = error.status || 404;
        throw error;
      }

      const target = firstPostForReport(detail);
      if (!target.pid) {
        const error = new Error("post not found");
        error.status = 404;
        throw error;
      }

      const normalizedReason = normalizeReportReason(reason);
      const nodebbResult = await nodebbPosts.flagPost({
        pid: target.pid,
        nodebbUid,
        reason: normalizedReason
      });

      await reportRepository?.recordReport?.({
        actorId: actor?.id,
        tid: topicId,
        pid: target.pid,
        reason: normalizedReason,
        nodebbResult
      }).catch?.(() => {});

      cache?.invalidateTopic?.(topicId);

      return {
        ok: true,
        tid: topicId,
        pid: target.pid,
        reported: true
      };
    }
  };
}

export { firstPostForReport, makeReportPostUseCase, normalizeReportReason };
