# lian-mobile-web Claude Code Batch Prompts

This directory contains reusable prompt source files for orchestrating bounded Claude Code workers against
`taoyu051818-sys/lian-mobile-web`.

Runtime snapshots and logs must stay outside git. Do not commit `llm_io_logs`, tokens, auth status output,
or full local run transcripts.

## Files

- `claude-docs-system.md`: shared system prompt for docs-only workers.
- `claude-code-system.md`: shared system prompt for code and infra workers.
- `docs-next-tasks.json`: next low-conflict docs-only tasks.
- `infra-fix-tasks.json`: targeted infra fix tasks.
- `batch-launch.ps1`: launches tasks into independent worktrees.
- `run-claude-print.ps1`: child runner used by `batch-launch.ps1`.

## Local usage

Adjust local paths when needed:

```powershell
$PromptRoot = 'F:\26.3.13\lian-current\lian-platform-server\ops\agent-prompts\lian-mobile-web'

& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\docs-next-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-docs-system.md"

& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\infra-fix-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-code-system.md"
```

## Operating rules

- One worker = one task = one branch = one PR.
- Do not run workers that touch the same high-conflict file group in parallel.
- Docs-only workers must prefer `Related to` instead of `Closes`.
- Code/infra workers must run `npm run ops:guard` and fix required inventory/docs updates before commit.
