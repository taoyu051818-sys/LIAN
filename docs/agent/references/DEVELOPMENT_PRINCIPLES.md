# LIAN Development Principles

Last updated: 2026-05-06

This document is the project-level development principle for LIAN core repositories.
It applies to both `lian-platform-server` and `lian-mobile-web`.

## Core rule: review before implementation for cross-cutting changes

Do not start implementation PRs for cross-cutting product, API, runtime, data, or deployment changes until a review meeting has happened and the decision is recorded.

A draft PR or short investigation branch is allowed only when its purpose is to clarify feasibility. It must not be merged before the review decision is recorded.

## Changes that require an organized review meeting first

A review meeting is required before modifying any of the following areas:

1. Product semantics and user-facing mental models
   - alias / display actor / identity tag / source semantics;
   - post tag, interest, place, trust/status/source labels;
   - changes that affect how students understand identity, credibility, location, or recommendation.

2. API contracts and DTO shapes
   - adding, removing, renaming, or reinterpreting response fields;
   - frontend/backend contract changes such as `actor`, `source`, `PlaceSheet`, share-card payloads;
   - compatibility-window decisions and legacy field removal.

3. Cross-repository behavior
   - any change that requires coordinated work in both `lian-platform-server` and `lian-mobile-web`;
   - migrations where one repository must land before the other;
   - changes to ports, proxy behavior, route ownership, or runtime source of truth.

4. Data model, storage, and migration behavior
   - Redis object-native key design;
   - legacy bulk key migration or deletion;
   - NodeBB data cleanup or mutation;
   - auth/session data, profile/avatar source, post metadata, feed rules, channel read state.

5. Route registry, public entry points, and security boundaries
   - adding/removing public API routes;
   - changing route registry conventions;
   - deploy webhook, forum-gate, auth/session, admin token, upload, or proxy bypass behavior;
   - anything that changes what is publicly reachable.

6. Release, deployment, and operational behavior
   - CI/CD policy, deployment scripts, rollback process, webhook delivery, production ports;
   - staging/production promotion rules;
   - health checks, backup/restore, observability, or incident response behavior.

7. Major UI/product surfaces
   - Feed, Detail, Publish, Messages, Profile, Map, PlaceSheet / PlacePage;
   - user-facing layout changes that alter the primary task flow;
   - retiring legacy/static rehearsal behavior or switching Vue canary to the only supported path.

8. AI-assisted content or recommendation policy
   - feed ranking, curated batches, AI summaries, generated place summaries;
   - trust/confidence labels for AI-organized content;
   - moderation or safety assumptions for generated content.

## Changes that usually do not require a meeting

A review meeting is usually not required for:

- typo, copy, or documentation fixes that do not change policy;
- pure internal refactors that keep route behavior, DTO shapes, data writes, and user-facing behavior unchanged;
- test-only changes that do not alter acceptance criteria;
- small bug fixes with no cross-repository dependency and no product-contract ambiguity.

Even for these changes, open a normal PR and run the relevant checks before merge.

## Required review output

Every required review must leave a durable record in GitHub before implementation PRs are merged.
The record can be an issue comment, decision note, or linked markdown reference.

The record must include:

- decision date;
- participants or decision owner;
- problem statement;
- accepted direction;
- rejected alternatives, if important;
- affected repositories;
- implementation scope and non-goals;
- compatibility and migration plan;
- validation plan;
- rollback or recovery plan when runtime/data/deploy behavior is involved.

## Review role matrix

Review participation is based on responsibility views, not headcount. One person may cover more than one view, but the decision record must name which views were represented.

### Always required for review-required changes

| Responsibility view | Required for | Decision authority |
| --- | --- | --- |
| Product / decision owner | all review-required changes | final product direction, priority, and user-facing tradeoff |
| Technical owner | all review-required changes | implementation feasibility, repository split, compatibility, validation plan |

### Conditionally required views

