# Documentation Review Findings - 2026-05-05

This file records the 2026-05-05 documentation review and cleanup pass for `lian-platform-server`.

Current code, merged GitHub PRs, root README, and current `package.json` override older task-board, handoff, domain, contract, split-manifest, and baseline docs. Dated override files and directory notices now exist to prevent stale split-era documents from being used as active implementation truth.

## Review scope

Reviewed and/or marked:

- root `README.md`
- `repo-split-manifest.json`
- `docs/agent/README.md`
- `docs/agent/00_AGENT_RULES.md`
- `docs/agent/03_FILE_OWNERSHIP.md`
- `docs/agent/04_DECISIONS.md`
- `docs/agent/05_TASK_BOARD.md`
- `docs/agent/ARCHITECTURE_WORKPLAN.md`
- `docs/agent/PROJECT_FILE_INDEX.md`
- `docs/agent/domains/*`
- `docs/agent/tasks/*`
- `docs/agent/handoffs/*`
- `docs/agent/contracts/*`
- `docs/agent/references/*`
- `docs/agent/templates/*`
- current `package.json`
- current backend PR-derived status notes

## Current accepted facts

- `lian-platform-server` is the active backend/API/runtime repository.
- `lian-mobile-web` is the active frontend/mobile web repository.
- `lian-mobile-web-full` is historical only.
- Backend repo bootstrap is no longer future planning; this repo owns backend/API/runtime work.
- The root README currently describes the active runtime data model as Redis object-native.
- `npm run check` includes backend structure, encoding, code-smell guard, context-doc guard, docs maintenance guard, generated automation-docs check, and route registry contract testing.
- `npm run verify` is the broad backend verification matrix.
- API route changes must satisfy `api-route-registry.js` and route-registry tests.
- Backend docs inventory is generated through docs tooling.

## Source-of-truth chain now established

Use this order when docs disagree:

1. Current code on `main`.
2. Merged GitHub PRs, especially newest PRs.
3. Root `README.md` and current `package.json`.
4. `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`.
5. Dated override files in `docs/agent/references/`.
6. Directory notices and current `docs/agent/README.md`.
7. Older numbered docs, domain docs, task docs, handoffs, contracts, and split manifest as historical/context material only.

## Override files created or integrated

| File | Purpose |
|---|---|
| `references/DECISIONS_OVERRIDE_2026-05-05.md` | Supersedes stale active-decision readings in `04_DECISIONS.md`. |
| `references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md` | Supersedes old architecture-planning entrypoint and backend bootstrap assumptions. |
| `references/TASK_BOARD_OVERRIDE_2026-05-05.md` | Supersedes stale active task-board interpretation. |
| `references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md` | Supersedes stale file ownership boundaries. |
| `references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md` | Supersedes stale split-era project index readings. |
| `references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md` | Supersedes stale domain-doc implementation status. |
| `references/TASK_DOCS_OVERRIDE_2026-05-05.md` | Supersedes stale active-task readings. |
| `references/HANDOFFS_OVERRIDE_2026-05-05.md` | Clarifies handoffs are context, not acceptance records. |
| `references/CONTRACTS_OVERRIDE_2026-05-05.md` | Supersedes split-era API contract status/port/caller assumptions. |
| `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md` | Supersedes stale active-ownership readings in `repo-split-manifest.json`. |

## Directory notices added

These directory-level notices were added so future readers see the warning before opening individual old files:

| Directory | Notice file | Meaning |
|---|---|---|
| `domains/` | `00_DIRECTORY_NOTICE_2026-05-05.md` | Domain docs are business intent/history unless revalidated. |
| `tasks/` | `00_DIRECTORY_NOTICE_2026-05-05.md` | Task docs are scope/history, not active-work proof. |
| `handoffs/` | `00_DIRECTORY_NOTICE_2026-05-05.md` | Handoffs are context-transfer notes, not durable acceptance. |
| `contracts/` | `00_DIRECTORY_NOTICE_2026-05-05.md` | Contracts are split-era API inventory unless revalidated. |
| `references/` | `00_DIRECTORY_NOTICE_2026-05-05.md` | References are mixed; use current PR-derived/override files first. |

## File-level or sidecar superseded markers

