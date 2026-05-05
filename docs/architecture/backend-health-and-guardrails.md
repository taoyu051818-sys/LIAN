# Backend Health and Guardrails

This document summarizes the backend health work completed around code-smell cleanup, context synchronization, deployment safety, and API routing architecture.

The main goal is not to catch every small issue manually. The goal is to prevent the mistakes that happen when multiple developers or agents work with stale context: editing from old `main`, trusting stale search results, changing the wrong repository on a server, duplicating another cleanup scope, or adding routes without wiring handlers.

## Current baseline

The backend repository is expected to be developed from `main` and deployed from:

```text
/opt/lian-platform-server
```

The frontend repository is separate and deployed from:

```text
/opt/lian-mobile-web
```

Do not run backend sync or PM2 commands from the frontend repository.

## Completed guardrails

### 1. Configuration parsing guardrails

Configuration parsing was centralized around schema helpers instead of ad-hoc parsing. New backend code should not use patterns such as:

```js
Number(process.env.PORT)
parseInt(process.env.NODEBB_UID, 10)
```

Use the config schema helpers instead, for example:

```js
parsePositiveInteger(...)
parseNonNegativeInteger(...)
parseBoolean(...)
normalizeBaseUrl(...)
```

This prevents silent `NaN`, weak boolean parsing, and inconsistent URL normalization.

### 2. Static backend fallback guardrail

The backend can run without bundled frontend static assets. Missing `public/index.html` should not produce noisy `ENOENT` errors in production logs.

When the backend is running in a backend-only runtime, UI routes should use the frontend service, while backend static fallback returns a clear JSON response.

### 3. Code smell guard

`scripts/check-code-smells.js` is part of `npm run check`.

It blocks high-confidence bad patterns, including:

- `Number(process.env...)`
- `parseInt(process.env...)` / `parseFloat(process.env...)`
- single trailing slash URL normalization with `.replace(/\/$/, ...)`
- `execSync(...)`
- shell-style `exec(...)`
- synchronous file-system APIs in runtime server code
- `JSON.parse(JSON.stringify(...))` deep clone
- `new Promise(async ...)`

It warns on broader patterns where false positives are more likely:

- empty `catch {}` blocks
- runtime `fetch(...)` calls without `signal` / timeout
- runtime `process.exit(...)`

The intent is to stop low-quality code before it enters `main`, while keeping broad checks warning-only until a safe migration path exists.

### 4. Context synchronization guardrails

The repository now includes project-level context sync docs:

- `.github/pull_request_template.md`
- `docs/contributing/context-sync-protocol.md`
- `docs/operations/deploy-sync.md`
- `scripts/check-context-docs.js`

The context docs enforce these habits:

- Start every branch from the latest `main`.
- Record the base commit in the PR.
- Treat search results as hints, not truth.
- Verify important search hits against actual files on `main`.
- Declare the exact files, modules, functions, or scripts touched.
- Declare what is explicitly not handled.
- Verify the actual files merged into `main`.
- Confirm the server repository path before deploying.

This is especially important when multiple agents are cleaning bad smells at the same time.

### 5. Deployment sync guardrails

`docs/operations/deploy-sync.md` documents the safe backend and frontend sync flows.

Backend deployment should start with:

```bash
cd /opt/lian-platform-server || exit 1
pwd
git remote -v
git fetch origin --prune
git switch main
git pull --ff-only origin main
npm run check
pm2 restart lian-platform-server --update-env
pm2 save
```

Frontend deployment should use `/opt/lian-mobile-web` and `lian-frontend.service`, not PM2.

### 6. API routing architecture guardrails

`api-router.js` was reduced to a thin boundary responsible for:

- same-origin enforcement
- route matching
- setup gating
- dispatching
- error response boundary

Route handler mapping now lives in:

```text
src/server/api-route-registry.js
```

Route matching still lives in:

```text
src/server/route-matcher.js
```

This makes the architecture healthier because new API routes no longer grow a giant `switch` inside `api-router.js`.

### 7. Route registry contract test

`scripts/test-route-registry.js` verifies that route matching and route handler registration stay in sync.

It checks that:

- every route ID declared by `route-matcher.js` has a handler in `api-route-registry.js`
- every handler route ID exists in the matcher
- pre-setup routes are declared and have handlers
- exact, prefix, and regex routes all have handler coverage

This prevents a common routing architecture failure: adding a route matcher entry without wiring the handler.

## Current verification commands

For normal backend changes:

```bash
npm run check
```

For route contract checks specifically:

```bash
npm run test:route-registry
npm run test:route-manifest
```

For deployment-sensitive backend changes:

```bash
npm run verify:deploy-safe
```

For broader backend verification:

```bash
npm run verify
```

## How to add a new backend route

1. Add the route to `src/server/route-matcher.js`.
2. Add the handler mapping to `src/server/api-route-registry.js`.
3. If the route must work before setup is complete, add its route ID to `PRE_SETUP_ROUTE_IDS`.
4. If the route affects edge/gate routing, update `src/server/route-manifest.js`.
5. Run:

```bash
npm run check
npm run test:route-registry
npm run test:route-manifest
```

## PR requirements for future architecture work

Every architecture or cleanup PR should state:

- base commit
- exact scope handled
- files touched
- functions/routes/scripts touched
- explicitly not handled
- possible overlap with other work
- validation command and result
- deployment sync note, if runtime behavior changes

This is more important than a long prose explanation. It prevents stale-context mistakes.

## Remaining architecture risks

The backend is healthier after these changes, but these areas still need incremental refactoring:

### Data access layer

`data-store.js` remains a large module risk. Future work should separate:

- user/session data access
- post metadata access
- Redis object-native operations
- migration-only helpers
- runtime repository APIs

Do not mix migration scripts with normal runtime data paths.

### NodeBB client boundary

`nodebb-client.js` should continue moving toward a typed client boundary with consistent:

- timeout handling
- retry policy
- error classification
- response shape normalization

Runtime `fetch` calls should carry a `signal` or explicit timeout.

### API response consistency

Handlers should use shared response helpers such as `sendJson()` instead of writing raw `res.end(JSON.stringify(...))` in many places.

Future work can add a guardrail for raw response writes once existing legitimate cases are documented or migrated.

### Route handler organization

`api-route-registry.js` is a healthier middle step, not the final architecture. As route count grows, split handlers by domain:

```text
src/server/app/routes/auth-routes.js
src/server/app/routes/post-routes.js
src/server/app/routes/ops-routes.js
src/server/app/routes/feed-routes.js
```

Then keep `api-route-registry.js` as the composition point only.

### CI enforcement

Local `npm run check` now catches many issues, but repository-level CI should also run the same checks on pull requests:

```bash
npm ci
npm run check
npm run verify:deploy-safe
```

CI is the next important step if GitHub Actions is available for the repository.

## Operating principle

Prefer small, verified architecture steps over large rewrites.

A good backend health PR should:

- make one boundary clearer
- add or improve a guardrail
- include a contract test when architecture changes
- avoid unrelated business logic edits
- clearly declare what it does not handle

This repository now has enough guardrails for incremental architecture work without relying on every contributor or agent having identical context.
