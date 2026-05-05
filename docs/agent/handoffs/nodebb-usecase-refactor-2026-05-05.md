# Handoff: NodeBB Usecase Refactor And Legacy Function Exit

## Date

2026-05-05

## Thread scope

Large backend refactor in development mode. The goal was to replace old feature functions with NodeBB-aligned gateway/usecase/handler boundaries, without touching the Redis migration line or production operations ownership.

This was committed directly to `main` per user instruction.

## Architectural decision

LIAN keeps NodeBB as the content/community system of record and moves LIAN feature logic behind app-layer boundaries:

```text
HTTP route / legacy service facade
  -> app/handlers/*
  -> app/usecases/*
  -> app/gateways/nodebb/*
  -> NodeBB API
```

Old service files may remain as compatibility facades, but core feature execution should not live in those legacy service functions.

## Runtime areas moved to new boundaries

### Feed and detail

Routes now enter new feed handlers:

- `/api/feed`
- `/api/feed-debug`
- `/api/posts/:tid`

New entry:

- `src/server/app/handlers/feed-handlers.js`

### Post actions and profile activity

Routes now enter new post/profile handlers:

- `/api/posts`
- `/api/posts/:tid/like`
- `/api/posts/:tid/save`
- `/api/posts/:tid/report`
- `/api/me/saved`
- `/api/me/liked`
- `/api/me/history`

New entry:

- `src/server/app/handlers/post-handlers.js`

Profile liked/saved use NodeBB user collection page endpoints, not old LIAN local interaction fallback.

### Replies

Reply route now enters new reply handler:

- `/api/posts/:tid/replies`

New entry:

- `src/server/app/handlers/reply-handlers.js`

`src/server/channel-service.js` exports `handleCreateReply` as a facade to this new handler.

### Messages

Messages route now enters new message handler:

- `/api/messages`

New entry:

- `src/server/app/handlers/message-handlers.js`

`src/server/notification-service.js` is now a facade to the new handler.

### Channel

Channel routes now enter new channel handlers:

- `/api/channel`
- `/api/channel/read`
- `/api/channel/messages`

New entry:

- `src/server/app/handlers/channel-handlers.js`

`src/server/channel-service.js` is now a facade to the new handlers.

## New or updated files

New app boundary files:

- `src/server/app/gateways/nodebb/index.js`
- `src/server/app/handlers/channel-handlers.js`
- `src/server/app/handlers/feed-handlers.js`
- `src/server/app/handlers/message-handlers.js`
- `src/server/app/handlers/post-handlers.js`
- `src/server/app/handlers/reply-handlers.js`
- `src/server/app/usecases/profile/get-history-posts.js`
- `src/server/app/usecases/profile/get-liked-posts.js`

Updated app/gateway/usecase files:

- `src/server/app/gateways/nodebb/client.js`
- `src/server/app/gateways/nodebb/users-gateway.js`
- `src/server/app/usecases/profile/get-saved-posts.js`

Legacy service compatibility facades:

- `src/server/channel-service.js`
- `src/server/notification-service.js`

Router entry updated for feed/detail and post/profile paths:

- `src/server/api-router.js`

## Important fixes during refactor

### NodeBB gateway composition fix

`makeNodebbGateways()` originally used re-exported names without local imports. This caused runtime error:

```text
makeNodebbTopicsGateway is not defined
```

Fix: `src/server/app/gateways/nodebb/index.js` now imports factories locally before composing gateways.

### NodeBB status handling fix

NodeBB can return HTTP success with body status such as:

```json
{"status":{"code":"not-found","message":"Invalid API call"},"response":{}}
```

Fix: `src/server/app/gateways/nodebb/client.js` now treats non-`ok` NodeBB status codes as gateway errors.

### User collection endpoint fix

Invalid v3 user collection attempts were removed. Profile liked/saved now use NodeBB page collection endpoints:

```text
/api/user/:userslug/bookmarks
/api/user/:userslug/upvoted
```

Implemented in:

- `src/server/app/gateways/nodebb/users-gateway.js`

## What intentionally did not change

- Redis object migration and Redis read/write behavior were not touched.
- Production PM2/forum-gate deployment ownership was not touched.
- Frontend UI was not intentionally changed in this thread.
- Auth, AI publish, Map v2, admin, ops, upload remain outside this specific refactor unless called through the updated routes above.
- No Express/Fastify migration was performed.
- No database migration was performed.

## Current legacy-function status

Core NodeBB-backed product surfaces now execute through the new app boundary:

- feed;
- feed debug;
- detail;
- create post;
- like/save/report;
- replies;
- profile saved/liked/history;
- messages;
- channel timeline/read/message.

Remaining broader-system modules are still legacy-style modules and should be treated as separate future refactor tracks:

- `auth-routes.js` / auth-service internals;
- `ai-light-publish.js`;
- `ai-post-preview.js`;
- `map-v2-service.js`;
- `admin-routes.js`;
- `ops-service.js`;
- `upload.js`.

These are not part of the "core NodeBB feature function exit" completed here.

## Validation status

Observed manually during the thread:

- Development mode was restored on local backend port 4200 after `.env` update and PM2 restart.
- Public `/api/setup/status` returned 302 because forum-gate/security boundary intercepts public access; local backend status showed development mode.
- `/api/me/liked` exposed the NodeBB gateway factory/import bug and later the invalid API call body; both were addressed in code.

Validation not yet run by this thread:

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

Manual browser validation still required:

- feed loads;
- detail opens;
- like/unlike persists;
- save/unsave persists;
- report succeeds;
- saved/liked/history lists return expected items;
- reply creates NodeBB reply;
- `/api/messages` returns user-scoped discussion notifications;
- `/api/channel` returns readable timeline;
- channel message posts into the NodeBB channel topic or creates it if missing.

## Risks

1. This is a large main-branch refactor without a PR boundary.
2. Some new handlers currently use minimal cache adapters to avoid reusing old service internals.
3. `channel-handlers.js` recreates channel normalization and may differ slightly from legacy `normalizeChannelEvent` output.
4. Profile liked/saved now depend on NodeBB userslug collection endpoints. If a NodeBB theme/plugin changes those pages, gateway parsing may need adjustment.
5. Existing docs still contain older status text saying Messages/Channel are blocked or pending; see the paired documentation status audit for superseded sections.

## Rollback plan

If runtime blockers appear, rollback should be by commit range, not by editing Redis or production ops files.

Safer rollback order:

1. Revert facade commits first:
   - `src/server/channel-service.js`
   - `src/server/notification-service.js`
2. Revert `src/server/api-router.js` route-entry changes if feed/detail/post routes fail.
3. Keep gateway bug fixes if possible, because they address real runtime errors:
   - local imports in `app/gateways/nodebb/index.js`;
   - NodeBB status handling in `app/gateways/nodebb/client.js`;
   - user collection endpoint correction in `app/gateways/nodebb/users-gateway.js`.

## Next thread instructions

1. Run Node syntax checks and route tests listed above.
2. Run live browser/API smoke against the development backend first, not public forum-gate URLs.
3. Only after local backend is green, test through `https://lian.nat100.top`.
4. Update `docs/agent/05_TASK_BOARD.md` acceptance state after validation, not just after implementation.
5. Keep Redis migration work explicitly out of this refactor thread.
