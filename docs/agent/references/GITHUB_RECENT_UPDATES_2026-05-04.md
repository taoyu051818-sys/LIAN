# GitHub Recent Updates - 2026-05-04

This note is the current source for recent GitHub changes across the split LIAN repositories.

Repositories:

- Frontend: `taoyu051818-sys/lian-mobile-web`
- Backend: `taoyu051818-sys/lian-platform-server`

Last refreshed from GitHub commit history: 2026-05-04.

---

## Latest main-branch commits reviewed

### Frontend repo: `lian-mobile-web`

```text
a4e140a  Merge PR #8: Add frontend build validation workflow
7e3962c  Document frontend validation commands
c657b78  Add frontend build validation workflow
89d6237  Merge PR #7: Add Vue UI primitives foundation
9bc8403  Validate Vue UI primitives
1543b98  Show Vue UI primitives in shell
c974f25  Import Vue primitive styles
2355091  Add Vue UI primitive styles
ad164ed  Export Vue UI primitives
d17f994  Add InlineError primitive
e65ebfb  Add Toast primitive
6d346d4  Add Sheet primitive
3b84650  Add BottomTabBar primitive
2de14e1  Add navigation and feedback primitives
```

### Backend repo: `lian-platform-server`

```text
d8281ea  Merge PR #7: Add Redis full database migration storage
9f280fb  Document Redis storage configuration
5063fea  Add Redis migration verification script
e7f621c  Add Redis data migration script
9f943f8  Read map data through storage facade
764bfc1  Add clubs data path
06c4ee4  Wire data store to Redis storage mode
bca5804  Add Redis JSON storage helpers
6ae1f05  Add Redis client helper
b9d0b1a  Add Redis storage dependency
6e09afa  Merge PR #6: return deploy webhook errors
8ccf8f5  fix(ops): return webhook errors instead of hanging
0e7a86b  Merge PR #5: add GitHub main deploy webhook
777a5fa  ops: add GitHub main deploy webhook
6f85c7b  Route deploy webhook endpoint
c2dc515  Add GitHub deploy webhook handler
```

---

## Frontend: Vue UI primitives foundation

Merged in `lian-mobile-web` via PR #7.

What changed:

- Added reusable Vue UI primitive components under `src/ui/`.
- Exported primitives through `src/ui/index.ts`.
- Added shared primitive styles in `src/ui/primitives.css` and imported them into `src/styles/main.css`.
- Updated `src/App.vue` from a migration placeholder into a visible primitive showcase.
- Updated `scripts/validate-project-structure.js` so the new UI primitive files are required project structure.

New primitive surface:

- `BottomTabBar.vue`
- `GlassPanel.vue`
- `IdentityBadge.vue`
- `InlineError.vue`
- `LianButton.vue`
- `LocationChip.vue`
- `Sheet.vue`
- `TagChip.vue`
- `Toast.vue`
- `TopBar.vue`
- `TrustBadge.vue`
- `TypeChip.vue`
- `index.ts`
- `primitives.css`

Engineering implication:

- Vue 3 + Vite + TypeScript is no longer only a placeholder shell; it now has a first reusable component layer.
- Page-level migration should still proceed one boundary at a time.
- Do not mix feature behavior migrations with broad primitive redesigns in the same PR.

Validation expectation:

```bash
npm run build
npm run check
```

---

## Frontend: validation workflow and README update

Merged in `lian-mobile-web` via PR #8.

What changed:

- Added `.github/workflows/frontend.yml`.
- Workflow runs on pushes and PRs to `main`.
- CI uses Node 22, installs dependencies, builds the Vue entry, runs project checks, starts the legacy static rehearsal server, and runs the legacy smoke test.
- README now documents two frontend modes:
  - legacy static mobile frontend under `public/`, served by `npm run start:frontend-static`;
  - Vue 3 + Vite + TypeScript shell, served by `npm run dev`.
- README documents install, build, rehearsal, and validation commands.

Important note:

- The frontend repo currently has no committed lockfile. README explicitly says to commit `package-lock.json` after the first successful local install/build so CI can later use `npm ci` instead of `npm install`.

Validation expectation:

```bash
npm install
npm run build
npm run check
npm run start:frontend-static
npm test
```

---

## Backend: Redis storage and migration path

Merged in `lian-platform-server` via PR #7.

