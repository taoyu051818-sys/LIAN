# Forum Gate Contract

`forum-gate` is the public edge proxy in front of LIAN. It is currently operated as an external PM2 process, so this contract records the expected behavior in the backend repository until the gateway itself is versioned.

## Scope handled here

This document defines the gateway behavior contract only. It does not change the live `/opt/forum_gate/server.js` process and does not replace backend authorization.

## Service boundaries

The gateway must route by service ownership first:

- `/api/*` -> backend service, normally `http://127.0.0.1:4200`
- everything else -> frontend service, normally `http://127.0.0.1:4300`
- `/api/ops/deploy-webhook` -> backend service; signature and deploy authorization remain backend responsibilities

The gateway must not decide business capability by maintaining a hand-written list of every API path.

## Route manifest

The backend exposes route capability via:

```text
GET /api/ops/routes
```

The gateway should consume this manifest for public/protected policy. If manifest loading fails, the gateway may fall back to service-boundary routing in development mode, but production mode must fail closed for protected prefixes.

## Development mode

Development mode must be passthrough:

- do not redirect public home or public APIs to `/gate-login`
- do not require `ANSWER` for `/`, `/api/feed`, `/api/map/v2/items`, `/api/setup/status`
- keep backend authorization authoritative for mutations and private user data

Required public smoke checks:

```bash
curl -sS -o /tmp/home.html -w 'home %{http_code} %{time_total}\n' https://lian.nat100.top/
curl -sS -o /tmp/feed.json -w 'feed %{http_code} %{time_total}\n' 'https://lian.nat100.top/api/feed?limit=24'
curl -sS -o /tmp/map.json -w 'map %{http_code} %{time_total}\n' https://lian.nat100.top/api/map/v2/items
curl -sS -o /tmp/setup.json -w 'setup %{http_code} %{time_total}\n' https://lian.nat100.top/api/setup/status
curl -sS -o /tmp/routes.json -w 'routes %{http_code} %{time_total}\n' https://lian.nat100.top/api/ops/routes
```

Expected status for the public smoke checks is `200`.

Use GET for API verification. `curl -I` sends HEAD and may produce false 404 responses because the backend route matcher is method-specific.

## Production mode

Production mode must protect only declared sensitive paths:

- `/ops.html`
- `/api/ops/*`
- `/api/admin/*`
- `/api/internal/*`
- exact protected paths from `/api/ops/routes`

Public read paths such as `/`, `/api/feed`, `/api/map/v2/items`, and `/api/setup/status` must not be redirected to `/gate-login` solely because `ANSWER` is missing.

If `ANSWER` is missing in production, protected paths should fail closed with an explicit 503 or gate login error. Public paths should continue to route normally.

## Backend remains authoritative

The gateway is an edge convenience layer, not the product security model. Backend handlers must still validate:

- admin token / ops authorization
- GitHub deploy webhook signature
- user session and identity
- audience and visibility rules
- mutation permissions

## Bad-smell checks

Treat these as blockers:

- gateway hand-writes every backend API path instead of consuming `/api/ops/routes`
- `ANSWER` missing causes `/` or public APIs to redirect to `/gate-login`
- `/api/*` is accidentally routed to the frontend service
- gateway changes are only edited on the server without a repository, contract, or rollback note
- public smoke checks are not run after gateway changes

## Rollback

Before editing live gateway code on the server:

```bash
cd /opt/forum_gate
cp server.js server.js.bak.$(date +%Y%m%d%H%M%S)
node --check server.js
pm2 restart forum-gate --update-env
pm2 save
```

If the public smoke checks fail, restore the previous backup and restart `forum-gate`.
