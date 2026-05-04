# lian-platform-server bootstrap export

This directory was generated from `lian-mobile-web-full` by:

```bash
node scripts/prepare-backend-repo-export.js outputs/lian-platform-server-export
```

## Purpose

This is the non-destructive Phase 1 backend repo bootstrap workspace for LIAN. It preserves the current backend runtime behavior first; it does not migrate framework, database, feed ranking, auth, or publish behavior.

## Expected first validation

Run from this export directory after installing any dependencies needed by the deployment environment:

```bash
node --check server.js
find src/server -maxdepth 2 -name '*.js' -print0 | xargs -0 -n1 node --check
npm test
npm run check
npm run test:routes
node --test test/audience-regression.test.mjs
```

`npm run check` in this export is intentionally backend-only. It uses `scripts/validate-backend-structure.js` and does not require `public/*` frontend files.

## Split boundary

- Backend owns: `server.js`, `src/server/*`, selected `data/*.json`, backend validators/tests, NodeBB integration, AI adapters, auth/session, upload/image proxy, feed, map data/admin APIs, and metadata writes.
- Frontend repo keeps: `public/*`, `scripts/smoke-frontend.js`, and `docs/agent/contracts/api-contract.md`.

## Data export policy

The initial backend import includes only source-of-truth/config data files:

- `data/alias-pool.json`
- `data/clubs.json`
- `data/feed-rules.json`
- `data/locations.json`
- `data/map-v2-layers.json`
- `data/post-metadata.json`
- `data/study-hn-club-discoveries.json`

It deliberately excludes frontend static files, local secrets/runtime-only files, generated JSONL records, channel reads, backup/conflict files, and `outputs/` artifacts.

## Manifest

See `repo-split-manifest.json` for copied, skipped, and generated paths.

Generated at: 2026-05-04T08:33:17.634Z
Source root: /opt/lian-mobile-web
