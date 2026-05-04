# Task Board Delta - 2026-05-04

This reference records task-board corrections that should be applied to `docs/agent/05_TASK_BOARD.md` once the full file can be edited safely.

Reason for separate delta file:

- `05_TASK_BOARD.md` is long and GitHub connector output is truncated in this environment.
- Updating it through the current connector requires replacing the whole file.
- To avoid data loss, do not overwrite the task board from a truncated copy.

## Required corrections

### 1. DB migration status is stale

Current task-board wording still says:

```text
`db-migration-rfc` | Ready / P1 | Design future DB migration without implementing it.
```

This is no longer accurate as the complete storage picture because Redis storage first cut has already merged.

Replace the active meaning with:

```text
Redis storage first cut: merged.
Redis rollout/production validation: pending.
Long-term PostgreSQL/full relational migration: still deferred/RFC-only.
```

Suggested replacement row:

| Task | Status | Owner | Goal | Acceptance |
|---|---|---|---|---|
| `redis-storage-rollout-validation` | **Ready / P1** | Backend / DevOps | Validate the merged Redis storage first cut before enabling it outside controlled rollout. | `npm run migrate:redis -- --clear` and `npm run verify:redis` pass against the intended LIAN Redis DB/key prefix; `LIAN_STORAGE_MODE=redis` smoke passes; JSON/JSONL files are retained as rollback snapshots. |
| `db-migration-rfc` | **Later / P2 RFC** | Architecture / backend | Design the future relational database model after Redis storage rollout is validated. | RFC separates Redis operational storage, long-term relational schema, audience/membership data model, audit logs, and migration/rollback order. No PostgreSQL implementation in the current stabilization sprint. |

### 2. Paused migration language needs precision

Current paused list says:

```text
full PostgreSQL migration implementation;
```

Keep this pause, but add a note that Redis storage first cut is already merged and is a separate backend rollout/validation task.

Suggested note:

```text
Redis storage first cut is merged and should be validated as an ops/storage rollout. Full PostgreSQL or relational migration remains paused.
```

### 3. Add recent completed docs tasks

The following docs updates were completed after the old task-board cleanup entry:

- `docs/agent/references/GITHUB_RECENT_UPDATES_2026-05-04.md` refreshed for Redis, Vue primitives, frontend CI, and deploy webhook.
- `docs/agent/PROJECT_FILE_INDEX.md` updated for dual repos, Redis storage, Vue primitives, frontend CI, and Redis migration scripts.
- `docs/agent/04_DECISIONS.md` updated with 2026-05-04 Redis and Vue foundation decisions.
- `docs/agent/03_FILE_OWNERSHIP.md` updated with Redis/Vue ownership and hard-review rules.

Suggested Done entry:

```markdown
### Docs Refresh For Redis Storage And Vue Foundation

Recent docs refresh after the Redis storage and Vue primitives merges.

Changed files:

- `docs/agent/references/GITHUB_RECENT_UPDATES_2026-05-04.md`
- `docs/agent/PROJECT_FILE_INDEX.md`
- `docs/agent/04_DECISIONS.md`
- `docs/agent/03_FILE_OWNERSHIP.md`

Status: **Done / Accepted for docs baseline** - active project index, ownership, decisions, and recent update summary now reflect Redis storage first cut, Vue UI primitives, frontend CI, and deploy webhook changes.
```

## Do not do

- Do not delete old task-board history while applying this delta.
- Do not mark Redis production rollout as Done until `migrate:redis`, `verify:redis`, and runtime smoke are run against the intended environment.
- Do not reclassify full PostgreSQL migration as active implementation.
- Do not overwrite `05_TASK_BOARD.md` from a truncated copy.

## Related references

- `docs/agent/references/GITHUB_RECENT_UPDATES_2026-05-04.md`
- `docs/agent/04_DECISIONS.md`
- `docs/agent/03_FILE_OWNERSHIP.md`
- `docs/agent/PROJECT_FILE_INDEX.md`
