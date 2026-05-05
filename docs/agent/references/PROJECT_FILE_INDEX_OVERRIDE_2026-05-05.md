# Project File Index Override - 2026-05-05

This file overrides stale readings in `docs/agent/PROJECT_FILE_INDEX.md`.

The original index remains useful as transition history, but it mixes frontend and backend ownership from the split period. Use this override before relying on the long index.

## Correct source-of-truth order

1. Current code on `main`.
2. Merged GitHub PRs.
3. `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`.
4. `docs/agent/references/TASK_BOARD_OVERRIDE_2026-05-05.md`.
5. This file for file-index conflict handling.
6. `docs/agent/PROJECT_FILE_INDEX.md` for historical structure only.

## Current repository ownership

| Area | Current owner |
|---|---|
| Backend runtime | `taoyu051818-sys/lian-platform-server` |
| API routes and route registry | `taoyu051818-sys/lian-platform-server` |
| Redis object-native runtime state | `taoyu051818-sys/lian-platform-server` |
| NodeBB integration | `taoyu051818-sys/lian-platform-server` |
| Feed service and feed scoring helpers | `taoyu051818-sys/lian-platform-server` |
| Frontend runtime lanes | `taoyu051818-sys/lian-mobile-web` |
| Vue canary app | `taoyu051818-sys/lian-mobile-web` |
| Legacy/static rehearsal frontend | `taoyu051818-sys/lian-mobile-web` |
| Frontend task-board UI | `taoyu051818-sys/lian-mobile-web` |
| Historical full-stack transition material | `taoyu051818-sys/lian-mobile-web-full`, history only |

## Known stale or conflicting index statements

| Old index reading | Current correction |
|---|---|
| Source-of-truth order puts latest handoff before PRs. | Merged PRs and current code now come before handoffs. |
| `README.md` row says frontend under root/repo-level files. | Each repo has its own root README; backend README is current for backend runtime. |
| `.github/workflows/frontend.yml` appears in backend-oriented file index. | Frontend workflow belongs to `lian-mobile-web`; backend CI belongs to `lian-platform-server`. |
| `src/server/api-router.js` described as route mounting only. | Current backend routing also uses `api-route-registry.js` and route-registry tests. |
| Redis section describes file mode as default safe mode. | Backend root README now states active runtime data model is Redis object-native. Treat file mode/migration descriptions as historical or rollback context unless current code says otherwise. |
| Scripts list omits newer docs/code guard checks. | Current `package.json` is authoritative for `npm run check` and `npm run verify`. |
| References table marks 2026-05-04 GitHub updates as current. | 2026-05-04 references are historical. Use 2026-05-05 PR-derived status and overrides first. |

## Current backend top-level verification entrypoints

Use `package.json` as source of truth. Current important commands include:

```bash
npm run check
npm run verify
npm run test:route-registry
npm run docs:list
```

`npm run check` includes structure, encoding, code-smell guard, context-doc guard, docs maintenance guard, generated automation-docs check, and route registry tests.

## Cleanup recommendation

A future cleanup PR may rewrite `PROJECT_FILE_INDEX.md` into a backend-only index. Until then, do not delete historical sections; use this override to prevent stale split-era statements from becoming active implementation guidance.
