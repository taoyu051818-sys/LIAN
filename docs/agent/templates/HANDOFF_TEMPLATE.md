# Handoff: <task-name>

## Current source check

Record the current sources checked before writing this handoff:

- Current code on `main`:
- Recent merged PRs checked:
- Root `README.md` / `package.json` checked:
- Relevant override files checked:
  - `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`
  - `docs/agent/references/HANDOFFS_OVERRIDE_2026-05-05.md`
  - other relevant override files:

If this handoff updates or contradicts an old task/handoff/contract, state exactly what is superseded.

## Summary

What changed in 3-5 bullet points.

- ...
- ...
- ...

## Files changed

- `path/to/file`: reason for change

## Repository and ownership notes

- Repository touched: `lian-platform-server`
- Owned area touched: backend/API/runtime / Redis object-native / NodeBB / auth/session / uploads/image proxy / map data APIs / backend validation / other:
- Frontend/UI/runtime-lane changes needed? If yes, link the frontend task or handoff in `lian-mobile-web`.

## API or contract changed

If none, write "None."

Before claiming contract status, check current route registry, backend handlers, frontend callers if relevant, and `docs/agent/references/CONTRACTS_OVERRIDE_2026-05-05.md`.

- `GET /api/example`: new/changed behavior ...

## Data or state changed

If none, write "None."

Do not assume file-backed JSON is the current runtime data model. Describe Redis object-native, migration/rollback, or persisted data implications against the current root README and code.

## How to verify

1. Step-by-step verification instructions
2. Current package commands or curl/browser steps
3. Expected results

## Test result

Paste command outputs or summarize test results. Use current `package.json` scripts.

```bash
npm run check
# output: ...
```

## Known risks

- Risk 1: description
- Risk 2: description

## Not done

- Things this task intentionally did not complete
- Follow-up items for the next task

## Acceptance note

This handoff is not durable acceptance. Reviewer validation must be recorded separately in the task board, task doc, PR, or a newer PR-derived status file.

## Next suggested task

- Suggested next task name and brief description
