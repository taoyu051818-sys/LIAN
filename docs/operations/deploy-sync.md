# Deploy Sync Guide

This guide prevents the most common production mistakes: running backend commands from the frontend repository, deploying from a stale branch, forgetting to restart PM2, or assuming a PR changed files that did not enter `main`.

## Repository paths

Backend server repository:

```text
/opt/lian-platform-server
```

Frontend repository:

```text
/opt/lian-mobile-web
```

## Always confirm the target repository

Before running deployment or sync commands, run:

```bash
pwd
git remote -v
git status
```

For backend work, `pwd` must be:

```text
/opt/lian-platform-server
```

The remote must point to:

```text
taoyu051818-sys/lian-platform-server
```

For frontend work, `pwd` must be:

```text
/opt/lian-mobile-web
```

## Backend sync from main

```bash
cd /opt/lian-platform-server || exit 1
pwd
git remote -v
git fetch origin --prune
git switch main
git pull --ff-only origin main
npm run check
pm2 restart lian-platform-server --update-env
pm2 save
pm2 list
pm2 logs lian-platform-server --lines 80
```

Do not run backend commands from `/opt/lian-mobile-web`.

## Frontend sync from main

```bash
cd /opt/lian-mobile-web || exit 1
pwd
git remote -v
git fetch origin --prune
git switch main
git pull --ff-only origin main
npm install
npm run build
systemctl restart lian-frontend.service
systemctl status lian-frontend.service --no-pager
```

Do not run frontend commands from `/opt/lian-platform-server`.

## Verify production mode

```bash
pm2 show lian-platform-server
pm2 env 0 | grep -E 'NODE_ENV|LIAN_SECURITY_MODE'
```

Expected values:

```text
NODE_ENV=production
LIAN_SECURITY_MODE=production
```

## Verify backend health

```bash
curl -I http://127.0.0.1:4200/api/setup/status
curl -I http://127.0.0.1:4200/api/ops/routes
pm2 list
```

## Verify actual merged files

After a PR is merged, confirm what actually entered `main`:

```bash
cd /opt/lian-platform-server || exit 1
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline -5
git diff --name-only HEAD~1 HEAD
```

Do not rely on memory, draft branches, or search snippets to infer what entered `main`.

## Rollback note

If the latest backend commit breaks production and no data migration is involved:

```bash
cd /opt/lian-platform-server || exit 1
git log --oneline -5
git revert HEAD
npm run check
pm2 restart lian-platform-server --update-env
```

Prefer `git revert` over force-pushing shared branches.
