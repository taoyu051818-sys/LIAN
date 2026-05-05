export { makeNodebbClient } from "./client.js";
export { makeNodebbTopicsGateway } from "./topics-gateway.js";
export { makeNodebbPostsGateway } from "./posts-gateway.js";
export { makeNodebbUsersGateway } from "./users-gateway.js";
export {
  makeNodebbNotificationsGateway,
  normalizeNodebbNotification
} from "./notifications-gateway.js";

function makeNodebbGateways({ client } = {}) {
  return {
    topics: makeNodebbTopicsGateway({ client }),
    posts: makeNodebbPostsGateway({ client }),
    users: makeNodebbUsersGateway({ client }),
    notifications: makeNodebbNotificationsGateway({ client })
  };
}

export { makeNodebbGateways };
