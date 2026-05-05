# Project File Index Superseded Notice - 2026-05-05

`docs/agent/PROJECT_FILE_INDEX.md` is historical / superseded file-index context and must not be used as the current file index, runtime model, or repo ownership source by itself.

## Current rule

Before using `PROJECT_FILE_INDEX.md`, read these first:

1. `docs/agent/README.md`
2. `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`
3. `docs/agent/references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md`
4. `docs/agent/references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md`
5. `docs/agent/references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md`
6. `docs/agent/references/DOC_REVIEW_FINDINGS_2026-05-05.md`

## Why this notice exists

`PROJECT_FILE_INDEX.md` still contains split-era file ownership, old source-of-truth order, old frontend/backend cross-references, and runtime/storage statements that may conflict with the current root README and merged PRs.

## Safe usage

Use `PROJECT_FILE_INDEX.md` to understand:

- historical file grouping;
- split-era ownership intent;
- old route/data/docs organization.

Do not use it alone to decide:

- what repo owns a file today;
- what scripts should run today;
- whether Redis object-native or file mode is active today;
- what route registry or API contract is current;
- which docs are current source of truth.

## Direct edit note

A direct whole-file replacement was not used here because long file replacement can be unsafe through the GitHub contents tool. This sidecar notice provides an explicit marker without risking accidental truncation or overwrite.
