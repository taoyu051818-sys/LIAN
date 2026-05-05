# Redis Object-Native Data Model

Status: active runtime model  
Updated: 2026-05-05

The LIAN backend now uses Redis object keys as the primary runtime data model. Legacy bulk JSON keys were used during migration only and are no longer part of the normal read/write path.

## Completion summary

The Redis migration is complete for the backend runtime:

- Runtime reads use Redis object keys.
- Runtime writes use Redis object keys.
- Non-auth legacy bulk keys have been removed from runtime data.
- `auth:store` bulk mode has been replaced by auth object indexes.
- Default verification commands validate object-native data, not legacy bulk snapshots.
- Legacy migration helpers are archived under `scripts/legacy/` and exposed only through `legacy:*` npm scripts.

## Primary verification commands

Use these for normal development and deployment checks:

```bash
npm run test:object-native
npm run verify:redis
npm run verify:redis:auth
```

Expected high-level result:

```text
[verify:object-primary] object-primary data verified
[verify:redis:auth] auth object-native indexes verified
```

## Required runtime flags

The backend expects Redis object-native mode for the active runtime:

```bash
LIAN_STORAGE_MODE=db
LIAN_REDIS_OBJECT_READS=true
LIAN_REDIS_OBJECT_PRIMARY=true
LIAN_AUTH_OBJECT_READS=true
LIAN_AUTH_OBJECT_NATIVE=true
```

`LIAN_AUTH_OBJECT_NATIVE=true` also implies auth object reads in `auth-service.js`, so auth session resolution should not fall back to `auth:store` during normal object-native operation.

## Runtime source of truth

### General data

| Area | Primary object keys |
| --- | --- |
| Feed rules | `feed:rules:keys`, `feed:rule:*` |
| Post metadata | `postmeta:tids`, `postmeta:tid:*` |
| Channel reads | `channel:read:users`, `channel:read:user:*` |
| User cache | `usercache:users`, `usercache:user:*`, `usercache:actors`, `usercache:actor:*` |
| Map locations | `map:location:index`, `map:location:*` |
| Map layers | `map:layer:bundle`, `map:layer:*` |
| Clubs | `club:index`, `club:item:*` |
| AI drafts | `ai:draft:index`, `ai:draft:item:*` |
| AI records | `ai:record:index`, `ai:record:item:*` |

### Auth data

| Area | Primary object keys |
| --- | --- |
| Users | `auth:user:ids`, `auth:user:*` |
| Login indexes | `auth:email:*`, `auth:username:*` |
| Sessions | `auth:sessions`, `auth:session:*` |
| Invites | `auth:invites`, `auth:invite:*` |
| Verifications | `auth:verifications`, `auth:verification:*` |

Session object keys are keyed by the SHA-256 hash of the raw session token. The raw token remains only in the browser cookie / request header path.

## Implementation mapping

| Responsibility | File |
| --- | --- |
| Object key read/write primitives | `src/server/storage/redis-object-store.js` |
| Runtime read/write routing | `src/server/data-store.js` |
| Auth session resolution and user mutation helpers | `src/server/auth-service.js` |
| Auth route writes for login/register/logout/invites/verifications | `src/server/auth-routes.js` |
| Alias user mutation writes | `src/server/alias-service.js` |
| Full object-native runtime test | `scripts/test-object-native-runtime.js` |
| Global object-primary verifier | `scripts/verify-redis-object-primary.js` |
| Auth object-native index verifier | `scripts/verify-redis-auth-object-indexes.js` |

## Verification coverage

`npm run test:object-native` performs a runtime write/read/logout flow across:

- auth user lookup by id, email, and username;
- auth session creation, cookie lookup, and logout deletion;
- auth invite and verification objects;
- post metadata object writes;
- user like/save cache object writes;
- channel read object writes;
- AI draft/record object append paths.

`npm run verify:redis` checks object-primary counts for metadata, channel reads, user cache, map, clubs, auth, AI drafts/records, and confirms the map layer bundle exists.

`npm run verify:redis:auth` checks auth object-native indexes and validates that:

- every user id has a corresponding `auth:user:*` object;
- email and username indexes point to the expected user id;
- sessions point to existing users;
- invite and verification objects exist for every indexed id.

## Legacy commands

Legacy commands are historical migration tools only. Do not use them for normal verification:

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

These commands are kept to inspect or reproduce the old migration flow. They may fail on an object-native dataset because legacy bulk keys are intentionally absent.

## Legacy bulk keys intentionally absent

The following old bulk keys are no longer required for runtime operation:

```text
lian:feed:rules:current
lian:postmeta:items
lian:channel:reads
lian:usercache
lian:map:locations
lian:map:layers
lian:alias:pool
lian:clubs
lian:ai:drafts
lian:ai:records
lian:auth:store
```

A healthy object-native system may return `0` for `EXISTS` checks against these keys.

## API smoke checklist

Use these after deployment or refactors:

```bash
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed -o /tmp/lian-feed.json
curl --max-time 10 -sS http://127.0.0.1:4200/api/map/v2/items -o /tmp/lian-map.json
curl --max-time 10 -sS http://127.0.0.1:4200/api/auth/me -o /tmp/lian-auth-me.json
```

Then verify all three files parse as JSON.

`/api/auth/me` may return `{"user":null}` when no session cookie is provided. That is expected for an unauthenticated smoke test.

## Development notes

- `README.md` should describe object-native data as the current runtime model.
- `package.json` should expose object-native verification as the default Redis verification path.
- `scripts/legacy/` should remain clearly marked as legacy-only.
- Do not reintroduce legacy bulk keys as runtime dependencies unless a new migration plan explicitly requires it.
