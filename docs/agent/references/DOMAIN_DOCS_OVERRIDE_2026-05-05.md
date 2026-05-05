# Domain Docs Override - 2026-05-05

This file overrides stale active-domain readings in `docs/agent/domains/*`.

The domain docs remain useful as business and historical context, but some statements predate the active backend repo state, Redis object-native root README, route registry work, and Audience Phase 1-3 implementation notes.

## Current authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. `PR_DERIVED_STATUS_2026-05-05.md`.
4. Current root `README.md` for runtime data model and verification entrypoints.
5. This override file.
6. Domain docs as historical/domain context.

## Cross-domain current facts

- `lian-platform-server` owns backend/API/runtime, Redis object-native state, NodeBB integration, feed service, audience service, map/data APIs, auth/session, uploads, and backend validation.
- `lian-mobile-web` owns frontend runtime lanes, frontend UI, Vue canary, legacy/static rehearsal, frontend task-board UI, and frontend docs.
- `lian-mobile-web-full` is historical only.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.
- Backend docs inventory/checks are generated/guarded; do not restore hand-maintained lists.

## Feed domain corrections

| Domain doc reading | Current correction |
|---|---|
| Feed source of truth is file-backed `data/post-metadata.json` and `data/feed-rules.json`. | Root README says runtime data model is Redis object-native. Treat JSON files as migration/rollback/file-mode context unless current code/env says otherwise. |
| Feed validation scripts in domain doc are complete current verification. | Use current `package.json`: `npm run check`, `npm run verify`, and targeted feed/test scripts as available. |
| Feed scoring is fully in the old monolithic service. | Recent backend PRs extracted pure feed scoring helpers; production wiring may remain a narrow follow-up. |

## Map domain corrections

| Domain doc reading | Current correction |
|---|---|
| Bounds shown as south `18.3700734`, west `109.9940365`, north `18.4149043`, east `110.0503482`. | Later decision/task-board references set canonical bounds to south `18.37107`, west `109.98464`, north `18.41730`, east `110.04775`. Verify current code before editing. |
| Map data JSON files are the only source of truth. | Current backend runtime is Redis object-native; JSON files may be migration/rollback/file-mode context. |
| Map admin/editor can be implemented from domain doc alone. | Map geometry/data/editor work remains human-assisted and must be scoped with explicit human approval. |
| Frontend editor files are backend-owned implementation targets. | Frontend UI/editor files belong in `lian-mobile-web`; backend owns map data/API service. |

## Audience domain corrections

| Domain doc reading | Current correction |
|---|---|
| Enforcement table still says feed/detail/map/messages have no audience filtering and require changes. | Task-board and handoff history record Audience Phase 1-3 read-side enforcement as implemented/accepted with follow-up. Recheck current code before treating read-side as missing. |
| Write-side enforcement is Phase 4. | This remains a valid follow-up area unless newer backend code/PRs prove it landed. |
| `auth-users.json` is the current user source. | Backend root README describes Redis object-native auth runtime. Treat JSON file wording as historical/file-mode context. |
| Organization membership examples are active product model. | Treat as design/examples unless current backend code implements them. |

## NodeBB domain corrections

| Domain doc reading | Current correction |
|---|---|
| Some implementation statuses say report/not integrated or read/history partial. | Recheck current backend PRs/code before planning. Recent task-board notes accepted several detail/profile actions and left narrower message/reply identity follow-up. |
| Current gaps list says feed/detail/map/messages lack audience checks. | Audience Phase 1-3 read-side state must be rechecked against current backend code and PRs; do not blindly use old gap list. |
| `post-metadata.json` and JSON auth files are active state model. | Backend root README now documents Redis object-native runtime. JSON references may be migration/rollback/file-mode context. |
| Endpoint/auth behavior is static truth. | Endpoint/auth behavior must still be verified against the installed NodeBB version before new integration cuts. |

## Still-valid domain rules

- NodeBB remains the durable content/community backend.
- LIAN owns campus product state: feed ranking, audience rules, map experience, metadata, AI drafts, and frontend UX.
- AI suggestions are draft-only; no auto-publish or auto-approval.
- `locationId` is the formal place-key direction; `locationArea` is compatibility text.
- `feedEditions` should not permanently lock the homepage.
- Map geometry/data work is human-assisted.
- NodeBB groups/categories should mirror hard boundaries only after LIAN-owned audience rules are clear.

## Safe domain-read rule

Before starting domain implementation, read current code, current root README, current `package.json`, and PR-derived status first. Then use domain docs to understand intent, not as current implementation truth.
