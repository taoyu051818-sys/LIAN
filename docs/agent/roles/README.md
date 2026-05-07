# LIAN agent role system

This directory defines the canonical role model for LIAN controlled issue-solving work.

The role model exists so Human, Pro/RPO, Codex, Claude Code, reviewer, and ops threads can cooperate without blurring decision, execution, and acceptance authority.

## Core rule

Executor handoff is not acceptance. A Claude Code worker may implement, validate, commit, push, and open or update a PR, but it must not mark work as accepted. Acceptance belongs to the reviewer or Human Owner after validation evidence is reviewed.

## Roles

- Human Owner / Product Owner: final scope, priority, and acceptance authority.
- Pro / RPO Architecture Owner: architecture, knowledge-base, and process owner.
- Codex / Code Planning Thread: decomposes work, prepares task JSON, reviews state.
- Claude Code Executor: runs bounded implementation tasks in isolated worktrees.
- Reviewer / Acceptance Thread: reviews PRs and validation evidence; may request follow-up work.
- Issue Compiler / Task Planner: converts issue, PR, CI failure, or human prompt into controlled task JSON.
- Runner / Orchestrator: launches workers and records local runtime artifacts.
- Backend Owner: owns backend/API/runtime work in lian-platform-server.
- Frontend Owner: owns frontend/mobile web work in lian-mobile-web.
- Ops Executor: performs controlled CI, runner, workflow, and operational tasks.
- Documentation Steward: maintains docs, role definitions, prompts, schemas, and playbooks.

See `ROLE_RESPONSIBILITIES.md` for the detailed matrix.
