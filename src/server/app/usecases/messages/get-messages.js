function defaultMapMessage(notification = {}) {
  return {
    id: notification.id || notification.nid || "",
    type: notification.type || "notification",
    title: notification.title || "",
    body: notification.body || "",
    path: notification.path || "",
    from: notification.from || null,
    read: Boolean(notification.read),
    datetimeISO: notification.datetimeISO || "",
    raw: notification.raw || notification
  };
}

function notificationTopicId(notification = {}) {
  const path = String(notification.path || notification.raw?.path || "");
  const match = path.match(/topic\/(\d+)/) || path.match(/\/t\/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function makeGetMessagesUseCase({
  nodebbNotifications,
  postRepository,
  audiencePolicy,
  mapper = defaultMapMessage,
  cache,
  logger = console
} = {}) {
  return {
    async execute({ actor, nodebbUid } = {}) {
      if (!nodebbUid) {
        const error = new Error("nodebbUid is required");
        error.status = 401;
        throw error;
      }

      const cacheKey = `messages:${actor?.id || nodebbUid}`;
      const cached = await cache?.get?.(cacheKey);
      if (cached) return cached;

      let data;
      try {
        data = await nodebbNotifications.listNotifications({ nodebbUid });
      } catch (error) {
        logger.warn?.(`[get-messages] NodeBB notifications fetch failed uid=${nodebbUid}: ${error.message}`);
        throw error;
      }

      const notifications = nodebbNotifications.normalizeList(data);
      const tids = [...new Set(notifications.map(notificationTopicId).filter(Boolean))];
      const metadataByTid = await postRepository?.listByTids?.(tids) || {};

      const visible = notifications.filter((notification) => {
        const tid = notificationTopicId(notification);
        if (!tid) return true;
        const metadata = metadataByTid?.[tid] || metadataByTid?.[String(tid)] || null;
        if (!audiencePolicy?.canView) return true;
        return audiencePolicy.canView(actor, {
          tid,
          visibility: metadata?.visibility,
          audience: metadata?.audience,
          metadata
        }, "messages");
      });

      const result = {
        ok: true,
        items: visible.map((notification) => mapper(notification)),
        source: "nodebb"
      };
      await cache?.set?.(cacheKey, result, { ttlSeconds: 20 });
      return result;
    }
  };
}

export { defaultMapMessage, makeGetMessagesUseCase, notificationTopicId };
