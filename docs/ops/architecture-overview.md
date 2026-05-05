# LIAN architecture overview

This document describes the current LIAN runtime, ops, observability, CI, and documentation automation architecture.

```mermaid
flowchart TB
  U[用户浏览器] --> D[https://lian.nat100.top]
  D --> G[forum_gate<br/>公网入口 / 网关]

  subgraph FE[lian-mobile-web 前端仓库]
    FG[systemd: lian-frontend.service]
    FR[scripts/serve-frontend-runtimes.js]
    LEG[Legacy frontend<br/>port 4300]
    VUE[Vue canary<br/>port 4301]
    OPSHTML[public/ops.html<br/>运维页面]
    OPSJS[public/ops.js<br/>健康检查 / 运维动作]
    OBSJS[public/ops-observability.js<br/>只读可观测渲染]
    FVERIFY[npm run verify<br/>check + ops:guard + build]

    FG --> FR
    FR --> LEG
    FR --> VUE
    OPSHTML --> OPSJS
    OPSHTML --> OBSJS
  end

  G --> LEG
  G --> VUE
  G --> OPSHTML

  subgraph BE[lian-platform-server 后端仓库]
    PM2[PM2: lian-platform-server]
    API[server.js / api-router.js]
    MATCH[route-matcher.js<br/>API 路由事实源]
    REG[api-route-registry.js<br/>routeId -> handler]
    MANIFEST[route-manifest.js<br/>路由清单]
    PUBLIC[public-entry-checks.js<br/>公网入口检查事实源]

    subgraph HANDLERS[业务 handlers]
      FEED[feed-handlers.js<br/>Feed / 帖子详情]
      POST[post-handlers.js<br/>发帖 / 点赞 / 收藏 / 举报]
      MAP[map-v2-service.js<br/>地图数据]
      AUTH[auth-routes.js / auth-service.js<br/>登录 / 用户 / 邀请]
      CHAN[channel-service.js<br/>频道 / 消息]
      UPLOAD[upload.js<br/>图片上传]
      ADMIN[admin-routes.js<br/>后台管理]
    end

    subgraph OPS[运维与可观测]
      OPSSVC[ops-service.js<br/>OPS_ACTION_DEFINITIONS]
      OPSAUTH[ops-auth.js<br/>运维鉴权]
      OPSOBSROUTE[ops-observability-route.js]
      OPSOBS[ops-observability.js<br/>Git / PM2 / systemd 状态采集]
    end

    subgraph CONFIG[配置 / 安全]
      CFG[config.js]
      SCHEMA[config-schema.js]
      SEC[security-mode.js]
    end

    subgraph VERIFY[自动化验证]
      CHECK[npm run check]
      DEPLOYSAFE[npm run verify:deploy-safe]
      FULLVERIFY[npm run verify]
      PUBLICVERIFY[npm run verify:public]
      DOCGEN[scripts/generate-automation-docs.js]
    end

    PM2 --> API
    API --> MATCH
    MATCH --> REG
    REG --> HANDLERS
    REG --> OPS
    REG --> MANIFEST

    CFG --> SCHEMA
    CFG --> SEC

    PUBLICVERIFY --> PUBLIC
    CHECK --> DOCGEN
    DEPLOYSAFE --> CHECK
    FULLVERIFY --> DEPLOYSAFE
  end

  LEG -->|/api/feed / /api/map / /api/auth ...| API
  VUE -->|/api/...| API
  OPSJS -->|GET /api/ops/health| OPSSVC
  OPSJS -->|POST /api/ops/action| OPSSVC
  OBSJS -->|GET /api/ops/observability| OPSOBSROUTE

  OPSSVC --> OPSAUTH
  OPSOBSROUTE --> OPSAUTH
  OPSOBSROUTE --> OPSOBS

  subgraph DATA[数据与外部系统]
    REDIS[(Redis object-native<br/>主数据源)]
    NODEBB[NodeBB API]
    NODEBBCLIENT[nodebb-client.js<br/>NodeBB 边界事实源]
    CLOUD[Cloudinary / 图片服务]
    MAIL[Mail provider]
  end

  FEED --> REDIS
  POST --> REDIS
  MAP --> REDIS
  AUTH --> REDIS
  CHAN --> REDIS

  FEED --> NODEBBCLIENT
  POST --> NODEBBCLIENT
  NODEBBCLIENT --> NODEBB

  UPLOAD --> CLOUD
  AUTH --> MAIL

  subgraph CI[GitHub Actions / 自动化门禁]
    FECI[Frontend Verify<br/>npm ci + npm run verify]
    BECI[Backend Verify<br/>Redis service + npm run verify]
    PUBCI[Public Entry Verify<br/>npm run verify:public]
  end

  FVERIFY --> FECI
  FULLVERIFY --> BECI
  PUBLICVERIFY --> PUBCI

  subgraph DOCS[自动文档链]
    ROUTESRC[route-matcher.js]
    PUBSRC[public-entry-checks.js]
    PKGSRC[package.json scripts]
    WFSRC[.github/workflows]
    GENDOC[docs/ops/generated-automation-contracts.md]
  end

  ROUTESRC --> DOCGEN
  PUBSRC --> DOCGEN
  PKGSRC --> DOCGEN
  WFSRC --> DOCGEN
  DOCGEN --> GENDOC
  GENDOC --> CHECK

  subgraph DEPLOY[部署链条]
    MAIN[main 分支]
    WEBHOOK[/api/ops/deploy-webhook]
    ACTIONS[ops action registry]
    PULL[git pull --ff-only]
    INSTALL[npm install / npm ci]
    RESTART[restart PM2 / systemd]
    SMOKE[verify:public / ops health]
  end

  MAIN --> WEBHOOK
  WEBHOOK --> ACTIONS
  ACTIONS --> PULL
  PULL --> INSTALL
  INSTALL --> DEPLOYSAFE
  DEPLOYSAFE --> RESTART
  RESTART --> SMOKE
  SMOKE --> OPSSVC
```

