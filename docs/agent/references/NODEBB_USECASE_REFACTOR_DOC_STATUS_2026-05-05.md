# NodeBB Usecase Refactor Documentation Status

Date: 2026-05-05

## Current source of truth

The current implementation handoff is:

- `docs/agent/handoffs/nodebb-usecase-refactor-2026-05-05.md`

For the NodeBB-backed core product surfaces, this supersedes older task-board and review-brief statements that described Messages, Channel, profile saved/liked, or NodeBB detail actions as blocked, pending, or legacy-service-owned.

## Current implementation state

The following runtime surfaces have exited old feature functions and now run through app handlers/usecases/gateways:

| Surface | Runtime route(s) | Current entry |
|---|---|---|
| Feed | `/api/feed`, `/api/feed-debug` | `src/server/app/handlers/feed-handlers.js` |
| Detail | `/api/posts/:tid` | `src/server/app/handlers/feed-handlers.js` |
| Create post | `/api/posts` | `src/server/app/handlers/post-handlers.js` |
| Like / save / report | `/api/posts/:tid/like`, `/api/posts/:tid/save`, `/api/posts/:tid/report` | `src/server/app/handlers/post-handlers.js` |
| Profile activity | `/api/me/saved`, `/api/me/liked`, `/api/me/history` | `src/server/app/handlers/post-handlers.js` |
| Replies | `/api/posts/:tid/replies` | `src/server/app/handlers/reply-handlers.js` via `channel-service.js` facade |
| Messages | `/api/messages` | `src/server/app/handlers/message-handlers.js` via `notification-service.js` facade |
| Channel | `/api/channel`, `/api/channel/read`, `/api/channel/messages` | `src/server/app/handlers/channel-handlers.js` via `channel-service.js` facade |

## Legacy service status

Compatibility facade files still exist because the central router imports their historical names:

- `src/server/channel-service.js`
- `src/server/notification-service.js`

These files should be treated as import compatibility facades only, not as old feature-function owners.

## Superseded older descriptions

The following descriptions are now historical and should not be used as current implementation truth for NodeBB-backed core surfaces:

1. `docs/agent/PRO_REVIEW_BRIEF.md`
   - Old text: Messages Lane F blocked.
   - Old text: Channel Lane G accepted with follow-up and still old-service-owned.
   - Old text: NodeBB detail/profile actions still awaiting feature-level acceptance.
   - Current truth: runtime ownership has moved to the new app boundary. Live validation is still required, but old feature functions are no longer the implementation owner.

2. `docs/agent/05_TASK_BOARD.md`
   - Old P0/P1 items for Publish/Profile/NodeBB regression and Lane F remain useful as historical validation context.
   - Current truth for this refactor: core NodeBB-backed surfaces listed above now use new handlers/usecases/gateways.
   - Remaining validation should be tracked as smoke/manual acceptance, not as legacy-function replacement work.

## Remaining non-refactored modules

The following modules remain legacy-style and are outside the completed core NodeBB usecase refactor:

- `src/server/auth-routes.js`
- `src/server/ai-light-publish.js`
- `src/server/ai-post-preview.js`
- `src/server/map-v2-service.js`
- `src/server/admin-routes.js`
- `src/server/ops-service.js`
- `src/server/upload.js`

They should be handled as separate future refactor tracks.

## Validation state

Implementation documentation is updated. Runtime validation is still required before calling the refactor release-accepted.

Recommended validation commands:

```bash
node --check src/server/app/gateways/nodebb/index.js
node --check src/server/app/gateways/nodebb/client.js
node --check src/server/app/gateways/nodebb/users-gateway.js
node --check src/server/app/handlers/feed-handlers.js
node --check src/server/app/handlers/post-handlers.js
node --check src/server/app/handlers/reply-handlers.js
node --check src/server/app/handlers/message-handlers.js
node --check src/server/app/handlers/channel-handlers.js
node --check src/server/channel-service.js
node --check src/server/notification-service.js
node scripts/test-routes.js
node scripts/smoke-nodebb-contracts.js
```

Manual validation should cover:

- feed loads;
- detail opens;
- like/unlike;
- save/unsave;
- report;
- profile saved/liked/history;
- reply creation;
- messages list;
- channel list/read/message.

## Exit note

This documentation update closes the chat-level architecture/refactor handoff. Future work should start from the handoff and this status note, then run validation before claiming release acceptance.
