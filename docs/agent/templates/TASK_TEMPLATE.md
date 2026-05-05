# Task: <task-name>

## Current source check

Record the current sources checked before defining this task:

- Current code on `main`:
- Recent merged PRs checked:
- Root `README.md` / `package.json` checked:
- Relevant override files checked:
  - `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`
  - `docs/agent/references/DECISIONS_OVERRIDE_2026-05-05.md`
  - `docs/agent/references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md`
  - `docs/agent/references/TASK_BOARD_OVERRIDE_2026-05-05.md`
  - `docs/agent/references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md`
  - other relevant override files:

If this task resumes an old task/handoff/contract, explain what was revalidated and what is stale.

## Goal

One-sentence description of what this task achieves.

## Product scope

Which user or system flow does this task complete? What can the user do after this task that they cannot do before?

## Repository and ownership scope

- Repository: `lian-platform-server`
- Owned area: backend/API/runtime / Redis object-native / NodeBB / auth/session / uploads/image proxy / map data APIs / backend validation / other:
- Frontend/UI/runtime-lane changes required? If yes, create or reference a frontend task in `lian-mobile-web` instead of editing frontend code here.

## Allowed files

List every file this task may modify or create. Use current repo ownership, not old split-era docs.

- `src/server/...`
- `scripts/...`
- `docs/agent/tasks/<task-name>.md`

## Forbidden files

List files this task must NOT touch, even if it seems convenient.

- Frontend/UI/runtime-lane files in `lian-mobile-web`
- Runtime data files unless explicitly scoped and approved
- Any file outside this task's allowed list

## Data or state changes

Describe Redis object-native, migration/rollback, or persisted data implications. If none, write "None."

Do not assume file-backed JSON is the current runtime data model. Check root README and current env/code first.

## API or contract changes

Describe any new or modified API needs. If none, write "None."

Before changing API assumptions, check:

- current `api-route-registry.js`;
- current backend handler code;
- current frontend callers if relevant;
- `docs/agent/references/CONTRACTS_OVERRIDE_2026-05-05.md`.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Validation commands

Use current `package.json` first. Example backend checks:

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

If a referenced script does not exist, say so in the handoff and check current `package.json` before inventing replacements.

## Risks

- Risk 1: description and mitigation
- Risk 2: description and mitigation

## Rollback plan

How to undo this task if something goes wrong:

- Revert commit ...
- Remove file ...
- Restore previous runtime/API behavior ...
