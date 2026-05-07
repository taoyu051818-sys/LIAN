# LIAN Knowledge Base

This directory is the canonical knowledge-base entrypoint for LIAN agent work. It replaces the older numbered-doc startup chain with a simplified source-of-truth order.

## Source-of-truth order

When docs or context disagree, prefer this order:

1. Current code on `main` and merged GitHub PRs.
2. Root `README.md`, `package.json`, and current runtime scripts.
3. **This knowledge base** (`docs/agent/knowledge/`).
4. `docs/agent/00_AGENT_RULES.md` for operating rules and forbidden actions.
5. `docs/agent/roles/` for role definitions and responsibilities.
6. `docs/agent/references/` dated override files for conflict resolution.
7. `docs/agent/05_TASK_BOARD.md` for current task status.
8. Older docs (`tasks/`, `handoffs/`, `contracts/`, `domains/`, numbered docs, split manifest) — these may be historical. Always confirm current source-of-truth status before relying on them.

## What lives here

| File | Purpose |
|---|---|
| [CURRENT_PROJECT_KNOWLEDGE.md](CURRENT_PROJECT_KNOWLEDGE.md) | Product shape, repo boundaries, AI publish rules, P0/P1 scope, stabilization policy |
| [ISSUE_SOLVING_PLAYBOOK.md](ISSUE_SOLVING_PLAYBOOK.md) | Controlled issue-to-PR flow: intake, classify, risk, conflict group, validation, audit, acceptance |

## Related docs

- [Roles](../roles/README.md) — role definitions (Human Owner, Pro/RPO, Codex, Claude Code, Reviewer, etc.)
- [Agent Rules](../00_AGENT_RULES.md) — operating rules, forbidden actions, high-conflict files, validation commands
- [Development Guardrails](../DEVELOPMENT_GUARDRAILS.md) — verification matrix, gateway contract, bad-smell checklist
- [Task Board](../05_TASK_BOARD.md) — live task status and priority

## Historical docs warning

Files in `docs/agent/tasks/`, `docs/agent/handoffs/`, `docs/agent/contracts/`, `docs/agent/domains/`, `docs/agent/references/`, and older numbered docs (`01_`, `03_`, `04_`, `ARCHITECTURE_WORKPLAN.md`, `PROJECT_FILE_INDEX.md`, etc.) may be historical or partially superseded. Before relying on them:

1. Check the corresponding override file in `references/` if one exists.
2. Verify against current code and merged PRs.
3. Confirm with the task board or a reviewer if the information affects active work.
