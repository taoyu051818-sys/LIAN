# File Ownership and Conflict Levels

> [!WARNING]
> Historical / superseded ownership context as of 2026-05-05. Do not use this file as the current file ownership source. Start from `docs/agent/README.md`, `docs/agent/references/PR_DERIVED_STATUS_2026-05-05.md`, and `docs/agent/references/FILE_OWNERSHIP_OVERRIDE_2026-05-05.md` before using the material below.

## Conflict level definitions

- **hard-lock**: only the designated owner should modify. Other contributors must get owner review before merge.
- **hard-review**: like hard-lock, but the owner reviews rather than exclusively modifies. Used for core services where changes need domain expert review.
- **soft-lock**: can be modified by anyone, but must check the current task doc and understand the context first.
- **open**: low conflict risk. New files in these directories are generally safe.

## Current repository ownership boundary

| Repository | Primary owner boundary |
|---|---|
| `lian-mobile-web` | Frontend/static/Vue workspace: legacy mobile UI, Vue primitives, frontend assets, frontend CI |
| `lian-platform-server` | Backend runtime/storage workspace: API server, NodeBB integration, auth/session, runtime data, Redis migration, ops webhooks |

## `src/server/` - Backend services

| File | Level | Owner | Notes |
|---|---|---|---|
| `api-router.js` | soft-lock | shared | Route mounting only. Do not add business logic here. New routes: add 1-2 lines. |
| `feed-service.js` | hard-review | Programmer A | Recommendation core: scoring, filtering, diversity, curated pages, moment feed, debug. Touching this requires understanding the full pipeline. |
| `post-service.js` | hard-review | Programmer A | Publishing core: HTML building, NodeBB topic creation, reply handling. |
| `auth-service.js` | soft-lock | Programmer A | User model, password, session, NodeBB uid mapping. |
| `auth-routes.js` | soft-lock | Programmer A | Register/login/logout endpoints. Depends on auth-service. |
| `ai-post-preview.js` | open | - | AI draft generation. Self-contained, low conflict. |
| `ai-light-publish.js` | open | - | AI draft save + publish. Depends on post-service. |
| `channel-service.js` | open | - | Campus channel messages. Independent module. |
| `admin-routes.js` | open | - | Admin endpoints. Depends on data-store. |
| `nodebb-client.js` | soft-lock | Programmer A | NodeBB HTTP client. All NodeBB calls go through here. |
| `content-utils.js` | soft-lock | shared | HTML processing, image URL helpers. Used by many services. |
| `image-proxy.js` | open | - | Cloudinary/image proxy. Self-contained. |
| `upload.js` | open | - | Image upload to Cloudinary. Self-contained. |
| `data-store.js` | hard-review | shared | Storage facade for JSON/JSONL file mode and Redis mode. Changes affect metadata, auth/session, channel reads, AI records, map data, and operational rollback. |
| `storage/redis-client.js` | hard-review | shared | Redis config/connection helper. Changes affect production storage behavior and rollout safety. |
| `storage/redis-store.js` | hard-review | shared | Redis key names and JSON/list helper functions. Changes can break migrated runtime data. |
| `config.js` | soft-lock | shared | Environment loading. Rarely needs changes. |
| `cache.js` | open | - | In-memory cache maps. |
| `paths.js` | soft-lock | shared | File path constants, including Redis migration source files such as clubs, map, auth, and JSONL paths. |
| `http-response.js` | open | - | Response helpers. |
| `request-utils.js` | open | - | Body parsing, admin auth. |
| `static-data.js` | open | - | Institutions list, map points. |
| `static-server.js` | open | - | Static file serving. |
| `setup-page.js` | open | - | First-run setup page. |
| `audience-service.js` | soft-lock | shared | Permission functions such as `canViewPost`; used by feed, map, detail, channel. |
| `alias-service.js` | open | - | Alias pool management. |
| `notification-service.js` | soft-lock | shared | User-scoped notifications from NodeBB. |
| `map-v2-service.js` | soft-lock | shared | Map v2 data API, admin writes, bounds validation. Reads locations/layers through storage facade. |
| `route-matcher.js` | soft-lock | shared | URL pattern matching for API router. |

New files under `src/server/` are open for creation only when they do not touch shared storage, auth, permissions, route dispatch, NodeBB client behavior, feed ranking, or map source-of-truth data. New storage/data backend files default to **hard-review**.

## Frontend Vue workspace

Target repo: `lian-mobile-web`.

