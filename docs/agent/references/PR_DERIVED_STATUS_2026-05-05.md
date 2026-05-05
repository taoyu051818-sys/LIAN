# PR-Derived Status - 2026-05-05

This file records the current backend state from merged GitHub PRs, not from older task-board text.

## Backend repo

Repository: `taoyu051818-sys/lian-platform-server`

Current state checked from recent merged PRs:

- Latest checked merged PR is #38.
- Backend runtime belongs here, not in `lian-mobile-web` or `lian-mobile-web-full`.
- `npm run check` now includes backend structure, encoding, code-smell guard, context docs guard, docs maintenance guard, generated automation docs check, and route registry contract test.
- `npm run verify` is the broad backend verification matrix.
- Docs inventory is generated through `npm run docs:list`.

## Recent backend PR meaning

| PR | Meaning |
|---|---|
| #38 | Added automation-first project strategy docs. |
| #37 | Added backend health/guardrails docs and docs inventory automation. |
| #36 | Slimmed `api-router.js`, added `api-route-registry.js`, and route registry contract tests. |
| #35 | Added context-sync docs check into `npm run check`. |
| #34 | Expanded backend quality guard rules. |
| #33 | Integrated backend code-smell guard into `npm run check`. |
| #32 | Backend-only static fallback now handles missing frontend assets cleanly. |
| #31 | Centralized config parsing in `config-schema.js`. |
| #30 | Hardened cleanup audience env parsing. |
| #29 | Hardened rewrite test env parsing. |
| #28 | Hardened audience setup env parsing. |
| #27 | Hardened NodeBB smoke env parsing. |
| #26 | Normalized e2e base URL suffix. |
| #25 | Hardened public verify timeout parsing. |
| #24 | Extracted pure feed scoring helpers and tests; follow-up is wiring production `feed-service.js` to the extracted helpers. |
| #23 | Removed stale backend bootstrap source path. |
| #22 | Fixed stale backend export README source label. |
| #21 | Hardened backend export template. |
| #20 | Unified backend verification matrix. |
| #19 | Added route manifest contract coverage. |
| #18 | Hardened project validation scripts. |
| #15 | Added backend CI checks. |

## Current interpretation

The backend repo is no longer a loose export target. It has its own CI/check/verify/docs automation and route registry guardrails. Older docs that describe backend repo bootstrap as future planning are stale.

## PR-derived follow-ups

- Run `npm run check` and `npm run verify` after pulling latest `main`.
- Continue the feed-scoring cleanup by importing extracted helpers into `feed-service.js` in a separate narrow PR.
- Keep backend docs indexes generated rather than hand-maintained.
- Treat route registry tests as the current API routing guardrail.
