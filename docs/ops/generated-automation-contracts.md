# LIAN automation contracts

<!-- AUTO-GENERATED: do not edit by hand. Run `npm run docs:generate`. -->

Source: generated from repository source of truth.

This document is generated from executable project state so operational docs do not drift from code.

## Verification scripts

| script | command |
| --- | --- |
| npm run audit:feed-images | node scripts/audit-feed-image-coverage.js |
| npm run audit:feed-images:strict | node scripts/audit-feed-image-coverage.js --min-coverage=0.8 |
| npm run check | node scripts/validate-backend-structure.js && node scripts/check-encoding-contamination.js && node scripts/check-code-smells.js && node scripts/check-context-docs.js && node scripts/check-docs-maintenance.js && npm run docs:check-generated && node scripts/test-route-registry.js && node scripts/test-actor-source-contracts.js && node scripts/test-place-sheet-contract.js && node scripts/test-place-ref-stable-id-contract.js |
| npm run check:backend | node scripts/validate-backend-structure.js |
| npm run check:context | node scripts/check-context-docs.js |
| npm run check:docs | node scripts/check-docs-maintenance.js |
| npm run check:encoding | node scripts/check-encoding-contamination.js |
| npm run check:smells | node scripts/check-code-smells.js |
| npm run docs:check-generated | node scripts/generate-automation-docs.js --check |
| npm run docs:generate | node scripts/generate-automation-docs.js |
| npm run docs:list | node scripts/list-docs.js |
| npm run test | node --test test/*.test.mjs |
| npm run test:actor-source-contracts | node scripts/test-actor-source-contracts.js |
| npm run test:nodebb-boundary | node scripts/test-nodebb-boundary.js |
| npm run test:object-native | node scripts/test-object-native-runtime.js |
| npm run test:ops-actions | node scripts/test-ops-actions.js |
| npm run test:place-ref-stable-id-contract | node scripts/test-place-ref-stable-id-contract.js |
| npm run test:place-sheet-contract | node scripts/test-place-sheet-contract.js |
| npm run test:public-entry-checks | node scripts/test-public-entry-checks.js |
| npm run test:route-manifest | node scripts/test-route-manifest.js |
| npm run test:route-registry | node scripts/test-route-registry.js |
| npm run test:routes | node scripts/test-routes.js |
| npm run verify | npm run check && npm run test:routes && npm run test:route-manifest && npm run test:route-registry && npm run test:ops-actions && npm run test:public-entry-checks && npm run test:nodebb-boundary && npm run test:object-native && npm run verify:redis && npm run verify:redis:auth && npm run audit:feed-images |
| npm run verify:deploy-safe | npm run check && npm run test:routes && npm run test:route-manifest && npm run test:route-registry && npm run test:ops-actions && npm run test:public-entry-checks && npm run test:nodebb-boundary |
| npm run verify:public | node scripts/verify-public-entry.js |
| npm run verify:redis | node scripts/verify-redis-object-primary.js |
| npm run verify:redis:auth | node scripts/verify-redis-auth-object-indexes.js |
| npm run verify:redis:object-primary | node scripts/verify-redis-object-primary.js |
| npm run verify:redis:objects | node scripts/verify-redis-object-primary.js |
| npm run verify:redis:prod | node scripts/verify-redis-object-primary.js |

## GitHub Actions workflows

- `.github/workflows/backend-ci.yml`
- `.github/workflows/backend-verify.yml`
- `.github/workflows/public-entry-verify.yml`

## Exact API routes

| method | path | route id |
| --- | --- | --- |
| GET | /api/setup/status | setup-status |
| POST | /api/setup | setup |
| GET | /api/ops/health | ops-health |
| GET | /api/ops/observability | ops-observability |
| GET | /api/ops/routes | ops-routes |
| POST | /api/ops/action | ops-action |
| POST | /api/ops/deploy-webhook | ops-deploy-webhook |
| GET | /api/internal/task-board | internal-task-board |
| GET | /api/alias-pool | alias-pool |
| POST | /api/ai/post-preview | ai-post-preview |
| POST | /api/ai/post-drafts | ai-post-drafts |
| POST | /api/ai/post-publish | ai-post-publish |
| GET | /api/auth/rules | auth-rules |
| GET | /api/auth/me | auth-me |
| POST | /api/auth/avatar | auth-avatar |
| POST | /api/auth/email-code | auth-email-code |
| POST | /api/auth/register | auth-register |
| POST | /api/auth/login | auth-login |
| POST | /api/auth/logout | auth-logout |
| POST | /api/auth/invites | auth-invites |
| GET | /api/auth/aliases | auth-aliases-get |
| POST | /api/auth/aliases | auth-aliases-post |
| POST | /api/auth/aliases/deactivate | auth-alias-deactivate |
| POST | /api/auth/aliases/activate | auth-alias-activate |
| GET | /api/identity/actors | identity-actors |
| GET | /api/feed | feed |
| GET | /api/feed-debug | feed-debug |
| GET | /api/tags | tags |
| GET | /api/map/v2/items | map-v2-items |
| GET | /api/map/items | map-items |
| GET | /api/channel | channel |
| POST | /api/channel/read | channel-read |
| POST | /api/channel/messages | channel-messages |
| GET | /api/messages | messages |
| GET | /api/me | me |
| GET | /api/me/saved | me-saved |
| GET | /api/me/liked | me-liked |
| POST | /api/me/history | me-history |
| POST | /api/upload/image | upload-image |
| POST | /api/posts | create-post |

## Prefix API routes

| prefix | route id |
| --- | --- |
| /api/admin/ | admin |

## Regex API routes

| method | pattern | route id | params |
| --- | --- | --- | --- |
| GET | /^\/api\/place-sheets\/([A-Za-z0-9._~-]+)$/ | place-sheet | placeId |
| GET | /^\/api\/posts\/(\d+)$/ | post-detail | tid |
| POST | /^\/api\/posts\/(\d+)\/replies$/ | post-replies | tid |
| POST | /^\/api\/posts\/(\d+)\/like$/ | post-like | tid |
| POST | /^\/api\/posts\/(\d+)\/save$/ | post-save | tid |
| POST | /^\/api\/posts\/(\d+)\/report$/ | post-report | tid |

## Public entry checks

| name | path | expects JSON |
| --- | --- | --- |
| feed | /api/feed?limit=24 | yes |
| home | / | no |
| map | /api/map/v2/items | yes |
| ops-page | /ops.html | no |
| route-manifest | /api/ops/routes | yes |
| setup | /api/setup/status | yes |

## Maintenance contract

- Update source registries first, not this file.
- `npm run docs:check-generated` regenerates this file when it drifts and reports a warning instead of blocking CI.
- Review generated diffs when they matter, but do not hand-edit this file.