| File or notice | Status |
|---|---|
| `ARCHITECTURE_WORKPLAN.md` | File-level warning banner added. |
| `04_DECISIONS.md` | File-level warning banner added. |
| `03_FILE_OWNERSHIP.md` | File-level warning banner added. |
| `contracts/api-contract.md` | File-level warning banner added. |
| `05_TASK_BOARD_SUPERSEDED_NOTICE_2026-05-05.md` | Sidecar notice added because the task board is long and unsafe to whole-file replace through truncated tool output. |
| `PROJECT_FILE_INDEX_SUPERSEDED_NOTICE_2026-05-05.md` | Sidecar notice added because direct long-file replacement was unsafe. |
| `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md` | Used for `repo-split-manifest.json` because JSON cannot contain Markdown comments. |

## Rules and templates updated

| File | Update |
|---|---|
| `00_AGENT_RULES.md` | Updated to require current code, PRs, root README/package, PR-derived status, and override chain before old docs. |
| `templates/TASK_TEMPLATE.md` | Updated to include current source check, repo ownership scope, API/contract checks, Redis object-native implications, and current validation commands. |
| `templates/HANDOFF_TEMPLATE.md` | Updated to state handoffs are not durable acceptance and must record override/source checks. |
| `handoffs/README.md` | Updated to route readers through PR-derived status and override files before individual handoffs. |

## Stale/risky interpretations now explicitly covered

| Old or risky reading | Current correction |
|---|---|
| Backend repo bootstrap is future planning. | Backend repo ownership is complete; this repo owns backend/API/runtime. |
| `ARCHITECTURE_WORKPLAN.md` is the current implementation entrypoint. | It is historical/planning context. Start from PR-derived status and overrides. |
| `04_DECISIONS.md` is the live decision source. | It is historical decision context. Use decisions override first. |
| `05_TASK_BOARD.md` current statuses can be trusted directly. | It is a long historical task board; check task-board override and PR-derived status first. |
| `PROJECT_FILE_INDEX.md` current source order and file ownership are authoritative. | It is split-era context; use file-index and ownership overrides first. |
| File mode is the current runtime assumption. | Root README currently states Redis object-native is the active runtime data model. Treat file-mode wording as rollback/history unless current env/code proves otherwise. |
| Route ownership only means `api-router.js`/`route-matcher.js`. | Route ownership includes `api-route-registry.js` and route-registry tests. |
| `contracts/api-contract.md` is frozen source of truth for current API. | It is split-era inventory; verify current route registry, handlers, and frontend callers. |
| `repo-split-manifest.json` describes current ownership. | It is historical export metadata only. |
| Old task docs can be used to start implementation directly. | Revalidate against current code and PRs; create a dated addendum or fresh task. |
| Handoffs prove acceptance. | Handoffs are context only; reviewer validation must be recorded elsewhere. |

## Remaining caveats

- Several old long files still contain obsolete body text below their warning banners or sidecar notices. That is intentional for history preservation.
- `05_TASK_BOARD.md` and backend `PROJECT_FILE_INDEX.md` were not whole-file edited because tool output or replacement safety checks made direct replacement risky.
- Directory notices do not replace current code/PR/root README checks; they are guardrails for readers.
- This pass did not run local/CI validation commands.

## Recommended next cleanup

1. Run backend validation:

```bash
npm run check
npm run verify
npm run test:routes
npm run test:route-registry
npm run docs:list
```

2. If docs tooling requires inventory updates, regenerate or update generated docs lists.
3. Later, consider consolidating the many override files into a compact `CURRENT_PROJECT_STATE_2026-05-05.md`, leaving individual overrides as detail appendices.
4. Only after CI/local validation, consider rewriting old `05_TASK_BOARD.md` into a current board plus archived history.
5. Only after CI/local validation, consider rewriting `PROJECT_FILE_INDEX.md` into a backend-only current index.

## Safe implementation rule

Before starting any backend task, check:

1. current code and `package.json` scripts;
2. root `README.md`;
3. latest merged PRs;
4. `PR_DERIVED_STATUS_2026-05-05.md`;
5. relevant override files;
6. then older task docs, handoffs, domains, contracts, and split manifest as context only.
