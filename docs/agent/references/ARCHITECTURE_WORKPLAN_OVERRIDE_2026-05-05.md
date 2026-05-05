# Architecture Workplan Override - 2026-05-05

This file overrides stale active-planning readings in `docs/agent/ARCHITECTURE_WORKPLAN.md`.

The original workplan remains useful as architecture history, but it predates the completed backend repo split and recent backend guardrail/automation PRs.

## Current architecture facts

- `lian-platform-server` is the active backend/API/runtime repository.
- `lian-mobile-web` is the active frontend/mobile web repository.
- `lian-mobile-web-full` is historical only.
- Backend repo bootstrap is complete at repo-ownership level.
- Backend runtime uses Redis object-native as documented in the root README.
- Backend checks now include code-smell guard, context-doc guard, docs maintenance guard, generated docs check, and route registry tests.
- Route dispatch is guarded by `api-route-registry.js` and route-registry tests.
- Docs inventory is generated through `npm run docs:list`.

## Known stale architecture readings

| Old architecture reading | Current correction |
|---|---|
| Future threads should start from `ARCHITECTURE_WORKPLAN.md`. | Start from PR-derived status, task-board override, project-file-index override, and doc review findings first. |
| Repository split is an active P0 workstream with phase order. | Backend repo already exists and owns backend/API/runtime work. Remaining work is cleanup, validation, and docs alignment. |
| Backend bootstrap is future or gated planning. | Backend repo is active and has its own CI/check/verify/docs automation. |
| `api-router.js` is the only route boundary to consider. | Current routing also uses `api-route-registry.js` and route-registry tests. |
| File-backed JSON mode is the safe/default planning baseline. | Current root README states Redis object-native is active runtime data model. File-backed data is historical/rollback context unless current code/env says otherwise. |
| Manual docs indexes are normal current maintenance. | Docs inventory is generated; avoid restoring hand-maintained docs lists. |

## Current backend architecture guidance

1. Treat `lian-platform-server` as the backend source of truth.
2. Use current `package.json` scripts before older task docs for validation commands.
3. Keep route changes synchronized with `api-route-registry.js` and route-registry tests.
4. Keep Redis object-native runtime assumptions aligned with the root README and current env.
5. Keep frontend changes in `lian-mobile-web`.
6. Use `npm run check` for normal backend guardrails.
7. Use `npm run verify` when environment dependencies are available.

## Still-valid principles from the original workplan

- Do not use AI to automatically publish or approve content.
- Do not mix feed ranking changes with map, publish, or auth changes.
- Keep Map data/editor work human-assisted.
- Keep high-risk changes narrow and validated.
- End implementation threads with clear handoffs when runtime behavior changes.
