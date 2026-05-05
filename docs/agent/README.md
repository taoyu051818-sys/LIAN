# Agent Docs Index

This directory is the working memory for Codex threads. Treat merged GitHub PRs and current code as more authoritative than older task-board, decision, domain, task, handoff, contract, or split-manifest text.

## Current Source-Of-Truth Rule

When docs disagree, prefer this order:

1. Current code on `main`.
2. Merged GitHub PRs, especially newest PRs.
3. Current root `README.md` for backend runtime and verification entrypoints.
4. `references/PR_DERIVED_STATUS_2026-05-05.md`.
5. `references/DECISIONS_OVERRIDE_2026-05-05.md` for decision-log conflict handling.
6. `references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md` for architecture-planning conflict handling.
7. `references/TASK_BOARD_OVERRIDE_2026-05-05.md` for active task-board interpretation.
8. `references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md` for ownership conflict handling.
9. `references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md` for file-index conflict handling.
10. `references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md` for domain-doc conflict handling.
11. `references/TASK_DOCS_OVERRIDE_2026-05-05.md` for task-doc conflict handling.
12. `references/HANDOFFS_OVERRIDE_2026-05-05.md` for handoff conflict handling.
13. `references/CONTRACTS_OVERRIDE_2026-05-05.md` for API-contract conflict handling.
14. `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md` for split-manifest conflict handling.
15. `references/DOC_REVIEW_FINDINGS_2026-05-05.md` for known stale-doc warnings.
16. Latest handoff for the task area as context only.
17. Current task doc as scope/history, after override checks.
18. `PROJECT_FILE_INDEX.md` as historical/structural context.
19. Domain docs as business intent and historical context.
20. Contract docs as split-era API inventory, after contract override checks.
21. `repo-split-manifest.json` as historical export metadata only.
22. `ARCHITECTURE_WORKPLAN.md`, `03_FILE_OWNERSHIP.md`, and `04_DECISIONS.md` as historical/planning context.
23. Historical baseline/planning docs.

## Thread Workflow

Default division of labor:

- Codex / code thread: project management, planning, architecture decisions, review, acceptance, and docs status.
- Claude Code thread: implementation inside the approved task boundary.

Do not treat executor handoffs as acceptance. A lane becomes accepted only when the Codex / code review records the validation result in `05_TASK_BOARD.md`, the corresponding task doc, or a newer PR-derived status file.

## Start Here

Read these in order before starting implementation work:

1. `references/PR_DERIVED_STATUS_2026-05-05.md` - newest PR-derived backend/runtime status
2. `references/DECISIONS_OVERRIDE_2026-05-05.md` - current decision-log override
3. `references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md` - current architecture-planning override
4. `references/TASK_BOARD_OVERRIDE_2026-05-05.md` - current active task-board interpretation
5. `references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md` - current ownership conflict handling
6. `references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md` - current file-index conflict handling
7. `references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md` - current domain-doc conflict handling
8. `references/TASK_DOCS_OVERRIDE_2026-05-05.md` - current task-doc conflict handling
9. `references/HANDOFFS_OVERRIDE_2026-05-05.md` - current handoff conflict handling
10. `references/CONTRACTS_OVERRIDE_2026-05-05.md` - current API-contract conflict handling
11. `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md` - current repo-split manifest conflict handling
12. `references/DOC_REVIEW_FINDINGS_2026-05-05.md` - known stale-doc risks and cleanup recommendations
13. `00_AGENT_RULES.md` - operating rules, validation, high-conflict files
14. `ARCHITECTURE_WORKPLAN.md` - historical architecture direction; verify stale points against overrides and PRs
15. `05_TASK_BOARD.md` - long task context; may contain older status and must be checked against PRs and override files
16. `03_FILE_OWNERSHIP.md` - historical ownership/conflict context; check against ownership override before use
17. `PROJECT_FILE_INDEX.md` - historical file index; check against override before use
18. `04_DECISIONS.md` - historical decision context; check against decisions override before use
19. `domains/<area>.md` - domain intent and historical context; check against domain override before use
20. `tasks/<task>.md` - task scope/history; check against task override before use
21. `handoffs/<task>.md` - thread context only; check against handoffs override before use
22. `contracts/<contract>.md` - split-era contract inventory; check against contracts override and current code before use
23. `repo-split-manifest.json` - split export metadata only; check against manifest override before use

