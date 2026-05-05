# Agent Rules Quick Reference

Every Agent session must read this file before making changes, but this file is not above current code, merged GitHub PRs, root README, package.json, or dated override files.

## Startup checklist

Read these files at the start of every task, in this order:

1. Current code on `main`, root `README.md`, and `package.json`.
2. Recent merged GitHub PRs for the repo and task area.
3. `docs/agent/README.md` - source-of-truth order and docs index.
4. `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`.
5. Current dated override files relevant to the task:
   - `docs/agent/references/DECISIONS_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/TASK_BOARD_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/DOMAIN_DOCS_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/TASK_DOCS_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/HANDOFFS_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/CONTRACTS_OVERRIDE_2026-05-05.md`
   - `docs/agent/references/REPO_SPLIT_MANIFEST_OVERRIDE_2026-05-05.md`
6. `docs/agent/00_AGENT_RULES.md` - this file.
7. Older numbered docs, domain docs, task docs, handoffs, contracts, and split manifest only as historical/context material after override checks.

Do not start from `ARCHITECTURE_WORKPLAN.md`, `05_TASK_BOARD.md`, `03_FILE_OWNERSHIP.md`, `04_DECISIONS.md`, `tasks/*`, `handoffs/*`, `contracts/*`, or `repo-split-manifest.json` without checking the override chain first.

## Current repo facts

- `lian-platform-server` owns backend/API/runtime, Redis object-native state, NodeBB integration, auth/session, uploads, image proxy, map/data APIs, and backend validation.
- `lian-mobile-web` owns frontend runtime lanes, frontend UI, Vue canary, legacy/static rehearsal, frontend task-board UI, assets, design docs, and frontend docs.
- `lian-mobile-web-full` is historical only.
- Backend runtime data model follows the root README: Redis object-native unless current env/code explicitly proves otherwise.
- Route changes must satisfy `api-route-registry.js` and route-registry tests.

## Thread role split

This project uses a two-thread workflow by default:

| Thread | Responsibility | Can implement? | Required output |
|---|---|---:|---|
| Codex / code thread | Planning, task decomposition, architecture judgement, review, acceptance, documentation status | No, unless the user explicitly asks this thread to patch | Review findings, task docs, handoff updates, acceptance decision |
| Claude Code thread | Bounded implementation against an approved task doc | Yes | Patch, verification output, handoff summary |

Rules:

- The Codex / code thread owns scope control. It should write or update task docs before large implementation work starts.
- The Claude Code thread owns execution. It should not broaden scope beyond the task doc without handing back to the Codex / code thread.
- Review findings from the Codex / code thread are blockers until fixed or explicitly waived in docs.
- A lane is not accepted because implementation reports "done"; it is accepted only after reviewer validation is recorded.
- If a task touches high-conflict files, the Codex / code thread must define exact allowed files and validation commands before execution.
- If implementation discovers a product or architecture ambiguity, stop and write a handoff instead of silently choosing a broad direction.

## Forbidden actions

- Do NOT format or pretty-print runtime JSON data files.
- Do NOT reformat code outside your task scope.
- Do NOT add frameworks or dependencies without approval.
- Do NOT commit `.env`, API keys, or secrets.
- Do NOT edit frontend runtime/UI files in this repo; use `lian-mobile-web`.
- Do NOT bypass `createNodebbTopicFromPayload()` / `handleAiPostPublish()` to call NodeBB directly.
- Do NOT write post metadata directly from AI code without the approved service path.
- Do NOT treat old task docs, handoffs, contracts, or split manifests as current truth without override and code checks.
- Do NOT do large rewrites unless the task explicitly says so.
- Do NOT mark a lane as accepted from the executor thread. Only reviewer validation can move it to accepted.

## High-conflict backend files

| File / area | Level | Notes |
|---|---|---|
| `server.js` | hard-review | Runtime entrypoint. |
| `src/server/feed-service.js` | hard-review | Feed assembly/scoring surface. |
| `src/server/post-service.js` | hard-review | Publishing, metadata, interactions. |
| `src/server/ai-light-publish.js` | hard-review | AI publish path; no direct unsafe metadata writes. |
| `src/server/api-router.js` | hard-review | Route dispatch; keep synchronized with route registry. |
| `src/server/api-route-registry.js` | hard-review | Current route registry boundary. |
| `src/server/map-v2-service.js` | hard-review | Map data/API; geometry/data changes are human-assisted. |
| `src/server/audience-service.js` | hard-review | Audience enforcement. |
| `data/**` | hard-review | Runtime/migration/rollback context; avoid bulk edits. |
| `package.json` | hard-review | Current check/verify scripts. |
| `docs/agent/**` | documentation | Must follow current source-of-truth order. |

Frontend-owned files such as Vue/Vite source, legacy/static UI, task-board UI, frontend ports 4300/4301, and frontend runtime supervisor belong in `lian-mobile-web`.

## Parallel development boundaries

These backend areas can be developed in parallel with minimal conflict when scoped correctly:

- Route-registry-safe endpoint additions.
- Pure helper extraction with tests.
- Docs automation and generated docs checks.
- Narrow audience write-side audits.
- Backend verification script hardening.

These areas need coordination:

- Feed service + post service changes.
- AI publish + metadata write changes.
- Route dispatch + route registry changes.
- Redis object-native storage + migration/cleanup changes.
- Map data/API geometry changes; keep human-assisted.
- API contract changes that require frontend updates.

## Small task vs large task

| | Small task (typo, config, one-line fix) | Large task (new feature, multi-file, contract/runtime change) |
|---|---|---|
| Task doc | not required | required in `docs/agent/tasks/` or a dated task addendum |
| Handoff | chat summary is enough | must write/update `docs/agent/handoffs/` |
| Plan mode | not needed | required for 3+ files or touching runtime/API/storage contracts |
| Verification | changed-file check plus relevant package script | current `npm run check` plus targeted tests; `npm run verify` when env dependencies are available |
| Branch lifetime | hours | 1-3 days |

## Validation commands

Use current `package.json` first. Current backend top-level checks include:

```bash
npm run check
npm run verify
npm run test:routes
npm run test:route-registry
npm run docs:list
```

For changed JavaScript files, add targeted syntax checks as needed:

```bash
node --check server.js
node --check src/server/<changed-file>.js
```

If a referenced script does not exist, say so in your handoff and check current `package.json` before inventing replacements.
