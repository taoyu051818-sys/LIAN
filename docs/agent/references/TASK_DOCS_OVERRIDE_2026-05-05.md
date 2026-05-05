# Task Docs Override - 2026-05-05

This file overrides stale active-task readings in `docs/agent/tasks/*`.

Task docs remain useful for scope, risks, acceptance ideas, and historical intent. They must not be used as current status without checking merged PRs and current code.

## Current authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. `PR_DERIVED_STATUS_2026-05-05.md`.
4. Current root `README.md` for backend runtime/verification entrypoints.
5. This override file.
6. Individual task docs as scope/history.

## Cross-task current facts

- `lian-platform-server` is the active backend/API/runtime repo.
- `lian-mobile-web` is the active frontend/mobile web repo.
- `lian-mobile-web-full` is historical only.
- Backend repo bootstrap is complete at repo-ownership level.
- Backend runtime is documented as Redis object-native in the root README.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.
- Backend checks now include structure, encoding, smell guard, context-doc guard, docs maintenance guard, generated docs checks, and route registry tests.

## Known stale task readings

| Task doc | Stale reading | Current correction |
|---|---|---|
| `tasks/repo-split-frontend-backend.md` | Backend repo bootstrap is pending and backend repo must be created. | Backend repo exists and owns backend/API/runtime. Use this task as split-history only. |
| `tasks/repo-split-frontend-backend.md` | Initial backend validation is limited to old node checks and route tests. | Use current `package.json`, `npm run check`, `npm run verify`, route registry tests, and generated docs checks. |
| `tasks/repo-split-frontend-backend.md` | Frontend repo cleanup/finalize is active backend task. | Frontend cleanup belongs in `lian-mobile-web`; backend tasks should not modify frontend runtime. |
| `tasks/audience-write-side-minimum-audit.md` | This remains a plausible backend follow-up, but status must be rechecked. | Recheck current backend code/PRs before implementing; keep scope minimum and do not build full permission platform. |
| Older Redis/storage task docs | File mode may be described as default. | Root README documents Redis object-native as active runtime data model; treat file-mode wording as historical/rollback context unless current env/code says otherwise. |
| Older route/API task docs | Route ownership may only mention `api-router.js`/`route-matcher.js`. | Current route ownership includes `api-route-registry.js` and `scripts/test-route-registry.js`. |
| Older docs-maintenance task docs | Manual docs lists may be implied. | Docs inventory should remain generated through docs tooling. |

## Current backend task guidance

Before starting a backend task:

1. Check current `package.json`.
2. Check current root `README.md`.
3. Check merged PRs.
4. Check `PR_DERIVED_STATUS_2026-05-05.md`.
5. Check this override.
6. Then use task docs for scope/history.

Current safe backend follow-up lanes:

- Run `npm run check` after pulling latest `main`.
- Run `npm run verify` when environment dependencies are available.
- If continuing feed cleanup, wire extracted feed-scoring helpers into production `feed-service.js` in a separate narrow PR.
- If continuing audience write-side work, audit `/api/posts` and `/api/ai/post-publish` and keep enforcement minimal.
- Keep route changes synchronized with `api-route-registry.js` and route-registry tests.
- Keep docs inventory generated; do not restore hand-maintained docs lists.

## Do not start from stale task docs

Do not start new implementation directly from old P0 task docs unless the task is revalidated against current PRs and code. Create a fresh task or add an explicit dated addendum when resuming old scope.
