# Context Sync Protocol

This repository is often touched by multiple contributors and agents at the same time. The most expensive mistakes are not small syntax mistakes; they are stale-context mistakes: editing from an old branch, trusting old search results, duplicating another contributor's scope, or deploying commands in the wrong repository.

## Required workflow before editing

1. Start from the latest `main`.
2. Record the base commit in the PR description.
3. Search for the relevant code, then verify every important hit by opening the actual file on `main`.
4. Declare the exact files, functions, routes, or scripts you will handle.
5. Declare what you are intentionally not handling.
6. Avoid broad cleanups unless the PR title and scope say so.

## Search result rule

Search results are hints, not truth.

A search hit can be stale, indexed from an older commit, or match a branch that is not `main`. Before changing code, verify with one of these:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
git grep '<term>' -- <path>
```

When using repository tools, fetch the file from `ref=main` before making a conclusion.

## Branch rule

Use a focused branch name:

```text
agent/<short-scope>
```

Examples:

```text
agent/code-guard
agent/context-sync-protocol
agent/static-fallback
```

Do not reuse an old branch for unrelated work.

## PR scope rule

Every PR must state:

- Base commit
- Files/modules touched
- Functions/routes/scripts touched
- Explicitly not handled
- Possible overlap with other work
- Validation commands and results

For code-smell cleanup, always state the exact bad smell class being handled. Example:

```text
Scope: only NodeBB env parsing in test maintenance scripts.
Not handled: runtime API route refactor, data-store split, NodeBB client retry policy.
```

## Merge verification rule

After merge, verify the actual files that entered `main`.

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline -5
git diff --name-only HEAD~1 HEAD
```

Do not assume every file from a draft or intermediate branch entered `main`.

## Production sync rule

Before running server commands, confirm the repository path and remote.

```bash
pwd
git remote -v
```

Backend repository path:

```text
/opt/lian-platform-server
```

Frontend repository path:

```text
/opt/lian-mobile-web
```

Never run backend sync commands from the frontend repository.

## Agent handoff rule

When handing work to another contributor or agent, include:

- Current branch
- Base commit
- Open PR number, if any
- Files already changed
- Files intentionally avoided
- Last validation command and result
- Server path touched, if any

## Good default validation

For normal backend work:

```bash
npm run check
```

For deployment-sensitive backend work:

```bash
npm run verify:deploy-safe
```
