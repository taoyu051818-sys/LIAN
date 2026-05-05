# Worklog - CI, deploy webhook, and forum-gate recovery - 2026-05-05

This note records the work completed around LIAN project status review, CI/test recovery, GitHub deploy webhook delivery, and the production forum-gate routing boundary.

## Scope

Repositories and runtime components touched or reviewed:

- `taoyu051818-sys/lian-mobile-web`
- `taoyu051818-sys/lian-platform-server`
- production runtime path `/opt/forum_gate/server.js`
- imported runtime copy `ops/forum-gate/server.js`
- public deploy webhook `https://lian.nat100.top/api/ops/deploy-webhook`

## Timeline summary

1. Reviewed current project progress across frontend and backend PRs.
2. Rechecked frontend and backend code/test state.
3. Fixed the frontend CI setup issue caused by `actions/setup-node` using `cache: npm` without a committed lockfile.
4. Added and wired a static proxy forwarded-header regression test in `lian-mobile-web`.
5. Fixed Vue build errors so CI can advance past the build step.
6. Investigated GitHub webhook delivery failures for `/api/ops/deploy-webhook`.
7. Confirmed backend webhook route and secret handling were working locally.
8. Identified production 302 responses as forum-gate login redirects rather than backend failures.
9. Imported forum-gate runtime into this repository under `ops/forum-gate/`.
10. Added a dedicated forum-gate proxy for `POST /api/ops/deploy-webhook` to the backend API on `127.0.0.1:4200` while preserving the gate for other routes.

## Frontend CI and automated test work

### CI cache failure

The frontend GitHub Actions workflow previously failed during `Setup Node` before install/build/test could run. The cause was `actions/setup-node@v4` configured with `cache: npm` while the repository did not have a supported lockfile such as `package-lock.json`, `npm-shrinkwrap.json`, or `yarn.lock`.

Resolution:

- Removed `cache: npm` from the workflow so CI can run with the current dependency layout.
- Kept dependency installation on `npm install` until a lockfile is intentionally added.
- Added the static proxy forwarded-header regression script to the CI sequence after existing smoke tests.

Follow-up recommendation:

- Commit a package lockfile later and switch CI from `npm install` to `npm ci`; only then re-enable npm cache.

### Static proxy forwarded-header regression

A regression test was added to verify that the public static proxy forwards the relevant origin headers into backend API requests:

- `x-forwarded-host`
- `x-forwarded-proto`
- `x-forwarded-for`

The test starts local mock services and exercises the static rehearsal server path so the proxy behavior is checked without requiring the production backend.

### Vue build failures

After CI advanced past setup and install, Vue/TypeScript build errors were found:

- `AppViewHost` was imported from `./ui`, but it belongs under `./app/AppViewHost.vue`.
- Placeholder views were imported as named exports, while the Vue files use default exports.
- `PropType` was used without being imported from `vue`.

Resolution:

- Corrected `App.vue` to import `AppViewHost` from the app module.
- Corrected `AppViewHost.vue` to use default imports for placeholder views.
- Imported `PropType` from `vue`.

## Repository safety incident and recovery

During an earlier attempt to add a frontend regression test, an incomplete Git tree was accidentally used to create a PR that appeared to delete most repository files. That PR was merged and then immediately recovered by resetting the remote `main` branch to the last known good commit.

Result:

- `lian-mobile-web` remote `main` was restored.
- Key files such as `README.md`, `package.json`, `public/ops.html`, and `scripts/serve-frontend-static-rehearsal.js` were confirmed present afterward.

Guardrail for future work:

- Do not create trees from scratch for small GitHub file edits.
- Prefer the GitHub contents API for single-file changes.
- Always inspect PR file counts and deletions before merge.
- Treat any PR with broad deletions as a stop-the-line issue.

## Deploy webhook investigation

### Backend behavior

Local backend checks confirmed that `lian-platform-server` handles the webhook route correctly:

```bash
curl -i -X POST http://127.0.0.1:4200/api/ops/deploy-webhook
```

Observed progression:

