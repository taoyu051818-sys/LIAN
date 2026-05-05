# Decisions Override - 2026-05-05

This file overrides stale active-decision readings in `docs/agent/04_DECISIONS.md`.

The original decision log remains useful as history, but it predates the active backend repo state, backend guardrail PRs, route registry PRs, docs automation PRs, and current root README runtime wording.

## Current decision authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. `PR_DERIVED_STATUS_2026-05-05.md`.
4. Current root `README.md` for runtime data model and startup/verification entrypoints.
5. This override file.
6. `04_DECISIONS.md` for historical decision context.

## New active supersessions

| Old decision text | Current supersession |
|---|---|
| `04_DECISIONS.md` is the current decision log unless newer dated decision is added. | This override is the newer dated decision layer for conflicts found on 2026-05-05. |
| Redis first cut is merged but file mode remains default. | Root README now states the active runtime data model is Redis object-native. Treat file-mode wording as historical/rollback context unless current env/code says otherwise. |
| Backend repo bootstrap is still pending/destructive split not approved. | Backend repo ownership is complete: backend/API/runtime work belongs in `lian-platform-server`. |
| `ARCHITECTURE_WORKPLAN.md` is the current entry point for assigning next work. | Current entry point is PR-derived status plus overrides, then old workplan. |
| `api-router.js`/route-matcher are the only route boundary. | Route ownership must include `api-route-registry.js` and route-registry tests. |
| Manual docs/index maintenance is normal. | Backend docs inventory and generated docs checks are now part of the guardrail system. |

## Active current decisions

- `lian-platform-server` is the backend/API/runtime source of truth.
- `lian-mobile-web` is the frontend/mobile web source of truth.
- `lian-mobile-web-full` is historical only.
- Backend runtime data model follows the root README: Redis object-native.
- `npm run check` is the normal backend guardrail entrypoint.
- `npm run verify` is the broad backend verification matrix when environment dependencies are available.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.
- Docs inventory should remain generated; do not restore hand-maintained docs lists.
- AI may suggest drafts, but must not automatically publish or approve content.
- Map geometry/data/editor work remains human-assisted.
- Do not mix feed ranking, publish, map, auth, storage, and routing changes in one PR unless a task explicitly scopes that crossing.

## Still-valid historical decisions

The following old decisions remain valid unless current code/PRs prove otherwise:

- NodeBB remains the content backend.
- LIAN owns the campus experience layer.
- AI suggestions are draft-only.
- `locationId` is the formal place key direction.
- `locationArea` is legacy compatibility text.
- Feed curation must not permanently lock the whole homepage.
- Task market, errands, and drones remain deferred.
