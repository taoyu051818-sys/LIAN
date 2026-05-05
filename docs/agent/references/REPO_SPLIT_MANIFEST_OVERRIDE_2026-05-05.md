# Repo Split Manifest Override - 2026-05-05

This file overrides stale active-ownership readings in `repo-split-manifest.json`.

`repo-split-manifest.json` is a generated export manifest from 2026-05-04. It is useful as split-history evidence, but it is not the current file ownership source of truth.

## Current authority

1. Current code on `main`.
2. Merged GitHub PRs.
3. Current root `README.md`.
4. `PR_DERIVED_STATUS_2026-05-05.md`.
5. File ownership and project file index overrides.
6. This override file.
7. `repo-split-manifest.json` as historical export manifest only.

## Current correction

| Manifest reading | Current correction |
|---|---|
| `generatedAt` is 2026-05-04 and source/target paths reference `/opt/lian-mobile-web`. | Treat as historical export metadata from the split process. |
| Copied file list includes old backend file inventory and byte sizes. | Current backend code on `main` is authoritative, not copied byte sizes from the export. |
| Copied docs include old numbered docs, domains, handoffs, and tasks. | Current dated override files supersede old copied docs where they conflict. |
| Generated package metadata and validation scripts are listed as split artifacts. | Current root `package.json` is authoritative for scripts and package metadata. |
| `scripts/smoke-frontend.js` is skipped as frontend-only. | Correct as ownership context, but current frontend verification must be checked in `lian-mobile-web`. |
| Manifest does not know about later backend route registry/docs automation PRs. | Use current code and PR-derived status for route/docs guardrails. |

## Safe usage

Use `repo-split-manifest.json` only to answer:

- what was exported during the split process;
- which files were copied, skipped, or generated at that moment;
- what the split script considered backend vs frontend on 2026-05-04.

Do not use it to answer:

- what files exist now;
- what repo owns a file now;
- what scripts should be run now;
- what docs are current now;
- what backend route/data model is current now.

## Current ownership pointer

Use these instead for current planning:

- `README.md`
- `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`
- `docs/agent/references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md`
- `docs/agent/references/PROJECT_FILE_INDEX_OVERRIDE_2026-05-05.md`
- `docs/agent/references/ARCHITECTURE_WORKPLAN_OVERRIDE_2026-05-05.md`
