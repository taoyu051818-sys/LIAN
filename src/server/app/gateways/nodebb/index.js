import { makeNodebbClient } from "./client.js";
import { makeNodebbTopicsGateway } from "./topics-gateway.js";
import { makeNodebbPostsGateway } from "./posts-gateway.js";
import { makeNodebbUsersGateway } from "./users-gateway.js";
import {
  makeNodebbNotificationsGateway,
  normalizeNodebbNotification
} from "./notifications-gateway.js";

function makeNodebbGateways({ client = makeNodebbClient() } = {}) {
  return {
    topics: makeNodebbTopicsGateway({ client }),
    posts: makeNodebbPostsGateway({ client }),
    users: makeNodebbUsersGateway({ client }),
    notifications: makeNodebbNotificationsGateway({ client })
  };
}

export {
  makeNodebbClient,
  makeNodebbGateways,
  makeNodebbNotificationsGateway,
  makeNodebbPostsGateway,
  makeNodebbTopicsGateway,
  makeNodebbUsersGateway,
  normalizeNodebbNotification
};
