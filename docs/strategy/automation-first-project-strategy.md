# Automation-First Project Strategy

The project should prefer executable automation over manually maintained indexes, checklists, and broad documentation edits.

The goal is to reduce human synchronization mistakes and reduce agent read/write volume. Agents and developers should ask the repository through scripts whenever possible, instead of repeatedly scanning large files or editing hand-maintained lists.

## Strategy

Use generated inventories, manifests, and contract checks when information can be derived from the repository tree or source files.

Manual lists are allowed only when the list expresses product intent that cannot be derived from code or files. If the list only mirrors files, routes, docs, scripts, or config names, it should be generated or checked automatically.

## Documentation inventory

Do not maintain a documentation list by hand in `package.json`, README, or agent docs.

Use:

```bash
npm run docs:list
```

This generates the current documentation inventory from `docs/**/*.md`.

The docs maintenance guard is part of:

```bash
npm run check
```

It prevents reintroducing a hand-maintained `lian.docs` list in `package.json`.

## Agent reading strategy

Agents should prefer targeted commands over broad file reads.

Use scripts first:

```bash
npm run docs:list
npm run check
npm run test:route-registry
npm run test:route-manifest
```

Only open large files after a script identifies the exact file or section that needs attention.

## When to add automation

Add or extend automation when a task introduces any of these patterns:

- A hand-maintained list of files, docs, routes, scripts, or handlers
- A repeated verification step that can be scripted
- A routing, manifest, or registry relationship that can drift
- A project rule that depends on every contributor remembering it
- A large document that agents keep rereading to find a small answer

## Automation requirements

A new automation rule should include:

1. a script under `scripts/`
2. a package script name when it is intended for humans or agents
3. integration into `npm run check` when it protects correctness
4. a short documentation note explaining what the script replaces

## Source of truth rules

- Files under `docs/` are discovered from the repository tree.
- Routes are checked through route manifest and registry contract tests.
- Code smells are checked by `scripts/check-code-smells.js`.
- Context sync docs are checked by `scripts/check-context-docs.js`.
- Documentation maintenance is checked by `scripts/check-docs-maintenance.js`.

Do not duplicate these sources of truth into static JSON lists.

## Preferred workflow

Before editing broad project docs, run:

```bash
npm run docs:list
```

Before merging backend changes, run:

```bash
npm run check
```

Before adding a new manual checklist, ask whether the checklist can become a script, generated inventory, or contract test.

## Practical effect

This strategy should make future work cheaper and safer:

- fewer stale docs indexes
- fewer accidental omissions when new files are added
- fewer conflicts from agents editing the same large docs
- fewer repeated reads of large files
- clearer executable project state through scripts
