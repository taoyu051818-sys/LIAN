# Development Guardrails

This document defines rules and scripts to prevent introducing systemic bad code or 'bad smells' in the Lian backend.

## Scope of this PR

- Data integrity audit: feed image coverage
- Developer guardrails: enforcing verification before deployment
- Does NOT touch:
  - Gate / forum-gate logic
  - Route manifest itself
  - Frontend Vue shell
  - NodeBB integration

## Rules

1. Every new route must be registered in `route-matcher.js` and optionally reflected in `route-manifest.js`.
2. Gate should never write hard-coded paths; always consume backend manifest.
3. Feed / post metadata must pass `audit-feed-image-coverage.js`.
4. Data migration scripts must audit critical fields, not only key existence.
5. Tests must cover public API endpoints and critical business logic.
6. PM2 processes must be clean, logs checked before and after deployment.
7. Changes must have a rollback plan.
8. Only modify files inside your scope; do not touch unrelated subsystems.

## Scripts

- `npm run audit:feed-images` - print coverage report
- `npm run audit:feed-images:strict` - fail if coverage < 80%