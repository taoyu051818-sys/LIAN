# Handoffs Override - 2026-05-05

This file overrides stale active-status readings in `docs/agent/handoffs/*`.

Handoffs are context-transfer notes. They are not acceptance records and must not override current code, merged PRs, PR-derived status, root README, or dated override files.

## Current authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. `PR_DERIVED_STATUS_2026-05-05.md`.
4. Current root `README.md` for backend runtime/verification entrypoints.
5. This override file.
6. Individual handoffs as historical context.

## Current handoff-read rule

Before using any handoff:

1. Check current code, root README, and `package.json`.
2. Check merged PRs.
3. Read `PR_DERIVED_STATUS_2026-05-05.md`.
4. Read the relevant override files.
5. Then read the handoff for thread context only.

## Known stale handoff readings

| Handoff or index | Stale reading | Current correction |
|---|---|---|
| `handoffs/README.md` | `04_DECISIONS.md` and `05_TASK_BOARD.md` are current workspace entry points. | Current entry point is PR-derived status plus overrides. |
| `handoffs/README.md` | Read `ARCHITECTURE_WORKPLAN.md` before new implementation. | Read PR-derived status and override files before old architecture workplan. |
| `frontend-stability-smoke.md` and frontend handoffs mirrored here | Frontend static smoke or classic scripts define backend validation. | Backend validation is current backend `package.json`, `npm run check`, `npm run verify`, route registry tests, and docs checks. |
| `repo-split-frontend-backend.md` | Backend repo bootstrap may still be a future task. | Backend repo exists and owns backend/API/runtime. |
| Storage/Redis handoffs | File-mode wording may appear as current default. | Root README documents Redis object-native as active runtime model. Treat file-mode wording as historical/rollback context unless current env/code says otherwise. |
| Route/API handoffs | Route ownership may mention only `api-router.js`/old route matcher. | Current route ownership includes `api-route-registry.js` and route-registry tests. |
| Map handoffs | Map implementation may proceed from handoff notes alone. | Map geometry/data/editor work remains human-assisted and requires explicit human-approved scope. |

## Current backend handoff facts

- `lian-platform-server` is the active backend/API/runtime repo.
- `lian-mobile-web` is the active frontend/mobile web repo.
- `lian-mobile-web-full` is historical only.
- Backend runtime is documented as Redis object-native in the root README.
- Handoff validation results are snapshots, not durable acceptance unless current PRs/code still match.

## Safe usage

Use handoffs to answer:

- what a previous thread attempted;
- what files it thought it changed;
- what validations it claimed to run;
- what risks it left behind.

Do not use handoffs alone to answer:

- what is currently implemented;
- what repo owns a file now;
- whether a feature is accepted today;
- what command should be run today;
- whether an old follow-up is still valid.