For production deploy, Redis, PM2, forum gate, and security/development boundaries, read `references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md` before changing ports, deployment commands, or storage settings.

## Current Backend Runtime Snapshot

Current merged PRs and code establish this backend model:

- backend runtime source of truth is `taoyu051818-sys/lian-platform-server`;
- `npm run check` includes backend structure, encoding, code-smell guard, context-doc guard, docs maintenance guard, generated automation docs check, and route registry contract tests;
- `npm run verify` is the broad backend verification matrix;
- route dispatch is guarded by `api-route-registry.js` and `scripts/test-route-registry.js`;
- docs inventory is generated through `npm run docs:list`.

## Current Domain Docs

Use these for business/domain intent only after reading `references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md`:

- `domains/AI_POST_PREVIEW.md` - AI preview and light publish scope
- `domains/AUDIENCE_SYSTEM.md` - audience/permission model direction
- `domains/FEED_SYSTEM.md` - feed, metadata, scoring, and debug context
- `domains/MAP_SYSTEM.md` - Map v1/v2, location data, editor, and future map work
- `domains/NODEBB_INTEGRATION.md` - NodeBB endpoints, auth modes, posting path, and failure modes

## Current Task Docs

Use `tasks/` for task scope/history only after reading `references/TASK_DOCS_OVERRIDE_2026-05-05.md`. Before starting, compare the task with current code and merged PRs because several older tasks were partially or fully superseded by backend guardrail and repo-split PRs.

## Handoffs

Use `handoffs/` for completed-thread summaries and next-thread instructions only after reading `references/HANDOFFS_OVERRIDE_2026-05-05.md`. Handoffs are context transfer notes, not new product scope or durable acceptance records.

Read `handoffs/README.md` for the normalized handoff list and current handoff entrypoint.

## Contracts

Use `contracts/` for split-era API inventory only after reading `references/CONTRACTS_OVERRIDE_2026-05-05.md`. Verify current frontend callers, backend route registry, and backend handler code before treating any endpoint status, port, route owner, or response shape as current.

## Split Manifest

Use `repo-split-manifest.json` only as historical export metadata after reading `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md`. Current code, PRs, root README, and override files own present-day file ownership.

## References

- `references/PR_DERIVED_STATUS_2026-05-05.md` - newest PR-derived status for the backend repo
- `references/DECISIONS_OVERRIDE_2026-05-05.md` - current decision override and conflict list
- `references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md` - current architecture override and conflict list
- `references/TASK_BOARD_OVERRIDE_2026-05-05.md` - current active task-board override
- `references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md` - current file ownership override and conflict list
- `references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md` - current file-index override and conflict list
- `references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md` - current domain-doc override and conflict list
- `references/TASK_DOCS_OVERRIDE_2026-05-05.md` - current task-doc override and conflict list
- `references/HANDOFFS_OVERRIDE_2026-05-05.md` - current handoff override and conflict list
- `references/CONTRACTS_OVERRIDE_2026-05-05.md` - current contract override and conflict list
- `references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md` - current repo-split manifest override and conflict list
- `references/DOC_REVIEW_FINDINGS_2026-05-05.md` - documentation review findings and stale-doc warning list
- `references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md` - production runtime chain, forum-gate security boundary, PM2 deploy rule, Redis DB boundary, and cross-origin troubleshooting notes
- `references/HIGH_RISK_AREAS.md` - high-risk area audits
- `references/GITHUB_RECENT_UPDATES_2026-05-04.md` - historical GitHub commit summary; superseded for recent backend PR state
- `references/RECENT_WORK_HANDOFF_2026-05-04.md` - historical long-thread handoff; superseded for recent backend PR state

## Historical References

These files are useful for history but should not override newer PRs or code:

- `01_PROJECT_FACT_BASELINE.md` - early fact baseline
- `MAP_V2_TECH_PLAN.md` - early Map v2 implementation plan
- `domains/FEED_REFACTOR_PLAN.md` - feed refactor planning reference