| Responsibility view | Required when the change touches | Can be async? | Notes |
| --- | --- | --- | --- |
| UI / interaction / motion reviewer | Feed, Detail, Publish, Messages, Profile, Map, PlaceSheet / PlacePage, page transitions, gestures, floating docks, expandable panels, visual hierarchy, mobile interaction feel | yes, if the issue records approval or requested changes | UI/motion is not required for pure backend/API reviews, but is required before merging user-facing interaction or motion changes. |
| Backend / API owner | route registry, DTOs, Redis object-native data, NodeBB gateway, auth/session, upload, post metadata, feed rules, channel state | yes | Required when frontend depends on new or changed API semantics. |
| Frontend owner | Vue canary, legacy/static retirement, API mapping, mobile-web routing, visual state, client compatibility | yes | Required when backend changes affect frontend contracts or when frontend removes compatibility fallbacks. |
| QA / acceptance owner | release candidates, production deploys, login/register/publish/message/map/detail flows, regression-sensitive changes | yes, but must leave a checklist result | Required before release or before closing review gates that affect critical user paths. |
| Ops / security owner | public routes, deploy webhook, forum-gate, admin token, auth/session, upload, proxy bypass, production ports, CI/CD, rollback | no for high-risk runtime/security changes unless explicitly accepted by decision owner | Required for externally reachable, credential, deployment, or rollback behavior. |
| Data / content owner | NodeBB data mutation, legacy content cleanup, AI-generated summaries, curated feed batches, recommendation policy, trust/confidence labels | yes | Required when data changes cannot be fully rolled back by code revert. |

### Minimum acceptable review composition

- Pure backend/API contract review: Product / decision owner + Technical owner + Backend / API owner.
- Pure frontend UI review: Product / decision owner + Technical owner + UI / interaction / motion reviewer + Frontend owner.
- Cross-repository product contract review: Product / decision owner + Technical owner + Backend / API owner + Frontend owner.
- Release/deploy review: Product / decision owner + Technical owner + QA / acceptance owner + Ops / security owner.
- Data migration or NodeBB cleanup review: Product / decision owner + Technical owner + Data / content owner + Backend / API owner.

For small-team operation, a single person may cover Product and QA, or Technical and Backend/Frontend, but UI/motion-sensitive changes must still receive an explicit UI/interaction/motion review before merge.

### UI / motion participation rule

UI / interaction / motion review is not required for every issue. It is required before implementation PRs are merged when the user experience changes in a way that affects perception, task flow, or mobile feel.

Examples that require UI / motion review:

- Feed card layout, image treatment, like/save placement, tab switching, scroll behavior;
- post detail gallery, fullscreen preview, floating top bar, bottom dock, reply composer expansion;
- publish flow layout, identity confirmation, place binding, success state;
- message composer identity display, send interaction, channel state;
- Map marker selection, place sheet/page transitions, sheet expansion/collapse;
- page transitions, loading states, error states, empty states, animations, gestures.

Examples that do not require UI / motion review:

- route registry tests;
- Redis object key verification;
- backend-only refactors with no DTO or user-visible behavior change;
- documentation-only updates;
- CI/check script changes that do not alter product behavior.

### Missing-role handling

If a required view is missing:

1. Record the missing view in the issue.
2. Mark the review decision as provisional.
3. Do not merge implementation PRs that depend on that view.
4. Request async review in the same issue, or schedule a follow-up review.
5. Once the missing view approves or requests changes, update the decision record.

Emergency fixes may bypass a missing view only when the decision owner records why delay is riskier than merging. The follow-up review must still happen after the emergency fix.

## Implementation sequence after review

Use this order for reviewed changes:

1. Record the decision.
2. Split backend/frontend work if both repositories are affected.
3. Land backend contracts first when frontend depends on new API semantics.
4. Keep compatibility fields during a migration window when existing clients may still read them.
5. Update frontend mapping after backend contract is merged.
6. Run repository checks and smoke tests.
7. Close or update the review issue only after validation is complete.

## Current known review gates

The following active areas must stay review-first until closed:

- Display actor semantics across posts, replies, and channel messages.
- PlaceSheet / place sedimentation API for Map, Detail, and Publish flows.
- Message composer identity UI, especially avoiding identity tag as speaking identity.
- Publish place binding simplification.
- Detail page place pill behavior.
- WeChat/share-card backend payload shape.
- Avatar source unification between NodeBB, aliases, and legacy local uploads.
- Legacy NodeBB visible author signature / escaped HTML cleanup.
- Retirement plan for legacy/static frontend behavior and Vue canary promotion.

## Merge rule

If a PR touches a review-required area and there is no linked review decision, do not merge it.
Convert the PR to a draft, open or update the relevant review issue, and organize the review first.

If a PR touches an area that requires a specific responsibility view and that view is not represented in the linked decision record, do not merge it unless the decision owner records an emergency exception and follow-up review plan.
