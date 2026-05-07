# Issue Solving Playbook

This playbook defines the controlled flow from issue intake to acceptance. Every task follows this flow regardless of size.

## Flow overview

```
Intake → Classify → Risk → Conflict Group → Files → Validation → Task JSON → Worker → Audit → PR Review → Acceptance
```

## Step 1: Intake

A task enters the system from one of these sources:

- GitHub issue
- GitHub PR (review finding or follow-up)
- CI failure
- Human prompt (verbal, chat, or written instruction)

Record the source, link (if applicable), and the raw request.

## Step 2: Classify task type

Assign exactly one type:

| Type | Description |
|---|---|
| `docs` | Documentation only. No runtime code changes. |
| `infra` | CI, deployment, scripts, tooling, or operational changes. |
| `frontend` | Changes to frontend code in `lian-mobile-web`. |
| `backend` | Changes to backend/API/runtime code in `lian-platform-server`. |
| `review` | Review-only. No implementation. Audit, validation, or acceptance task. |
| `planner` | Planning, architecture, task decomposition. No implementation. |

## Step 3: Assign risk level

| Risk | Criteria |
|---|---|
| `low` | Single file, no runtime impact, no API change, no data schema change. |
| `medium` | 2-3 files, limited runtime impact, or touches one high-conflict area. |
| `high` | 4+ files, multiple high-conflict areas, API contract change, data schema change, or affects NodeBB posting / feed / auth / audience. |

## Step 4: Assign conflict group

Conflict groups define which files can be touched in parallel. A task belongs to exactly one group.

| Group | Files |
|---|---|
| `docs` | `docs/agent/**` only. |
| `scripts` | `scripts/**`, `package.json` (script section only). |
| `feed` | `feed-service.js`, `post-metadata.json`, related helpers. |
| `publish` | `post-service.js`, `ai-light-publish.js`, `ai-post-preview.js`, publish routes. |
| `auth` | `auth-service.js`, `auth-routes.js`, session/config helpers. |
| `audience` | `audience-service.js`, audience routes, permission helpers. |
| `map` | `map-v2-service.js`, map routes, geometry data. |
| `channel` | `channel-service.js`, channel routes, message helpers. |
| `admin` | `admin-routes.js`, admin routes. |
| `infra` | CI config, deploy scripts, PM2, gateway. |
| `frontend` | Files in `lian-mobile-web` (separate repo). |

## Step 5: Define allowed / forbidden files

Based on conflict group and risk, define:

- `allowedFiles`: exact list of files the worker may modify.
- `forbiddenFiles`: files the worker must not touch (always includes `server.js`, `data/**`, `.env`, `llm_io_logs/**` unless explicitly overridden).

For high-risk tasks, the reviewer must approve the file list before execution.

## Step 6: Define validation

Validation commands depend on task type:

| Type | Minimum validation |
|---|---|
| `docs` | `npm run check` |
| `infra` | `npm run check` + relevant infra scripts |
| `frontend` | Frontend repo validation (separate) |
| `backend` | `npm run check` + `npm run verify` (if env available) |
| `review` | No code validation. Output is review findings. |
| `planner` | No code validation. Output is plan or task doc. |

## Step 7: Generate task JSON

Every task gets a structured JSON record before execution:

```json
{
  "taskId": "task-YYYYMMDD-NNN",
  "type": "backend",
  "risk": "medium",
  "conflictGroup": "feed",
  "source": "github-issue-123",
  "title": "Fix feed image fallback for missing Cloudinary URLs",
  "allowedFiles": ["src/server/feed-service.js"],
  "forbiddenFiles": ["server.js", "data/**", ".env"],
  "validation": ["npm run check", "npm run verify"],
  "acceptanceCriteria": [
    "Feed cards render fallback image when Cloudinary URL is missing",
    "No regression in existing feed tests"
  ],
  "assignedTo": "claude-code-worker"
}
```

## Step 8: Launch worker

The worker receives the task JSON and executes within the defined boundaries:

1. Read current code and relevant docs.
2. Implement changes within `allowedFiles` only.
3. Run validation commands.
4. Commit, push, and open or update a PR.
5. Output handoff summary with: files changed, validation results, known risks.

## Step 9: Audit run result

The reviewer audits the worker output:

1. PR diff matches `allowedFiles` scope.
2. Validation commands passed.
3. No forbidden files were modified.
4. Handoff summary is complete.
5. Risk assessment is accurate.

If audit fails, generate a follow-up task (Step 11).

## Step 10: Review PR

The reviewer performs code review:

1. Code correctness and quality.
2. No security vulnerabilities introduced.
3. No scope creep beyond task definition.
4. API contract consistency (if backend task).
5. Data schema safety (if touching data files).

Request changes or approve.

## Step 11: Generate follow-up task JSON if needed

If review or audit reveals issues, generate a new task JSON following Steps 2-7. Link it to the original task.

## Step 12: Acceptance

The reviewer or Human Owner records acceptance:

