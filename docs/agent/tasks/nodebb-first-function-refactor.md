# NodeBB-First Function Refactor

Date: 2026-05-05

## Goal

Refactor LIAN backend feature functions around NodeBB capabilities while keeping runtime behavior unchanged in the first slices.

This task is about function boundaries only. Redis migration, Redis object keys, deployment, PM2, Nginx, forum-gate, and production environment flags are out of scope.

## Baseline

LIAN uses NodeBB as the content and community system of record. LIAN owns the campus product layer: feed ranking, metadata, Map v2 data, AI drafts and records, audience rules, and school or organization membership.

The target call shape is:

```text
Controller -> Use Case -> Policy -> NodeBB Gateway -> Repository Interface
```

## Hard boundaries

Do not change these areas in this refactor task:

- Redis migration scripts or object key schema.
- Runtime storage flags.
- Production process or proxy configuration.
- NodeBB plugin code or NodeBB data structure.
- API response shape unless the API contract is updated first.

## Refactor principles

1. NodeBB gateway owns NodeBB endpoint details.
2. Use cases own user-facing business actions.
3. Policies own permission and audience decisions.
4. Repositories are consumed as interfaces; this task does not redefine storage internals.
5. Controllers must be thin: parse, validate, execute, respond.
6. Existing service files may remain as compatibility facades until each route is migrated.
7. Every implementation slice must be behavior-preserving unless a dedicated product task says otherwise.

## Target module layout

```text
src/server/app/
  gateways/nodebb/
  policies/
  usecases/posts/
  usecases/feed/
  usecases/publish/
  usecases/messages/
  usecases/profile/
```

## Phase 1: Behavior-neutral skeleton

Add new module directories and helper factories. Do not wire routes yet.

Acceptance:

```bash
npm run check
npm test
npm run test:routes
```

Manual acceptance:

- `/api/feed` response shape is unchanged.
- `/api/map/v2/items` is not touched.
- Like, save, report, publish, and messages behavior is not touched.

## Phase 2: NodeBB gateway extraction

Move NodeBB endpoint construction and auth header decisions into gateway modules.

Scope:

- topic detail
- recent topic index
- topic creation
- reply creation
- vote or like
- bookmark or save
- flag or report
- user lookup and create
- notifications

Acceptance:

- Business use cases do not call `nodebbFetch()` directly.
- Business use cases do not construct NodeBB API paths directly.
- Bearer token versus `x-api-token` behavior is expressed in gateway code.
- `scripts/smoke-nodebb-contracts.js` still passes.

## Phase 3: Post action use cases

Move detail, reply, like, save, and report into use cases.

Acceptance:

- Route response shape is unchanged.
- NodeBB remains source of truth for like, save, and report.
- Audience check remains before user interactions.

## Phase 4: Publish use cases

Move regular publish and AI confirmed publish into use cases.

Acceptance:

- Regular publish still creates a NodeBB topic as the logged-in user's NodeBB uid.
- AI publish still requires explicit user confirmation.
- AI preview does not publish.
- Metadata writes remain through existing storage or repository functions.

## Phase 5: Feed and profile use cases

Move feed composition and profile lists into use cases after NodeBB gateway boundaries are stable.

Acceptance:

- Feed ranking behavior is unchanged unless a dedicated feed task approves a ranking change.
- Saved, liked, and history profile lists remain user-scoped and audience-filtered.
- No direct Redis key access is introduced.

## Phase 6: Thin controllers

After use cases are in place, make controllers thin and leave `api-router.js` as route table and dispatch layer.

Acceptance:

- Controller functions only parse input, call use cases, and send responses.
- Business decisions are absent from controller functions.

## First implementation slice

Create behavior-neutral scaffolding:

- NodeBB gateway factories.
- Policy wrappers around existing audience behavior.
- Example post use case factories.
- No route wiring.
- No storage implementation changes.