| Path | Level | Owner | Notes |
|---|---|---|---|
| `src/App.vue` | soft-lock | Programmer B | Vue shell and primitive showcase. Do not mix broad showcase redesign with page migration. |
| `src/styles/main.css` | soft-lock | Programmer B | Vue global styles; imports design tokens and primitive styles. |
| `src/ui/index.ts` | soft-lock | Programmer B | Exports Vue primitives. |
| `src/ui/primitives.css` | soft-lock | Programmer B | Shared primitive styling. Design-system-level changes should be reviewed with UI owner. |
| `src/ui/*.vue` | soft-lock | Programmer B | Vue primitives such as buttons, chips, sheets, bars, badges, toast, and inline errors. |
| `vite.config.ts` | soft-lock | Programmer B | Vite config. |
| `tsconfig.json` | soft-lock | Programmer B | TypeScript config. |
| `.github/workflows/frontend.yml` | soft-lock | shared | Frontend CI: build Vue entry, run checks, start legacy static rehearsal, run smoke test. |

Vue primitives are a reusable foundation. Page migration must happen one boundary at a time and should not be combined with product behavior changes.

## `public/` - Legacy frontend

| File | Level | Owner | Notes |
|---|---|---|---|
| `app.js` | soft-lock | Programmer B | Event delegation, global listeners, pull refresh, app initialization. Keep thin. |
| `app-state.js` | soft-lock | Programmer B | Global state, state aliases, legacy static map data. Load before all app feature scripts. |
| `app-utils.js` | soft-lock | Programmer B | DOM helpers, API helper, upload/compression helpers, publish progress. Shared by most frontend files. |
| `app-auth-avatar.js` | soft-lock | Programmer B | Auth UI helpers, current user loading, avatar crop flow. |
| `app-feed.js` | soft-lock | Programmer B | Feed tabs, masonry cards, detail view, image gallery/lightbox. |
| `app-legacy-map.js` | soft-lock | Programmer B | Old illustrated map compatibility, route animation, old coordinate conversion. |
| `app-ai-publish.js` | soft-lock | Programmer B | AI light publish sheet, AI preview/draft/publish, location draft handling, Map v2 location pick bridge. |
| `app-messages-profile.js` | soft-lock | Programmer B | Channel messages, replies, auth submit, profile panel, regular post submit. |
| `styles.css` | soft-lock | Programmer B | All legacy static styles. |
| `index.html` | soft-lock | Programmer B | HTML structure. Rarely changes. |
| `map-v2.js` | soft-lock | Programmer B | Leaflet map, overlays, location picker. IIFE with local api(). Human-assisted map rules still apply. |
| `publish-page.js` | soft-lock | Programmer B | Publish V2 dedicated page. 3-step flow. |
| `mock-api.js` | open | - | Mock API layer for frontend repo only. Not in backend repo. |
| `assets/` | open | - | Images, icons. |

New files under `public/` are allowed when they keep one clear feature boundary. Do not add new frontend logic back into `app.js` unless it is event binding or initialization.

Classic script load order is currently part of the architecture:

1. `map-v2.js`
2. `app-state.js`
3. `app-utils.js`
4. feature scripts
5. `app.js`

Menu prototypes (`menu-prototype*`, `menu-data.json`) are experimental demos, not part of the main app. Status: demo/experimental.

Frontend repo note: `public/tools/` are admin/internal tools (map editor, task board) and belong in the frontend repo; backend only provides API endpoints.

## `data/` - Runtime data

File-backed data remains important even with Redis support. In file mode these files are the active store. In Redis mode they are migration inputs and rollback/source snapshots until Redis has passed staging/production validation.

| File | Level | Owner | Notes |
|---|---|---|---|
| `post-metadata.json` | soft-lock | shared | Product data. Only modify entries for your task's tids. Never bulk-format. Migrates to Redis key `postmeta:items`. |
| `feed-rules.json` | soft-lock | shared | Feed config. Changes affect all users immediately. Migrates to Redis key `feed:rules:current`. |
| `auth-users.json` | - | - | In `.gitignore`. Never commit. Migrates to Redis key `auth:store`. |
| `channel-reads.json` | - | - | In `.gitignore`. Migrates to Redis key `channel:reads`. |
| `user-cache.json` | - | - | In `.gitignore`. Migrates to Redis key `usercache`. |
| `clubs.json` | open | - | Static club data. Migrates to Redis key `clubs`. |
| `alias-pool.json` | open | - | Alias pool data. Migrates to Redis key `alias:pool`. |
| `locations.json` | soft-lock | shared | Location coordinates for Map v2. Human-assisted map rules apply. Migrates to Redis key `map:locations`. |
| `map-v2-layers.json` | soft-lock | shared | Map layer definitions. Human-assisted map rules apply. Migrates to Redis key `map:layers`. |
| `study-hn-club-discoveries.json` | open | - | Club discovery data. Archive candidate. |
| `ai-post-drafts.jsonl` | - | - | Generated records. Append-only. Never hand-edit. Migrates to Redis list `ai:drafts`. |
| `ai-post-records.jsonl` | - | - | Generated records. Append-only. Never hand-edit. Migrates to Redis list `ai:records`. |
| `post-metadata.json.bak` | - | - | Backup. Ignored by `*.bak`. |

