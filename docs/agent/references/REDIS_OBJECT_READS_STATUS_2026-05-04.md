# Redis Object Reads Rollout Status - 2026-05-04

## Current production status

Redis migration is active in production with object-level reads enabled.

Runtime chain:

```text
https://lian.nat100.top
  -> natapp
  -> forum-gate :18080
  -> frontend static :4300
  -> lian-platform-server :4200
  -> Redis DB 2 for LIAN data

NodeBB :4567
  -> Redis DB 1
```

Production backend environment:

```env
NODE_ENV=production
LIAN_SECURITY_MODE=production
LIAN_STORAGE_MODE=db
LIAN_REDIS_DB=2
LIAN_REDIS_KEY_PREFIX=lian:
LIAN_STORAGE_MIGRATION_ALLOW_FILE_FALLBACK=false
LIAN_REDIS_OBJECT_READS=true
```

## Completed phases

| Phase | Status | Notes |
|---|---|---|
| Phase 1 | Done | File-backed JSON/JSONL data migrated into Redis DB 2 bulk keys. |
| Phase 2A | Done | Bulk keys mirrored into object-level Redis keys. |
| Phase 2B | Done | Object-level key counts verified against bulk source keys. |
| Phase 2C | Done | Runtime can read object-level Redis keys when `LIAN_REDIS_OBJECT_READS=true`. |
| Phase 2D | Done | Runtime writes both object-level keys and original bulk keys. |

## Verification performed

Server-side checks after enabling `LIAN_REDIS_OBJECT_READS=true`:

```bash
node scripts/verify-redis-object-keys.js
npm run verify:redis
```

Both checks passed after browser validation.

Public browser validation also passed on:

```text
https://lian.nat100.top
```

Key runtime endpoints checked:

```bash
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed
curl --max-time 10 -sS http://127.0.0.1:4200/api/map/v2/items
```

Both returned valid data after object reads were enabled.

## Current data-write model

Reads:

```text
object-level Redis keys first, then bulk Redis key fallback
```

Writes:

```text
object-level Redis keys + original bulk Redis key
```

This means the system remains rollback-safe: disabling `LIAN_REDIS_OBJECT_READS` returns the runtime to bulk-key reads without losing writes made while object reads were enabled.

## Operational commands

Health check:

```bash
pm2 list
ss -lntp | grep -E ':18080|:4300|:4200|:4567|:6379'
curl -I http://127.0.0.1:18080
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed | head -c 200
node scripts/verify-redis-object-keys.js
npm run verify:redis
```

Rollback object reads only:

```bash
cd /opt/lian-platform-server
sed -i 's/^LIAN_REDIS_OBJECT_READS=.*/LIAN_REDIS_OBJECT_READS=false/' .env
pm2 restart lian-platform-server --update-env
pm2 save
```

Re-enable object reads:

```bash
cd /opt/lian-platform-server
sed -i 's/^LIAN_REDIS_OBJECT_READS=.*/LIAN_REDIS_OBJECT_READS=true/' .env
pm2 restart lian-platform-server --update-env
pm2 save
```

## Do not do yet

- Do not delete the original bulk Redis keys.
- Do not remove file-backed data snapshots.
- Do not remove `npm run verify:redis` from the regular verification loop.
- Do not switch auth/session to object-only reads until session lookup and token indexing have dedicated tests.
- Do not run `npm run migrate:redis -- --clear` during normal deployment.

## Recommended next phase

Phase 3 should reduce high-frequency whole-object rewrites, while preserving the bulk-key materialized view for rollback.

Suggested order:

1. Add focused tests for Redis object-store read/write helpers.
2. Convert `patchPostMetadata()` to update `postmeta:tid:{tid}` directly and refresh the bulk metadata key as a materialized compatibility view.
3. Convert `recordUserLike()` and `recordUserSave()` to update `usercache:user:{userId}` directly, then refresh the bulk `usercache` key.
4. Convert `saveChannelReads()` to update `channel:read:user:{userId}` directly if the calling path can provide the user id.
5. Only after several days of clean verification, consider Phase 4/5 cleanup of bulk-key dependence.
