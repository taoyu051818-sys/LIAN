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
7. `docs/agent/contracts/api-contract.md` as historical/API inventory context only.

## Current backend runtime facts

- Backend repo: `lian-platform-server`.
- Frontend repo: `lian-mobile-web`.
- Historical full-stack repo: `lian-mobile-web-full`.
- Backend runtime data model is documented as Redis object-native in the root README.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.
- Backend checks include structure, encoding, smell guard, context-doc guard, docs maintenance guard, generated docs check, and route registry tests.

## Current DTO contract facts

Merged backend PRs #65, #66, #68, #69, #70, and #71 supersede legacy split-era DTO shapes for actor/source/place surfaces.

### Actor/source identity

Current post/feed/channel identity contract is canonical-only:

```text
actor = display identity
actor.identityTag = optional trust/contribution signal
source = platform/import/provider metadata
```

Do not reintroduce migration-only author fallback fields into backend response DTOs.

Removed response fields include, but are not limited to:

```text
author
authorAvatarUrl
authorIdentityTag
username
identityTag
avatarText
avatarUrl
authorAvatarText
authorAliasId
authorAliasName
authorActorSource
```

Affected DTO surfaces:

- Feed item DTO uses `actor` and optional `source`; it no longer returns a legacy `author` object.
- PostDetail DTO uses `actor` and optional `source`; it no longer returns flat `author*` fields.
- Reply DTO uses `actor` and optional `source`; it no longer returns flat `author*` fields.
- Channel event DTO uses `actor` and optional `source`; it no longer returns flat author/avatar/alias fields.

Contract tests in `scripts/test-actor-source-contracts.js` assert these legacy fields are absent.

### PlaceRef / PlaceSheet identity

Current place identity contract is stable-id only:

```text
PlaceRef = stable place identity used to open PlaceSheet
PlaceSheet = stable place surface
locationArea/manual text = display fallback only
source/provider/name/status = metadata or display hints only, never relation identity
```

Do not infer `PlaceRef` or PlaceSheet relations from `locationArea`, marker text, color, provider, source label, or display name.

Current stable aliases for place relation identity:

```text
locationId
placeId
```

Contract tests in `scripts/test-place-sheet-contract.js` and `scripts/test-place-ref-stable-id-contract.js` assert this behavior.

## Known stale contract readings

| Contract reading | Current correction |
|---|---|
| `Status: Frozen - Phase 0 of repo split` and `source of truth for API surface`. | Treat as split-era inventory. Current code, route registry, merged PRs, and this override are authoritative. |
| Feed/PostDetail/Reply/Channel response examples with flat `author`, `authorAvatarUrl`, `authorIdentityTag`, `username`, `avatarUrl`, `identityTag`, or alias fields. | Stale after #71. Current DTOs use canonical `actor` + optional `source`; legacy author/avatar/identity/alias fields are intentionally absent. |
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
- whether a response shape has drifted;
- whether legacy author/avatar/identity/alias fields should be returned.

## Update rule

If an API contract matters for new backend implementation, verify current `api-route-registry.js`, current handler code, current root README, current contract tests, and current frontend callers first. Then either update the contract explicitly or create a newer dated contract addendum.
