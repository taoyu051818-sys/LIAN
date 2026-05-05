# Contracts Override - 2026-05-05

This file overrides stale active-contract readings in `docs/agent/contracts/*`.

The API contract remains useful as a split-era inventory and compatibility reference. It must not be treated as the live API source of truth without checking current code, merged PRs, current route registry, and the current backend runtime model.

## Current authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. `PR_DERIVED_STATUS_2026-05-05.md`.
4. Current root `README.md` for backend runtime/verification entrypoints.
5. `api-route-registry.js` and route-registry tests for backend route ownership.
6. This override file.
7. `docs/agent/contracts/api-contract.md` as historical/API inventory context.

## Current backend runtime facts

- Backend repo: `lian-platform-server`.
- Frontend repo: `lian-mobile-web`.
- Historical full-stack repo: `lian-mobile-web-full`.
- Backend runtime data model is documented as Redis object-native in the root README.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.
- Backend checks include structure, encoding, smell guard, context-doc guard, docs maintenance guard, generated docs check, and route registry tests.

## Known stale contract readings

| Contract reading | Current correction |
|---|---|
| `Status: Frozen — Phase 0 of repo split` and `source of truth for API surface`. | Treat as split-era inventory. Current code, route registry, and merged PRs are authoritative. |
| Backend route references only to old services such as `api-router.js` and inline routes. | Current route ownership includes `api-route-registry.js` and route-registry tests. |
| File-backed data assumptions in endpoint implementation notes. | Runtime data model is Redis object-native unless current env/code says otherwise. |
| Port assumptions such as `PORT=4100` and image proxy `4101`. | Current backend root README is authoritative for backend startup/runtime ports; frontend ports are owned by `lian-mobile-web`. |
| `GET /api/messages` marked deprecated because old frontend used `/api/channel`. | Recheck current frontend Vue canary and backend code before treating endpoint status as deprecated. |
| `After repo split, backend repo does not need to serve public/`. | Later backend PRs include static fallback behavior; check current backend code before changing static fallback. |
| Endpoint classification counts from 2026-05-02. | Useful historical inventory only; re-run/inspect route registry and frontend callers for current counts. |

## Current safe contract usage

Use `api-contract.md` to understand:

- original split-era endpoint inventory;
- broad frontend/backend boundary intent;
- expected request/response shapes for legacy/static callers;
- which endpoints were considered frontend-required, admin-only, backend-only, or deprecated on 2026-05-02.

Do not use it alone to decide:

- whether an endpoint currently exists;
- whether an endpoint is still deprecated;
- whether an endpoint is still called by frontend;
- which route module owns it now;
- whether a response shape has drifted.

## Update rule

If an API contract matters for new backend implementation, verify current `api-route-registry.js`, current handler code, current root README, and current frontend callers first. Then either update the contract explicitly or create a newer dated contract addendum.
