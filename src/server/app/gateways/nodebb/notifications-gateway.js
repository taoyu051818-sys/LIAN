import { makeNodebbClient } from "./client.js";

function normalizeNodebbNotification(notification = {}) {
  return {
    id: notification.nid || notification.id || "",
    type: notification.type || notification["notification-type-name"] || "notification",
    title: notification.title || notification.bodyShort || notification.bodyLong || "",
    body: notification.bodyLong || notification.bodyShort || "",
    path: notification.path || "",
    from: notification.from || notification.user || null,
    read: Boolean(notification.read),
    datetimeISO: notification.datetimeISO || "",
    raw: notification
  };
}

function makeNodebbNotificationsGateway({ client = makeNodebbClient() } = {}) {
  return {
    async listNotifications({ nodebbUid, headers } = {}) {
      if (!nodebbUid) throw new Error("nodebbUid is required");
      return await client.fetch(client.withUid("/api/notifications", nodebbUid), { headers });
    },

    normalize(notification) {
      return normalizeNodebbNotification(notification);
    },

    normalizeList(data = {}) {
      const source = Array.isArray(data?.notifications) ? data.notifications
        : Array.isArray(data?.items) ? data.items
        : Array.isArray(data) ? data
        : [];
      return source.map((item) => normalizeNodebbNotification(item));
    }
  };
}

export { makeNodebbNotificationsGateway, normalizeNodebbNotification };
