# Development Guardrails

This document defines rules and scripts to prevent introducing systemic bad code or bad smells in the LIAN backend and deployment edge.

## Current scope

These guardrails cover backend and public-entry verification:

- backend structure and encoding checks
- route matcher regression tests
- route manifest contract tests
- Redis object-native runtime verification
- feed image coverage audit
- public gateway smoke checks

They do not replace focused reviews for:

- `forum-gate` implementation changes
- frontend Vue migration
- NodeBB integration behavior
- audience / permission enforcement
- map geometry or campus data work

## Rules

1. Every new API route must be registered in `route-matcher.js` and covered by `scripts/test-routes.js`.
2. Route capability exposed to edge/gate must stay aligned with `route-matcher.js`; `scripts/test-route-manifest.js` is mandatory in backend verification.
3. Gate should never maintain a hand-written list of every backend API path; it should consume `/api/ops/routes` or route by service boundary.
4. Feed / post metadata must pass `audit-feed-image-coverage.js`. Data migration scripts must audit critical fields, not only key existence.
5. Public entry behavior must be verified with GET requests, not HEAD. `curl -I` can create false 404s because backend routes are method-specific.
6. PM2 processes must be clean, logs checked before and after deployment.
7. Changes must have a rollback plan before touching live gateway or deployment scripts.
8. Only modify files inside your declared scope; do not touch unrelated subsystems.
9. A local syntax check is not acceptance. Use the verification matrix below.

## Required verification matrix

For normal backend changes, run:

```bash
npm run verify
```

This includes:

- `npm run check`
- `npm run test:routes`
- `npm run test:route-manifest`
- `npm run test:object-native`
- `npm run verify:redis`
- `npm run verify:redis:auth`
- `npm run audit:feed-images`

For gateway, deploy, NAT, PM2, public URL, or frontend/backend integration changes, also run:

```bash
npm run verify:public
```

`verify:public` checks:

- `/`
- `/api/feed?limit=24`
- `/api/map/v2/items`
- `/api/setup/status`
- `/api/ops/routes`

Override the public base URL when needed:

```bash
LIAN_PUBLIC_BASE_URL=https://example.com npm run verify:public
```

## Scripts

- `npm run verify` - canonical backend verification matrix
- `npm run verify:public` - public gateway smoke check; use after gateway/deploy/public entry changes
- `npm run audit:feed-images` - print feed image coverage report
- `npm run audit:feed-images:strict` - fail if coverage < 80%
- `npm run test:route-manifest` - ensure backend route manifest does not drift from route matcher

## Gateway contract

The public edge contract is documented in:

```text
docs/ops/forum-gate-contract.md
```

Treat the following as blockers:

- public home or public APIs redirect to `/gate-login` in development mode
- `/api/*` is routed to frontend instead of backend
- `ANSWER` missing breaks public read paths
- route manifest and route matcher drift apart
- public smoke checks are skipped after gateway/deploy changes

## Bad-smell checklist

Stop before coding if any of these are true:

- one route/action/status string must be manually copied into multiple files
- a service needs to guess another service's paths
- a migration verifies counts but not field completeness
- a production/development mode changes public routing without a public smoke test
- the live server has critical code not represented in a repository, contract, or rollback note
