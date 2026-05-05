# File Ownership Override - 2026-05-05

This file overrides stale active-ownership readings in `docs/agent/03_FILE_OWNERSHIP.md`.

The original file remains useful as split-history and broad conflict-level context, but a few areas now conflict with current backend PRs and root README state.

## Current ownership facts

- `lian-platform-server` owns backend/API/runtime, Redis object-native state, NodeBB integration, auth/session, uploads, image proxy, map/data APIs, and backend validation.
- `lian-mobile-web` owns frontend runtime lanes, Vue canary, legacy/static rehearsal, frontend assets, frontend task-board UI, and frontend docs.
- `lian-mobile-web-full` is historical only.

## Current backend-owned areas

| Area | Current owner | Notes |
|---|---|---|
| `server.js` | Backend | HTTP/runtime entry. |
| `src/server/*` | Backend | API, services, route registry, storage, NodeBB, auth, feed, map APIs. |
| `src/server/api-route-registry.js` | Backend | Current route registry boundary; keep synced with routes/tests. |
| `data/*` and Redis object-native runtime state | Backend | Runtime data and rollback/migration context. |
| `scripts/*` backend checks and verification | Backend | Use current `package.json` scripts as source of truth. |
| `.github/workflows/backend-ci.yml` | Backend | Backend CI. |
| Backend docs automation | Backend | Generated docs/list checks are part of backend maintenance. |

## Not backend-owned for active implementation

| Area listed or implied in old ownership docs | Current correction |
|---|---|
| `public/*` frontend product UI | Frontend-owned in `lian-mobile-web`, except backend may serve static fallback. |
| Vue canary files | Frontend-owned in `lian-mobile-web`. |
| Frontend task-board UI | Frontend-owned in `lian-mobile-web`; backend may provide internal API endpoints. |
| Frontend runtime ports 4300/4301 | Frontend-owned operational surface. |

## Current backend validation entrypoints

Use current backend `package.json` as source of truth:

```bash
npm run check
npm run verify
npm run test:routes
npm run test:route-registry
npm run docs:list
```

## Current conflict rules

1. Keep backend/API/runtime changes in `lian-platform-server`.
2. Keep frontend UI/runtime-lane changes in `lian-mobile-web`.
3. Route changes must update/satisfy `api-route-registry.js` and route registry tests.
4. Redis object-native assumptions should follow root README and current env, not older file-mode wording.
5. Docs inventory should stay generated; do not restore hand-maintained docs lists.
6. Map data/API changes remain high-risk and human-assisted where geometry/data is involved.
7. If a backend change requires frontend contract changes, update the API contract/task docs and coordinate a frontend PR.

## Known stale readings in `03_FILE_OWNERSHIP.md`

- Wording that treats file mode as the safe/default runtime baseline is stale against the current root README's Redis object-native model.
- Wording that treats frontend classic load order as part of backend implementation guidance is historical or cross-repo context only.
- Route ownership must include `api-route-registry.js`, not only `api-router.js` and `route-matcher.js`.
- Script lists must be checked against current `package.json` before use.