1. Before setting `LIAN_DEPLOY_WEBHOOK_SECRET`, backend returned `503 LIAN_DEPLOY_WEBHOOK_SECRET is missing`.
2. After setting the secret and restarting PM2 with updated env, backend returned `401 invalid GitHub webhook signature` for unsigned manual curl requests.

The `401` response is expected for manual unsigned curl and proves the request reached the backend route and the backend secret was loaded.

### Public delivery failure

GitHub webhook delivery to the public URL originally failed with:

```text
302 Location: /gate-login
Found. Redirecting to /gate-login
```

This indicated the request was intercepted by the public forum-gate challenge page and never reached the backend webhook handler.

## Forum-gate routing fix

### Runtime boundary

The production public path remains:

```text
https://lian.nat100.top
  -> natapp tunnel
  -> 127.0.0.1:18080 forum-gate
  -> 127.0.0.1:4300 frontend static server
  -> 127.0.0.1:4200 backend API
```

The backend API port `4200` must remain internal. The fix was applied at the forum-gate layer instead of exposing the backend port.

### Imported runtime

The runtime forum-gate code was imported into this repository under:

```text
ops/forum-gate/server.js
ops/forum-gate/package.json
ops/forum-gate/package-lock.json
```

### Webhook proxy behavior

A dedicated proxy path was added before the login gate middleware:

```text
POST /api/ops/deploy-webhook -> http://127.0.0.1:4200/api/ops/deploy-webhook
```

Important constraints:

- Only `POST /api/ops/deploy-webhook` is allowed through without the forum-gate challenge.
- Other paths still require the forum-gate cookie.
- The backend still verifies `X-Hub-Signature-256` with `LIAN_DEPLOY_WEBHOOK_SECRET`.
- This is not a broad `/api/*` public bypass.

### Deployment steps used

After PR merge, the repository copy must be deployed to the runtime path:

```bash
cd /opt/lian-platform-server
git fetch origin
git checkout main
git pull --ff-only origin main

cp /opt/forum_gate/server.js /opt/forum_gate/server.js.bak.$(date +%Y%m%d%H%M%S)
cp /opt/lian-platform-server/ops/forum-gate/server.js /opt/forum_gate/server.js
cp /opt/lian-platform-server/ops/forum-gate/package.json /opt/forum_gate/package.json
cp /opt/lian-platform-server/ops/forum-gate/package-lock.json /opt/forum_gate/package-lock.json

cd /opt/forum_gate
npm install
node --check server.js
pm2 restart forum-gate --update-env
```

### Final verification

After deployment, GitHub webhook response headers showed backend security headers rather than a forum-gate redirect:

```text
Content-Type: application/json; charset=utf-8
X-Lian-Security-Mode: production
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

This confirms the public webhook request now reaches `lian-platform-server` instead of being redirected to `/gate-login`.

## PR / commit references

### `lian-mobile-web`

- CI cache removal and proxy-header regression workflow integration.
- Vue build import fixes for `AppViewHost` and placeholder views.

### `lian-platform-server`

- PR #11: imported forum-gate runtime into `ops/forum-gate/`.
- PR #12: updated forum-gate routing to allow the deploy webhook through the public gate.
- Webhook push payload confirmed PR #12 merged into `main` and modified `ops/forum-gate/server.js`.

## Current state

- Frontend CI no longer fails at `setup-node` due to missing lockfile.
- Vue build import errors were addressed.
- Backend deploy webhook secret is configured and loaded.
- Public deploy webhook no longer returns `302 /gate-login` after forum-gate deployment.
- Forum-gate runtime source is now tracked in the project repository under `ops/forum-gate/`.

## Remaining recommendations

1. Add a dedicated smoke test for forum-gate webhook routing, preferably with a mock backend target and unsigned request expectation.
2. Add an operational doc explaining that `ops/forum-gate/` is the source-of-truth copy, while `/opt/forum_gate/` is the runtime deployment path.
3. Add an explicit deploy step for forum-gate updates so repository changes are copied to `/opt/forum_gate/` consistently.
4. Add a package lockfile to `lian-mobile-web` and migrate CI to `npm ci`.
5. Keep `4200`, `4300`, `4567`, and Redis internal; do not expose the backend directly for webhook delivery.
