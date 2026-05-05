# Redis Phase 3 Object Writes Status - 2026-05-05

## Production status

Phase 3 object-level write rollout has been completed for the first high-frequency LIAN data paths.

Runtime remains rollback-safe because each optimized path still maintains the original bulk Redis key as a compatibility/materialized view.

Current runtime settings:

```env
LIAN_STORAGE_MODE=db
LIAN_REDIS_DB=2
LIAN_REDIS_KEY_PREFIX=lian:
LIAN_STORAGE_MIGRATION_ALLOW_FILE_FALLBACK=false
LIAN_REDIS_OBJECT_READS=true
```

## Completed Phase 3 paths

| Phase | Path | Object-level write | Bulk compatibility key | Status |
|---|---|---:|---:|---|
| Phase 3A | post metadata updates via `patchPostMetadata()` | Yes, single `postmeta:tid:{tid}` | Yes, `postmeta:items` | Done |
| Phase 3B | user like/save cache via `recordUserLike()` / `recordUserSave()` | Yes, single `usercache:user:{userId}` | Yes, `usercache` | Done |
| Phase 3C | channel read receipts via `handleChannelRead()` -> `saveChannelReadItems()` | Yes, changed `channel:read:user:{eventId}` entries only | Yes, `channel:reads` | Done |

## Important notes

- Keep bulk Redis keys. They are still used as rollback-compatible materialized views.
- Do not delete file snapshots yet.
- Do not run `npm run migrate:redis -- --clear` or `npm run migrate:redis:objects -- --clear-object` during normal deployment.
- Use `npm run verify:redis:prod`, not strict `npm run verify:redis`, for production health checks after live writes have occurred.

## Verification commands

Run after deploy, browser write tests, or suspicious behavior:

```bash
cd /opt/lian-platform-server
npm run verify:redis:objects
npm run verify:redis:prod
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed | head -c 200 && echo
curl --max-time 10 -sS http://127.0.0.1:4200/api/map/v2/items | head -c 200 && echo
pm2 logs lian-platform-server --lines 80 --nostream
```

## Test key cleanup

If direct object writer tests were accidentally run against the production `lian:` prefix, remove known test channel read keys:

```bash
cd /opt/lian-platform-server
node --input-type=module <<'NODE'
import { closeRedisClient, getRedisClient, redisKey } from "./src/server/storage/redis-client.js";

const client = await getRedisClient();

for (const id of ["test-channel-999", "test-channel-incremental"]) {
  const key = redisKey(`channel:read:user:${id}`);
  const existed = await client.exists(key);
  if (existed) await client.del(key);
  await client.sRem(redisKey("channel:read:users"), id);
  console.log(`${id}: removed=${Boolean(existed)}`);
}

await closeRedisClient();
NODE
```

## Stable backup taken

A post-Phase-3 backup was created on the server:

```bash
tar -czf /root/lian-after-phase3-object-writes-$(date +%F-%H%M%S).tar.gz /opt/lian-platform-server /opt/forum_gate /etc/forum-gate.env
redis-cli BGSAVE
pm2 save
```

## Observed logs

Recent PM2 logs showed repeated normal startup messages and NodeBB user-post lookup traces. No Redis object-read/write error was observed in the pasted log excerpt.

## Next recommended phase

Enter an observation period before removing any compatibility layer.

Suggested next work:

1. Browser regression for like/unlike, save/unsave, channel read receipts, posting, feed, and map.
2. Run `npm run verify:redis:objects` and `npm run verify:redis:prod` after regression.
3. Add a small operational health script that bundles the verification commands.
4. After several clean deploys, consider Phase 4: auth/session object indexing and tests.