## Main chains

### User request chain

```text
Browser
→ lian.nat100.top
→ forum_gate
→ frontend runtime 4300 / 4301
→ /api/...
→ backend api-router
→ route-matcher
→ api-route-registry
→ handler
→ Redis / NodeBB / external services
```

### Backend routing chain

```text
server.js / api-router.js
→ route-matcher.js
→ routeId
→ api-route-registry.js
→ handler
```

### Ops health chain

```text
ops.html
→ ops.js
→ GET /api/ops/health
→ ops-service.js
→ public-entry-checks.js
→ home / feed / map / setup / route manifest / ops page checks
```

### Ops observability chain

```text
ops.html
→ ops-observability.js
→ GET /api/ops/observability
→ ops-observability-route.js
→ ops-auth.js
→ ops-observability.js
→ Git / PM2 / systemd state
```

### Ops action chain

```text
ops.html
→ ops.js
→ POST /api/ops/action?action=...
→ ops-service.js
→ OPS_ACTION_DEFINITIONS
→ fixed allowlisted update / restart / security-mode scripts
```

### Verification chain

```text
npm run check
→ structure / encoding / code smell / docs / generated docs / route registry checks

npm run verify:deploy-safe
→ check + route + public entry + ops action + NodeBB boundary checks

npm run verify
→ deploy-safe + object-native + Redis + feed image audit
```

### Generated documentation chain

```text
route-matcher.js
public-entry-checks.js
package.json scripts
.github/workflows
→ scripts/generate-automation-docs.js
→ docs/ops/generated-automation-contracts.md
→ npm run docs:check-generated
→ npm run check
```

## Current closure status

Closed in repository:

- Backend route facts are centralized in `route-matcher.js` and `api-route-registry.js`.
- Public entry facts are centralized in `public-entry-checks.js`.
- Ops action facts are centralized in `OPS_ACTION_DEFINITIONS`.
- Ops admin auth is shared through `ops-auth.js`.
- Ops observability has a dedicated read-only endpoint and frontend renderer.
- Backend checks include generated-doc drift detection.
- Frontend and backend have `npm run verify` entry points and GitHub Actions workflows.

Needs live-environment confirmation:

- Whether the production server has pulled the latest `main` commits.
- Whether `/api/ops/observability` works through the live gateway with real admin credentials.
- Whether the GitHub webhook fully performs pull → verify → restart → smoke.
- Whether branch protection requires frontend/backend verification checks before merging.