- Update task status in `05_TASK_BOARD.md`.
- Record validation result in the task doc or handoff.
- Only then is the task considered done.

**Handoff is not acceptance. Acceptance requires explicit reviewer validation.**

---

## Examples

### Example 1: Docs-only task

**Intake**: "Update the knowledge base with current project state."

```json
{
  "taskId": "task-20260507-001",
  "type": "docs",
  "risk": "low",
  "conflictGroup": "docs",
  "source": "human-prompt",
  "title": "Create knowledge base entrypoint and project knowledge doc",
  "allowedFiles": [
    "docs/agent/knowledge/README.md",
    "docs/agent/knowledge/CURRENT_PROJECT_KNOWLEDGE.md",
    "docs/agent/knowledge/ISSUE_SOLVING_PLAYBOOK.md"
  ],
  "forbiddenFiles": ["server.js", "src/server/**", "data/**", "package.json"],
  "validation": ["npm run check"],
  "acceptanceCriteria": [
    "knowledge/README.md exists with source-of-truth order",
    "CURRENT_PROJECT_KNOWLEDGE.md documents product shape and boundaries",
    "ISSUE_SOLVING_PLAYBOOK.md defines controlled flow with examples",
    "npm run check passes"
  ],
  "assignedTo": "claude-code-worker"
}
```

### Example 2: Infra CI fix task

**Intake**: "CI is failing on the route-registry test."

```json
{
  "taskId": "task-20260507-002",
  "type": "infra",
  "risk": "medium",
  "conflictGroup": "scripts",
  "source": "ci-failure",
  "title": "Fix route-registry test failure in CI",
  "allowedFiles": [
    "scripts/test-route-registry.js",
    "src/server/api-route-registry.js"
  ],
  "forbiddenFiles": ["server.js", "data/**", ".env"],
  "validation": ["npm run check", "npm run test:route-registry"],
  "acceptanceCriteria": [
    "npm run test:route-registry passes locally",
    "CI passes on the PR"
  ],
  "assignedTo": "claude-code-worker"
}
```

### Example 3: Frontend component task

**Intake**: "Add a loading spinner to the feed tab."

```json
{
  "taskId": "task-20260507-003",
  "type": "frontend",
  "risk": "low",
  "conflictGroup": "frontend",
  "source": "github-issue-456",
  "title": "Add loading spinner to feed tab",
  "allowedFiles": ["app.js", "styles.css"],
  "forbiddenFiles": ["server.js", "src/server/**", "data/**"],
  "validation": ["frontend repo validation"],
  "acceptanceCriteria": [
    "Feed tab shows spinner while loading",
    "Spinner hides after feed data loads"
  ],
  "assignedTo": "claude-code-worker",
  "repo": "lian-mobile-web"
}
```

### Example 4: Backend API task

**Intake**: "Add a new endpoint for batch post metadata lookup."

```json
{
  "taskId": "task-20260507-004",
  "type": "backend",
  "risk": "high",
  "conflictGroup": "feed",
  "source": "github-issue-789",
  "title": "Add batch post metadata lookup endpoint",
  "allowedFiles": [
    "src/server/api-router.js",
    "src/server/api-route-registry.js",
    "src/server/feed-service.js",
    "scripts/test-route-registry.js"
  ],
  "forbiddenFiles": ["server.js", "data/**", ".env"],
  "validation": ["npm run check", "npm run verify"],
  "acceptanceCriteria": [
    "GET /api/posts/metadata?ids=1,2,3 returns batch metadata",
    "Endpoint registered in api-route-registry.js",
    "Route registry test passes",
    "No regression in existing feed tests"
  ],
  "assignedTo": "claude-code-worker"
}
```

### Example 5: Review-only task

**Intake**: "Review the audience service for permission bypass risks."

```json
{
  "taskId": "task-20260507-005",
  "type": "review",
  "risk": "medium",
  "conflictGroup": "audience",
  "source": "human-prompt",
  "title": "Security review of audience service permission enforcement",
  "allowedFiles": [],
  "forbiddenFiles": [],
  "validation": [],
  "acceptanceCriteria": [
    "Review findings documented",
    "Bypass risks identified and classified",
    "Recommendations provided"
  ],
  "assignedTo": "reviewer"
}
```

### Example 6: Follow-up prompt generation task

**Intake**: Reviewer finds that the batch metadata endpoint (Example 4) does not handle empty IDs array.

```json
{
  "taskId": "task-20260507-006",
  "type": "backend",
  "risk": "low",
  "conflictGroup": "feed",
  "source": "review-followup-task-20260507-004",
  "title": "Handle empty IDs array in batch metadata endpoint",
  "allowedFiles": ["src/server/feed-service.js"],
  "forbiddenFiles": ["server.js", "data/**", ".env"],
  "validation": ["npm run check"],
  "acceptanceCriteria": [
    "Empty IDs array returns empty result, not error",
    "No regression"
  ],
  "assignedTo": "claude-code-worker"
}
```
