# lian-mobile-web Claude Code Batch Prompts

Orchestration system for parallel Claude Code workers against `taoyu051818-sys/lian-mobile-web`.

Runtime snapshots and logs must stay outside git. Do not commit `llm_io_logs`, tokens, auth status output,
or full local run transcripts.

## Architecture

```
Task JSON --> batch-launch.ps1 --> worktree per task --> run-claude-print.ps1 --> Claude Code
                                              |
                                              +--> logs: prompt.txt, out.log, err.log, done.txt, meta.json
                                              +--> manifest.json
                                                      |
                                              wait-claude-batch.ps1 --> poll done files --> wait-summary.json
                                                      |
                                              audit-claude-batch.ps1 --> boundary/PR/dirty checks --> audit-summary.json/md
                                                      |
                                              PR review / serial aggregator
```

Each task runs in its own git worktree on its own branch. The system enforces one worker = one task = one branch = one PR.

## Files

| File | Purpose |
|------|---------|
| `claude-docs-system.md` | System prompt for docs-only workers |
| `claude-code-system.md` | System prompt for code/infra workers |
| `docs-next-tasks.json` | Next low-conflict docs-only tasks |
| `infra-fix-tasks.json` | Targeted infra fix tasks |
| `task.schema.json` | JSON Schema for task file entries |
| `batch-launch.ps1` | Launches tasks into independent worktrees |
| `run-claude-print.ps1` | Child runner used by batch-launch |
| `wait-claude-batch.ps1` | Polls done files, writes wait summary |
| `audit-claude-batch.ps1` | Postflight audit: boundaries, PRs, dirty trees |

## Prompt transport

- **System prompt**: passed via `--append-system-prompt-file` (file path, not stdin).
- **Task prompt**: piped via stdin to Claude Code `--print` mode.
- Both are UTF-8. The system prompt is snapshotted once per batch run.

## Parallel fan-out

Create a task JSON file with multiple entries. Each entry gets its own worktree, branch, log files, and Claude process.

```json
[
  { "name": "task-1", "wt": "task-1", "branch": "cc/docs/task-1", "prompt": "...", "type": "docs", "conflictGroup": "docs" },
  { "name": "task-2", "wt": "task-2", "branch": "cc/docs/task-2", "prompt": "...", "type": "docs", "conflictGroup": "docs" }
]
```

Tasks in the same `conflictGroup` (except `docs`, `review`, `planning`) are blocked from parallel launch by default.

## Wait modes

### -Wait (inline)

Blocks the current terminal until all tasks finish or timeout.

```powershell
& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\docs-next-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-docs-system.md" `
  -Wait -PollSeconds 20 -TimeoutMinutes 60
```

### -LaunchMonitor (background)

Spawns wait-claude-batch.ps1 as a hidden background process. Returns immediately with MONITOR_PID.

```powershell
& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\docs-next-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-docs-system.md" `
  -LaunchMonitor -PollSeconds 30 -TimeoutMinutes 120
```

## Wait standalone

```powershell
& "$PromptRoot\wait-claude-batch.ps1" `
  -ManifestPath "F:\26.3.13\llm_io_logs\claude-batch-20260507-1430.manifest.json" `
  -PollSeconds 20 -TimeoutMinutes 60
```

Add `-AuditOnComplete` to automatically run the audit script after all tasks complete.

## Audit

Run boundary, PR, and worktree checks against a completed batch:

```powershell
& "$PromptRoot\audit-claude-batch.ps1" `
  -ManifestPath "F:\26.3.13\llm_io_logs\claude-batch-20260507-1430.manifest.json" `
  -RepoFullName "taoyu051818-sys/lian-mobile-web"
```

Options:
- `-SkipPrChecks`: skip GitHub PR existence checks.
- `-Strict`: treat dirty worktrees as failures.
- `-RepoFullName`: required for PR URL discovery via `gh`.

Exit code 0 = all tasks pass. Non-zero = at least one failure.

## Serial aggregator workflow

After parallel workers pass audit and CI:

1. Create a follow-up task JSON with a single aggregator task.
2. Set `allowedFiles` to shared files only (e.g., `README.md`, index docs).
3. Launch with `batch-launch.ps1` using the code system prompt.
4. The aggregator reads worker outputs and PRs, then updates shared files.

## Local artifacts

All artifacts are written to `$LogDir` (default `F:\26.3.13\llm_io_logs`):

| Artifact | Pattern |
|----------|---------|
| Prompt | `claude-<task>-<stamp>.prompt.txt` |
| Stdout | `claude-<task>-<stamp>.out.log` |
| Stderr | `claude-<task>-<stamp>.err.log` |
| Done marker | `claude-<task>-<stamp>.done.txt` |
| Task meta | `claude-<task>-<stamp>.meta.json` |
| System snapshot | `claude-system-<stamp>.txt` |
| Manifest | `claude-batch-<stamp>.manifest.json` |
| Wait summary | `claude-batch-<stamp>.wait-summary.json` |
| Audit summary | `claude-batch-<stamp>.audit-summary.json` |
| Audit report | `claude-batch-<stamp>.audit-summary.md` |
| Latest stamp | `claude-batch-latest.txt` |

## Safety rules

- No `llm_io_logs` in git.
- No token, auth, `.env`, or local transcript content.
- One worktree per worker, no shared branches.
- `conflictGroup` governs parallelism. Same-group non-doc tasks blocked by default.
- `forbiddenFiles` patterns are enforced by audit; touching them fails the audit.
- `allowedFiles` when non-empty restricts the worker to those paths.
- Docs tasks must not modify `src/**`, `server.js`, `data/**`, `package.json`, `package-lock.json`.
- Review/planner tasks must not modify project files unless `allowedFiles` permits.

## Example commands

### Parallel docs workers

```powershell
$PromptRoot = 'F:\26.3.13\lian-current\lian-platform-server\ops\agent-prompts\lian-mobile-web'

& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\docs-next-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-docs-system.md" `
  -LaunchMonitor -RepoFullName "taoyu051818-sys/lian-mobile-web" -AuditOnComplete
```

### Wait only (no audit)

```powershell
& "$PromptRoot\wait-claude-batch.ps1" `
  -ManifestPath "F:\26.3.13\llm_io_logs\claude-batch-20260507-1430.manifest.json"
```

### Audit existing manifest

```powershell
& "$PromptRoot\audit-claude-batch.ps1" `
  -ManifestPath "F:\26.3.13\llm_io_logs\claude-batch-20260507-1430.manifest.json" `
  -RepoFullName "taoyu051818-sys/lian-mobile-web" -Strict
```

### Infra fix (code worker)

```powershell
& "$PromptRoot\batch-launch.ps1" `
  -TaskFile "$PromptRoot\infra-fix-tasks.json" `
  -SystemPromptFile "$PromptRoot\claude-code-system.md" `
  -Wait -RepoFullName "taoyu051818-sys/lian-mobile-web" -AuditOnComplete
```

## Operating rules

- One worker = one task = one branch = one PR.
- Do not run workers that touch the same high-conflict file group in parallel.
- Docs-only workers must prefer `Related to` instead of `Closes`.
- Code/infra workers must run `npm run ops:guard` and fix required inventory/docs updates before commit.
