# Handoff - retiring CI/deploy recovery thread - 2026-05-05

This handoff captures the final state of the CI/deploy recovery thread so future work can use repository docs instead of relying on chat/thread context.

Primary earlier worklog:

- `docs/agent/references/WORKLOG_2026-05-05_CI_WEBHOOK_GATE.md`

Related repositories:

- `taoyu051818-sys/lian-mobile-web`
- `taoyu051818-sys/lian-platform-server`

## Final status

As of the end of this thread:

- Frontend build and smoke test are green.
- Frontend legacy commit status is now visible through the commit status API.
- GitHub deploy webhook delivery is resolved and recent push deliveries are visible in GitHub Webhooks / Recent Deliveries.
- There are no known open blocking PRs or Issues across the two core repositories from this recovery thread.
- Backend development continues actively around Redis object storage, NodeBB gateway/usecase refactors, and post/reply interaction use cases.

## What changed after the earlier worklog

The earlier worklog recorded the first CI and webhook recovery pass. This thread then continued with two additional frontend CI observability/test fixes.

### 1. Legacy commit status publishing

Problem:

- GitHub Actions checks existed, but legacy tooling using the commit status API returned no status for frontend validation.
- This made project health checks ambiguous even when GitHub Actions had run.

Fix:

- `lian-mobile-web` PR #17 added a `publish-legacy-status` job to `.github/workflows/frontend.yml`.
- The job depends on the frontend validation job and publishes a `ci/frontend-validation` legacy status to the workflow commit.
- The status includes a target URL pointing back to the GitHub Actions run.

Result:

- `get_commit_combined_status` now returns `ci/frontend-validation` instead of an empty status list on the latest frontend merge commit.

### 2. Frontend smoke test no longer fails when backend is absent in CI

Problem:

- The frontend static rehearsal server proxies `/api/*` to `http://127.0.0.1:4200` by default.
- In the frontend CI job, the backend server is not started.
- `npm test` ran `scripts/smoke-frontend.js http://127.0.0.1:4300` and treated these endpoints as hard failures:
  - `GET /api/feed` -> HTTP 502
  - `GET /api/map/v2/items` -> HTTP 502
- Build, structure validation, static file reachability, syntax checks, CSS checks, and frontend helper checks were already passing.

Fix:

- `lian-mobile-web` PR #18 changed `scripts/smoke-frontend.js` so backend API checks are optional when the backend is unavailable.
- API smoke checks skip HTTP `0`, `502`, `503`, and `504` by default.
- Strict API validation can still be forced with:

```bash
LIAN_SMOKE_REQUIRE_API=1 npm test
```

Result:

- Frontend CI now validates the frontend surface without requiring a backend process in the same job.
- The final GitHub Actions result reported `Build and smoke test` succeeded.

## Webhook state

The webhook issue is considered resolved.

Known-good facts from the recovery thread:

- The backend route `/api/ops/deploy-webhook` correctly rejects unsigned manual requests with signature errors when `LIAN_DEPLOY_WEBHOOK_SECRET` is configured.
- The original public failure was caused by forum-gate redirecting GitHub delivery to `/gate-login`.
- The forum-gate fix allows only `POST /api/ops/deploy-webhook` through to `127.0.0.1:4200` while keeping the rest of the public gate in place.
- GitHub Webhooks / Recent Deliveries now shows multiple `push` deliveries and redelivery events after the routing fix.

Operational reminder:

- Keep backend port `4200` internal.
- Keep frontend static port `4300`, NodeBB `4567`, and Redis internal.
- Do not replace the narrow webhook bypass with a broad `/api/*` public bypass.

## Current health check summary

| Area | Status | Notes |
| --- | --- | --- |
| `lian-mobile-web` build | Green | Vue/Vite build passes. |
| `lian-mobile-web` structure checks | Green | `npm run check` passes. |
| `lian-mobile-web` smoke test | Green | Backend-unavailable API checks are skipped by default. |
| Frontend legacy status API | Green | `ci/frontend-validation` reports `success`. |
| Deploy webhook | Green | Recent GitHub deliveries are visible and no longer blocked by forum-gate redirect. |
| Open PR queue | Clear | No recovery-thread blocking PR remains open. |
| Open Issue queue | Clear | No recovery-thread blocking issue remains open. |
| Backend CI/status visibility | Gap | No equivalent backend legacy status check was confirmed in this thread. |

## Important references

### `lian-mobile-web`

- PR #16 - fixed Vue build imports and `PropType` usage.
- PR #17 - published legacy commit status for frontend validation.
- PR #18 - skipped backend-unavailable API smoke checks in frontend-only CI.

Key frontend commands:

```bash
npm install
npm run build
npm run check
npm run start:frontend-static
npm test
LIAN_SMOKE_REQUIRE_API=1 npm test
```

### `lian-platform-server`

- PR #11 - imported forum-gate runtime under `ops/forum-gate/`.
- PR #12 - updated forum-gate routing for the deploy webhook path.
- PR #13 - recorded the CI/webhook/forum-gate recovery worklog.

Key runtime paths:

```text
/opt/lian-platform-server
/opt/forum_gate/server.js
/opt/forum_gate/package.json
/opt/forum_gate/package-lock.json
```

Key public/internal path:

```text
https://lian.nat100.top/api/ops/deploy-webhook
  -> forum-gate
  -> http://127.0.0.1:4200/api/ops/deploy-webhook
```

## Recommended next steps

1. Add backend CI for `lian-platform-server`, including a legacy status context similar to `ci/frontend-validation`.
2. Add an automated forum-gate webhook routing test with a mock backend target.
3. Document or automate the copy/deploy process from `ops/forum-gate/` to `/opt/forum_gate/`.
4. Add a `package-lock.json` to `lian-mobile-web`, switch CI from `npm install` to `npm ci`, then consider re-enabling npm cache.
5. Keep this handoff as the source of truth when retiring the chat/thread context.

## Thread retirement note

This thread can be abandoned after this document is merged. Future agents should begin from:

1. `docs/agent/references/WORKLOG_2026-05-05_CI_WEBHOOK_GATE.md`
2. `docs/agent/references/HANDOFF_2026-05-05_THREAD_RETIREMENT_CI_DEPLOY.md`
3. Latest GitHub Actions status for `lian-mobile-web`
4. GitHub Webhooks / Recent Deliveries for deploy webhook confirmation

Do not rely on the retired chat thread for operational truth once repository docs and current GitHub state disagree; prefer repository docs plus live GitHub/runtime checks.