What changed:

- Added `redis` dependency to backend `package.json`.
- Added backend scripts:
  - `npm run migrate:redis` -> `node scripts/migrate-data-to-redis.js`
  - `npm run verify:redis` -> `node scripts/verify-redis-migration.js`
- Added Redis environment variables to `.env.example`:
  - `LIAN_DB_DRIVER`
  - `LIAN_REDIS_HOST`
  - `LIAN_REDIS_PORT`
  - `LIAN_REDIS_PASSWORD`
  - `LIAN_REDIS_DB`
  - `LIAN_REDIS_KEY_PREFIX`
  - `LIAN_STORAGE_MODE`
  - `LIAN_STORAGE_MIGRATION_ALLOW_FILE_FALLBACK`
- Added storage modules:
  - `src/server/storage/redis-client.js`
  - `src/server/storage/redis-store.js`
- Added `clubsPath` in `src/server/paths.js`.
- Extended `src/server/data-store.js` so existing JSON/JSONL reads and writes can route through Redis when Redis storage mode is enabled.
- Updated `src/server/map-v2-service.js` to load map locations/layers through the storage facade instead of direct file reads.

Data covered by migration/verification:

- feed rules
- post metadata
- channel reads
- auth store
- user cache
- map locations
- map layers
- alias pool
- clubs
- AI drafts JSONL
- AI records JSONL

Operational guardrail:

- Migration refuses Redis DB `1` because NodeBB uses DB 1 on this server.
- Default LIAN Redis DB is `2` with `lian:` key prefix.
- `LIAN_STORAGE_MODE=file` remains the safe default.
- Switch to Redis storage only after migration and verification pass.

Suggested rollout:

```bash
npm install
npm run migrate:redis -- --clear
npm run verify:redis
LIAN_STORAGE_MODE=redis npm start
```

Do not delete JSON/JSONL files immediately after migration. Keep them as rollback/source snapshots until Redis mode has been validated in staging or production.

---

## Backend: GitHub deploy webhook

Merged in `lian-platform-server` via PR #5, then fixed by PR #6.

What changed:

- Added a GitHub deploy webhook handler.
- Routed `/api/ops/deploy-webhook` from the top-level server path before generic `/api/*` dispatch.
- Added deployment action plumbing through the existing ops service.
- Fixed error handling so webhook failures return explicit error responses instead of hanging.

Engineering implication:

- Deploy webhook handling is an ops surface, not a frontend-required API.
- Keep webhook secrets in environment variables only.
- Any webhook-facing endpoint should return deterministic success/error responses so GitHub delivery logs remain useful.

Validation expectation:

```bash
node --check server.js
node scripts/test-routes.js
npm run check
```

---

## Current repo split implications

1. `lian-mobile-web` is the frontend/static/Vue workspace.
2. `lian-platform-server` is the backend runtime and storage workspace.
3. Frontend validation now has GitHub Actions coverage, but lockfile cleanup is still pending.
4. Backend runtime data can now be migrated from file-backed JSON/JSONL to Redis-backed storage, but file mode remains the default.
5. Repo split should continue to treat backend runtime data, Redis migration scripts, NodeBB integration, auth/session data, uploads, image proxy, map admin APIs, and ops webhooks as backend-owned.
6. Vue primitives are frontend-owned and should be used as the foundation for future page migration, not as an excuse for a broad one-shot rewrite.

---

## Branch cleanup note

After these merges, the following branches had no remaining commits ahead of `main` and can be deleted manually because the current connector cannot delete remote branches:

Frontend safe-delete candidates:

```bash
git push origin --delete ci/frontend-build-validation
git push origin --delete design/vue3-ui-entry
git push origin --delete design/vue-ui-primitives
git push origin --delete fix/direct-image-delivery
git push origin --delete ops-healthcheck
```

Backend safe-delete candidates:

```bash
git push origin --delete fix/deploy-webhook-error-response
git push origin --delete ops-github-deploy-webhook
git push origin --delete ops-web-healthcheck
```

Do not delete without separate review:

- frontend branches with no common ancestor: `cleanup/frontend-only-repo`, `design/ui-architecture-foundation`
- backend branches/PRs with remaining work or open review: `fix/image-proxy-allowlist`, `fix/direct-image-delivery`, `redis-migration` if it still exists locally/remotely after PR #7 merge