## Redis storage mode process

Redis storage changes are high impact. Before modifying Redis storage code or enabling Redis mode:

1. Confirm NodeBB Redis DB usage; LIAN migration refuses DB 1 and defaults to DB 2.
2. Keep `LIAN_STORAGE_MODE=file` as the safe default unless rollout explicitly authorizes Redis.
3. Run `npm run migrate:redis -- --clear` only against the intended LIAN Redis DB/key prefix.
4. Run `npm run verify:redis` and inspect counts before switching storage mode.
5. Keep JSON/JSONL source files as rollback snapshots until Redis mode has passed staging/production validation.
6. Document environment variables and rollback steps in the handoff.

## `scripts/` - Validation and ops

Lifecycle: **active** = run regularly or on change. **ops** = deploy/infra. **one-shot** = maintenance, rarely rerun.

| File | Level | Lifecycle | Notes |
|---|---|---|---|
| `validate-post-metadata.js` | open | active | Run before handoff if it exists. |
| `validate-locations.js` | open | active | Run before handoff if it exists. |
| `snapshot-feed.js` | open | active | Feed snapshot tool. |
| `seed-photo-post-candidates.js` | open | one-shot | Data seeding tool. |
| `smoke-frontend.js` | open | active | Frontend HTTP smoke test. 21 checks. |
| `test-routes.js` | open | active | API route matcher tests. 61 checks. |
| `test-audience.js` | open | active | Audience permission tests. |
| `test-audience-hydration.js` | open | active | Audience hydration tests. 61 checks. |
| `smoke-nodebb-contracts.js` | open | active | NodeBB endpoint validation. |
| `test-metadata-write-safety.js` | open | active | Metadata write safety. |
| `validate-project-structure.js` | open | active | Project structure validation. |
| `audit-feed-rules.js` | open | active | Feed config audit. |
| `audit-post-metadata.js` | open | active | Metadata audit. |
| `diff-feed-snapshots.js` | open | active | Snapshot comparison. |
| `archive-ai-records.js` | open | one-shot | JSONL hygiene. |
| `cleanup-audience-test.js` | open | one-shot | Test data cleanup. |
| `setup-audience-test.js` | open | one-shot | Test data setup. |
| `rewrite-test-posts.js` | open | one-shot | Test post rewriting. |
| `migrate-data-to-redis.js` | hard-review | ops | File-to-Redis migration. Supports `--clear`; ensure Redis DB/key prefix is correct before running. |
| `verify-redis-migration.js` | hard-review | ops | Redis migration verification. Must pass before enabling Redis storage mode. |
| `deploy.sh` | open | ops | Deployment script. |
| `install-linux-env.sh` | open | ops | Linux environment setup. |
| `start-local.ps1` | open | ops | Local dev startup PowerShell. |

New scripts are encouraged. Scripts that mutate production/runtime data or storage backends default to **hard-review**.

## `docs/agent/` - Documentation

All files under `docs/agent/` are open. This is the primary coordination layer.

- `tasks/` - task definitions
- `handoffs/` - task handoffs
- `domains/` - domain documentation
- `templates/` - templates for tasks and handoffs
- `references/` - audit reports, high-risk areas, recent updates
- `contracts/` - frozen API contracts

## `outputs/` - Generated artifacts

`outputs/` contains generated snapshots, reports, and publishing artifacts. Not source of truth.

| Category | Tracked? | Policy |
|---|---|---|
| Feed snapshots (`feed-snapshot-*.md`) | yes | Keep as historical reference |
| Feed diffs (`feed-diff-*.md`) | yes | Keep as historical reference |
| Club content (`club-posts/*.md`) | yes | Content reference |
| Club images (`club-posts/images/`) | no | Ignored. Large binary assets. |
| Menu scripts (`menu-post-*.cjs`) | no | Ignored. Generated one-shot scripts. |
| Seed results (`*-result-*.json`) | varies | Archive candidate. |

## High-conflict file modification process

Before modifying a high-conflict file:

1. Read the current task doc in `docs/agent/tasks/`.
2. Check `docs/agent/05_TASK_BOARD.md` for current task priority and blockers.
3. If hard-review, notify the owner before merging.
4. Keep changes minimal and scoped to your task.

After modifying a high-conflict file:

1. Run `node --check` on the changed JS file when applicable.
2. Run relevant validation scripts.
3. Test the affected user flow manually when runtime behavior changes.
4. Document what changed and why in your handoff.
