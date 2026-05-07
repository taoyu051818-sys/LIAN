# Frontend Claude Code Orchestration Handoff - 2026-05-07

This note records the current frontend Claude Code batch orchestration state after the repository split.
It is intentionally stored in the backend/control repository so the prompt runner and operating rules can be
reused without depending on one local terminal history.

## Current state

- Frontend repository: `taoyu051818-sys/lian-mobile-web`.
- Backend/control repository: `taoyu051818-sys/lian-platform-server`.
- GitHub CLI is the required way for workers to read issues and PRs.
- One task must map to one worktree, one branch, and one PR.
- Runtime logs and prompt snapshots remain local and must not be committed.

## What worked

- Docs-only work is suitable for short, bounded task prompts when the target file is explicit.
- The docs batch produced independent PRs for G2/G3/G4/G5/G6/G7/G8/G10/G12.
- Those PRs were scoped to documentation and used `npm run check` as validation.
- The docs worker prompt is reusable after tightening PR-link and footer rules.

## Problems found

1. Docs PR bodies may close broad implementation issues by accident.

   Docs-only workers must not use `Closes` unless the linked issue is explicitly documentation-only.
   Prefer `Related to` for implementation or tracking issues.

2. Some PR bodies included tool-branding footers.

   Workers must not add `Generated with Claude Code` or similar footers to commits, docs, or PR bodies.

3. PR URL output was not stable.

   Workers must push the branch, create or find the PR, and print a stable final `PR URL:` line.

4. Code/infra prompts were not strict enough for guard failures.

   PR #170 changed a runtime-sensitive script and failed `ops:guard` because the required inventory/docs
   update was not included. Code/infra prompts must require `npm run ops:guard`, and guard failures must be
   fixed before commit unless the PR is intentionally blocked.

5. Windows `Start-Process` argument passing is fragile for long prompt text.

   The runner should pass prompt and system prompt as file paths where possible, then read them inside the
   child PowerShell process before invoking `claude.exe`.

## Rules to keep

- Use `gh issue view` and `gh pr view`; do not fetch GitHub web pages.
- Do not print auth status details, tokens, secrets, or credentials.
- Do not share a worktree across concurrent Claude Code workers.
- Do not run multiple workers against the same high-conflict file group.
- Do not let workers silently create duplicate PRs for an existing branch.

## Prompt source

Reusable prompt and launcher files are stored under:

```text
ops/agent-prompts/lian-mobile-web/
```

Local runtime logs should stay outside git, for example:

```text
F:\26.3.13\llm_io_logs
```

## Next recommended work

- Fix #170 through a dedicated infra worker that updates the guard inventory/docs.
- Continue docs-only backlog with low-conflict PRs.
- Only start code workers after checking the merge state of related frontend PRs.
- Keep package/workflow/http/feed/map/detail/profile file groups serialized.
