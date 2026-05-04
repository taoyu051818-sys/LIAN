# OPS Security / Development Boundary - 2026-05-04

This note records the production boundary after the Redis migration and the forum gate recovery. It is intended to prevent future deploy/update work from accidentally bypassing the access gate, PM2, or Redis-backed storage.

## Current stable runtime chain

```text
Public user
  -> https://lian.nat100.top
  -> natapp tunnel
  -> 127.0.0.1:18080 forum-gate challenge page
  -> 127.0.0.1:4300 frontend static server
  -> 127.0.0.1:4200 lian-platform-server API
  -> Redis DB 2 for LIAN-owned data

NodeBB
  -> 0.0.0.0:4567
  -> Redis DB 1
```

The forum gate is the public security boundary. The backend API and NodeBB remain internal service dependencies and should not be treated as the browser-facing entry point.

## Ports and ownership

| Port | Owner | Process / service | Public? | Notes |
|---|---|---|---|---|
| `18080` | `/opt/forum_gate/server.js` | PM2 `forum-gate` | Yes, via natapp | Question/answer gate. Returns `/gate-login` before proxying. |
| `4300` | Frontend static server | `serve-frontend-static-rehearsal.js` | No direct public exposure | Receives traffic from forum-gate after challenge success. |
| `4200` | `/opt/lian-platform-server/server.js` | PM2 `lian-platform-server` | No direct public exposure | Backend API. Uses Redis storage mode. |
| `4567` | `/opt/nodebb/app.js` | NodeBB | No direct public exposure | NodeBB remains content/community source of truth. |
| `6379` | Redis | system service | No | NodeBB uses DB 1; LIAN uses DB 2. |

## Security boundary rules

1. `18080` must be owned by `forum-gate`, not Nginx, when the product needs the custom question/answer gate.
2. Do not enable Nginx Basic Auth on `18080` unless the intent is to replace the custom gate with browser username/password authentication.
3. The gate answer belongs in `/etc/forum-gate.env` as `ANSWER=...`. It must not be committed to Git.
4. `forum-gate` must be started in a way that loads `/etc/forum-gate.env`; otherwise it exits with `ERROR: ANSWER is empty` and natapp reports that `127.0.0.1:18080` has no web service.
5. Keep `4200`, `4300`, `4567`, and `6379` as internal ports unless there is a deliberate network/security decision to expose them.

Recommended `forum-gate` PM2 start form:

```bash
pm2 start bash --name forum-gate -- -lc 'set -a; . /etc/forum-gate.env; set +a; exec node /opt/forum_gate/server.js'
pm2 save
```

## Development / deploy boundary

The deploy/update control plane is `/ops.html` from the frontend static site. It calls backend endpoints:

```text
/api/ops/health
/api/ops/action?action=...
```

Those endpoints are implemented in `src/server/ops-service.js`.

### Backend deploy rule

Backend updates must restart the PM2 service, not spawn a detached `nohup npm start` process.

Correct backend update flow:

```bash
cd /opt/lian-platform-server
git fetch origin
git checkout main
git pull --ff-only origin main
npm install
pm2 restart lian-platform-server --update-env || pm2 start server.js --name lian-platform-server --update-env
pm2 save
```

Do not use this old pattern for backend deploys:

```bash
lsof -t -iTCP:4200 -sTCP:LISTEN -n -P | xargs -r kill -9 || true
nohup npm start > /tmp/lian-platform-server.log 2>&1 &
```

That pattern creates a non-PM2 backend and can split runtime state from PM2 state.

### Frontend deploy rule

Frontend restart/update can continue using the existing static frontend process until it is moved into PM2. The current runtime observed during migration was:

```text
node scripts/serve-frontend-static-rehearsal.js
```

Longer term, consider moving the frontend static service into PM2 so both frontend and backend use the same process manager.

## Redis/data boundary

LIAN full database migration now uses Redis DB 2. NodeBB uses Redis DB 1.

Required backend `.env` values for production Redis mode:

```env
LIAN_DB_DRIVER=redis
LIAN_REDIS_HOST=127.0.0.1
LIAN_REDIS_PORT=6379
LIAN_REDIS_PASSWORD=
LIAN_REDIS_DB=2
LIAN_REDIS_KEY_PREFIX=lian:
LIAN_STORAGE_MODE=db
LIAN_STORAGE_MIGRATION_ALLOW_FILE_FALLBACK=false
```

Daily deploy/update must not run the one-time migration command:

```bash
npm run migrate:redis -- --clear
```

That command is only for planned file-to-Redis migration/recovery operations. Normal deploy only pulls code, installs dependencies, and restarts PM2.

## Cross-origin / state-changing request rule

If the browser shows `cross-origin state-changing request blocked`, it usually means a POST/PUT/PATCH/DELETE request is not going through the same public origin as the page.

Preferred browser-facing pattern:

```text
https://lian.nat100.top/...       -> page/static assets through forum-gate -> frontend 4300
https://lian.nat100.top/api/...   -> API through forum-gate or same-origin API proxy -> backend 4200
```

Avoid browser code that calls internal origins directly, such as:

```text
http://127.0.0.1:4200
http://149.104.21.74:4200
http://149.104.21.74:4567
```

When fixing this, add an explicit same-origin `/api` path at the public gate/proxy layer instead of exposing the backend port directly.

## Fast health checks

```bash
pm2 list
ss -lntp | grep -E ':18080|:4300|:4200|:4567|:6379'
curl -I http://127.0.0.1:18080
curl --max-time 10 -sS http://127.0.0.1:4200/api/feed | head -c 200
redis-cli -n 2 DBSIZE
redis-cli INFO persistence | grep -E 'aof_enabled|aof_last_write_status|rdb_last_bgsave_status'
```

Expected:

```text
forum-gate online
lian-platform-server online
18080 returns 302 Location: /gate-login
4200 /api/feed returns items
Redis DB 2 has LIAN keys
AOF enabled and write status ok
```

## Do-not-do list

- Do not run backend from `/tmp/lian-platform-server-fresh` in production.
- Do not let `ops-service.js` restart backend with `nohup npm start`.
- Do not put LIAN data in Redis DB 1.
- Do not run `FLUSHALL` or `redis-cli -n 1 FLUSHDB`.
- Do not commit `/etc/forum-gate.env`, `.env`, or runtime JSON state files.
- Do not use Nginx on `18080` unless intentionally replacing `forum-gate`.
