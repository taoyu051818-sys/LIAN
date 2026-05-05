# Agent Docs Index

This directory is the working memory for Codex threads. Treat merged GitHub PRs and current code as more authoritative than older task-board or handoff text.

## Current Source-Of-Truth Rule

When docs disagree, prefer this order:

1. Current code on `main`.
2. Merged GitHub PRs, especially newest PRs.
3. `references/PR_DERIVED_STATUS_2026-05-05.md`.
4. Latest handoff for the task area.
5. Current task doc.
6. `PROJECT_FILE_INDEX.md`.
7. Domain docs.
8. `ARCHITECTURE_WORKPLAN.md` and `04_DECISIONS.md`.
9. Historical baseline/planning docs.

## Thread Workflow

Default division of labor:

- Codex / code thread: project management, planning, architecture decisions, review, acceptance, and docs status.
- Claude Code thread: implementation inside the approved task boundary.

Do not treat executor handoffs as acceptance. A lane becomes accepted only when the Codex / code review records the validation result in `05_TASK_BOARD.md`, the corresponding task doc, or a newer PR-derived status file.

## Start Here

Read these in order before starting implementation work:

1. `references/PR_DERIVED_STATUS_2026-05-05.md` - newest PR-derived backend/runtime status
2. `00_AGENT_RULES.md` - operating rules, validation, high-conflict files
3. `ARCHITECTURE_WORKPLAN.md` - architecture direction and work organization; verify stale points against PRs
4. `05_TASK_BOARD.md` - task context; may contain older status and must be checked against PRs
5. `03_FILE_OWNERSHIP.md` - ownership and conflict boundaries
6. `PROJECT_FILE_INDEX.md` - file index with status, owner, repo split destination
7. `04_DECISIONS.md` - recorded architecture/product decisions
8. `domains/<area>.md` - domain context for the task area
9. `tasks/<task>.md` - current task specification, if present
10. `handoffs/<task>.md` - latest thread handoff, if present

For production deploy, Redis, PM2, forum gate, and security/development boundaries, read `references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md` before changing ports, deployment commands, or storage settings.

## Current Backend Runtime Snapshot

Current merged PRs and code establish this backend model:

- backend runtime source of truth is `taoyu051818-sys/lian-platform-server`;
- `npm run check` includes backend structure, encoding, code-smell guard, context-doc guard, docs maintenance guard, generated automation docs check, and route registry contract tests;
- `npm run verify` is the broad backend verification matrix;
- route dispatch is guarded by `api-route-registry.js` and `scripts/test-route-registry.js`;
- docs inventory is generated through `npm run docs:list`.

## Current Domain Docs

- `domains/AI_POST_PREVIEW.md` - AI preview and light publish scope
- `domains/AUDIENCE_SYSTEM.md` - audience/permission model direction
- `domains/FEED_SYSTEM.md` - feed, metadata, scoring, and debug context
- `domains/MAP_SYSTEM.md` - Map v1/v2, location data, editor, and future map work
- `domains/NODEBB_INTEGRATION.md` - NodeBB endpoints, auth modes, posting path, and failure modes

## Current Task Docs

Use `tasks/` for active or ready-to-resume implementation specs. A task doc should describe scope, allowed files, acceptance criteria, validation, and rollback notes. Before starting, compare the task with merged PRs because several older tasks were partially or fully superseded by backend guardrail and repo-split PRs.

## Handoffs

Use `handoffs/` for completed-thread summaries and next-thread instructions. Handoffs are context transfer notes, not new product scope.

Read `handoffs/README.md` for the normalized handoff list.

## References

- `references/PR_DERIVED_STATUS_2026-05-05.md` - newest PR-derived status for the backend repo
- `references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md` - production runtime chain, forum-gate security boundary, PM2 deploy rule, Redis DB boundary, and cross-origin troubleshooting notes
- `references/HIGH_RISK_AREAS.md` - high-risk area audits
- `references/GITHUB_RECENT_UPDATES_2026-05-04.md` - historical GitHub commit summary; superseded for recent backend PR state
- `references/RECENT_WORK_HANDOFF_2026-05-04.md` - historical long-thread handoff; superseded for recent backend PR state

## Historical References

These files are useful for history but should not override newer PRs or code:

- `01_PROJECT_FACT_BASELINE.md` - early fact baseline
- `MAP_V2_TECH_PLAN.md` - early Map v2 implementation plan
- `domains/FEED_REFACTOR_PLAN.md` - feed refactor planning reference
