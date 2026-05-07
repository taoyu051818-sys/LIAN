# Current Project Knowledge

This document captures the current product shape, repo boundaries, AI publish rules, and stabilization policy for LIAN. Read this before starting any task.

## Product shape

LIAN is a campus experience layer for students at the Hainan Lian International Education Innovation Zone. It is not a generic forum frontend.

Current active features:

- Feed recommendation and post detail (NodeBB-backed)
- Manual post publishing and replies
- AI-assisted draft generation (light publish flow)
- Channel messages and notifications
- Image upload and image proxy
- User registration, login, email verification, invite codes
- Map POI display
- Admin management APIs
- Setup wizard for first deploy

## System of record

**NodeBB is the content-system record.** All topics, posts, replies, user profiles, and social interactions (likes, bookmarks) live in NodeBB. LIAN does not duplicate this data.

LIAN owns and manages:

- Recommendation and feed assembly (`feed-service.js`)
- Post metadata enrichment (`post-metadata.json`)
- Audience and visibility projection (`audience-service.js`)
- Map layer data and campus geometry (`map-v2-service.js`)
- Mobile UI rendering (`lian-mobile-web`)
- Image proxy (`image-proxy.js`)
- API routing and runtime behavior boundaries (`api-router.js`, `api-route-registry.js`)
- Auth/session management (`auth-service.js`, `auth-routes.js`)
- AI draft generation and publish orchestration (`ai-light-publish.js`, `ai-post-preview.js`)

## AI publish rules

- AI may draft and suggest metadata (title, body, tags, location suggestions, risk flags).
- AI must NOT auto-publish. Every public or campus-visible publish requires explicit user confirmation.
- AI must NOT bypass `createNodebbTopicFromPayload()` / `handleAiPostPublish()` to call NodeBB directly.
- AI must NOT write `post-metadata.json` directly. All metadata writes go through the approved service path.

## Repository map

| Repository | Role | Status |
|---|---|---|
| `lian-platform-server` | Backend/control repo. Owns API, runtime, NodeBB integration, Redis state, auth, uploads, image proxy, map data, feed logic, validation scripts. | Active |
| `lian-mobile-web` | Frontend target repo. Owns mobile web UI, Vue canary, legacy/static rehearsal, frontend task-board UI, assets, design docs. | Active |
| `lian-mobile-web-full` | Historical. Do not use for new work. | Historical |

## P0 / P1 boundaries

P0 tasks are stabilization blockers that must be resolved before expanding product scope. Current P0 areas:

- Publish/Profile/NodeBB regression fix
- Repo split (backend bootstrap)
- Validation and acceptance pass
- Documentation baseline

P1 tasks are important but not blocking stabilization. They proceed only after P0 items are accepted.

**Do not expand product scope while stabilization and acceptance is incomplete.** Paused product lines include: place pages, food map, merchant objects, delivery/errands, task market, drone delivery, points/rewards, org admin, PostgreSQL migration, frontend framework migration, Express/Fastify migration, Map v2 building/floor editor, recommendation redesign.

## Handoff is not acceptance

A Claude Code worker may implement, validate, commit, push, and open or update a PR. But executor handoff is NOT acceptance. A task becomes accepted only when the reviewer or Human Owner records the validation result in the task board or corresponding task doc.

## Stabilization policy

The current decision is "stabilize before expanding." This means:

1. Complete validation, acceptance, and regression fixes for existing features.
2. Freeze product scope to what is already built or in active P0 work.
3. Do not add new frameworks, dependencies, or product lines without explicit approval.
4. Do not start new features while P0 acceptance is incomplete.
