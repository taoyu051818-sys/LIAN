# LIAN Platform Server

Backend runtime for LIAN. The service connects to NodeBB, prepares the campus feed, serves post detail and map data, handles local auth/session state, uploads media through Cloudinary, and exposes `/api/*` endpoints for the web client.

Content editing, NodeBB post preparation, and recommendation principles are documented in [`EDITORIAL_PRINCIPLES.md`](./EDITORIAL_PRINCIPLES.md).

## Current data model

The active runtime data model is **Redis object-native**.

Legacy bulk JSON keys and the old file-backed JSON data shape were used during migration only. Normal runtime reads and writes now use Redis object keys.

Primary reference:

- [`docs/architecture/redis-object-native-data-model.md`](./docs/architecture/redis-object-native-data-model.md)

Normal verification commands:

```bash
npm run test:object-native
npm run verify:redis
npm run verify:redis:auth
```

Expected result:

```text
[verify:object-primary] object-primary data verified
[verify:redis:auth] auth object-native indexes verified
```

Required runtime flags:

```bash
LIAN_STORAGE_MODE=db
LIAN_REDIS_OBJECT_READS=true
LIAN_REDIS_OBJECT_PRIMARY=true
LIAN_AUTH_OBJECT_READS=true
LIAN_AUTH_OBJECT_NATIVE=true
```

`LIAN_AUTH_OBJECT_NATIVE=true` implies auth object reads. Auth runtime state no longer depends on `lian:auth:store`.

## Redis object groups

Current Redis source-of-truth groups:

- Feed rules: `feed:rules:keys`, `feed:rule:*`
- Post metadata: `postmeta:tids`, `postmeta:tid:*`
- Channel reads: `channel:read:users`, `channel:read:user:*`
- User cache: `usercache:users`, `usercache:user:*`, `usercache:actors`, `usercache:actor:*`
- Map: `map:location:index`, `map:location:*`, `map:layer:bundle`, `map:layer:*`
- Clubs: `club:index`, `club:item:*`
- AI drafts/records: `ai:draft:index`, `ai:draft:item:*`, `ai:record:index`, `ai:record:item:*`
- Auth: `auth:user:ids`, `auth:user:*`, `auth:email:*`, `auth:username:*`, `auth:sessions`, `auth:session:*`, `auth:invites`, `auth:invite:*`, `auth:verifications`, `auth:verification:*`

Legacy bulk keys such as `lian:postmeta:items`, `lian:channel:reads`, `lian:usercache`, `lian:ai:drafts`, and `lian:auth:store` are intentionally absent from a healthy object-native runtime.

## Local / server startup

Install dependencies:

```bash
npm install
```

Start directly:

```bash
npm start
```

Typical PM2 restart on the server:

```bash
pm2 restart lian-platform-server --update-env
pm2 save
```

API smoke check:

```bash
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed -o /tmp/lian-feed.json
curl --max-time 10 -sS http://127.0.0.1:4200/api/map/v2/items -o /tmp/lian-map.json
curl --max-time 10 -sS http://127.0.0.1:4200/api/auth/me -o /tmp/lian-auth-me.json
```

`/api/auth/me` can return `{"user":null}` when no session cookie is provided. That is expected for an unauthenticated smoke check.

## First setup / environment

The service reads runtime configuration from `.env` and process environment variables.

Important NodeBB and media settings:

- `NODEBB_BASE_URL`: internal NodeBB address, usually `http://127.0.0.1:4567`
- `NODEBB_PUBLIC_BASE_URL`: public browser-facing NodeBB address
- `NODEBB_API_TOKEN`: NodeBB API token
- `NODEBB_UID`: default NodeBB user id
- `NODEBB_CID`: default NodeBB category id
- `CLOUDINARY_URL`: required for image upload paths

Important Redis settings:

- `LIAN_STORAGE_MODE=db`
- `LIAN_REDIS_HOST`, `LIAN_REDIS_PORT`, `LIAN_REDIS_DATABASE`, `LIAN_REDIS_KEY_PREFIX`
- `LIAN_REDIS_OBJECT_READS=true`
- `LIAN_REDIS_OBJECT_PRIMARY=true`
- `LIAN_AUTH_OBJECT_READS=true`
- `LIAN_AUTH_OBJECT_NATIVE=true`

NodeBB uses Redis DB 1 on this server, so LIAN runtime data should stay in its configured LIAN database, currently DB 2.

## Main API endpoints

Common frontend endpoints:

- `GET /api/feed?tab=精选&page=1&limit=12`
- `GET /api/posts/:tid`
- `POST /api/posts`
- `POST /api/upload/image`
- `GET /api/map/v2/items`
- `GET /api/messages`
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`

## Feed and post metadata

Feed rules and post metadata are stored in Redis object keys, not in runtime JSON files.

The major object groups are:

- `feed:rules:keys`, `feed:rule:*`
- `postmeta:tids`, `postmeta:tid:*`

Post metadata can include:

- `timeLabel`: card display time
- `startsAt`: activity/signup start time
- `endsAt`: activity/signup end time
- `expiresAt`: expiration time
- `priority`: manual recommendation weight
- `visibility`, `audience`, `distribution`, and related feed control fields

## Auth/session model

Auth is object-native. Runtime login/session state uses:

- user objects: `auth:user:*`
- login indexes: `auth:email:*`, `auth:username:*`
- session objects: `auth:session:*`
- session index: `auth:sessions`
- invite objects: `auth:invite:*`
- verification objects: `auth:verification:*`

Session object keys use the SHA-256 hash of the raw session token. The raw token only travels in the browser cookie/request path.

## Tests and checks

General structure and encoding checks:

```bash
npm run check
```

Node tests:

```bash
npm test
npm run test:routes
```

Redis object-native runtime checks:

```bash
npm run test:object-native
npm run verify:redis
npm run verify:redis:auth
```

## Legacy migration tools

Legacy migration scripts are archived under `scripts/legacy/` and exposed as `legacy:*` npm scripts.

They are historical tools only and are not part of normal development verification. On an object-native dataset, old bulk verifiers may fail because the legacy bulk keys are intentionally absent.

Available legacy commands:

```bash
npm run legacy:migrate:bulk
npm run legacy:migrate:objects
npm run legacy:verify:bulk
npm run legacy:verify:bulk:prod
npm run legacy:verify:objects
npm run legacy:cleanup:bulk
npm run legacy:test:objects
npm run legacy:test:auth
```

## Hidden ops/admin endpoints

Ops/admin endpoints are exposed through the backend and protected by the configured deployment/admin settings. Use `ops.html` and the configured ops flow for deploy/restart/update actions.

For Redis runtime verification, prefer the object-native commands above instead of legacy bulk checks.
