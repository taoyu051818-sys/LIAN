# Handoff: NodeBB / LIAN Ops Requirements

Date: 2026-05-05

## Thread scope

This handoff transfers operational requirements to an ops/infrastructure executor so the architecture thread can continue backend design work without mixing runtime maintenance into product architecture.

This is documentation only. It does not change runtime behavior, API contracts, NodeBB data, Redis data, Nginx config, PM2 config, or deployment scripts.

## Required pre-read

Before changing production ports, deployment commands, Redis settings, PM2 process definitions, or forum-gate behavior, read:

- `docs/agent/references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md`
- `docs/agent/03_FILE_OWNERSHIP.md`
- `docs/agent/04_DECISIONS.md`

This handoff does not replace the ops/security boundary reference. That reference remains the source of truth for the current production runtime chain, forum-gate boundary, PM2 deploy rule, Redis DB boundary, and do-not-do list.

## Live server observations from 2026-05-05 operator check

Observed environment:

- Ubuntu 24.04.1 LTS, kernel `6.8.0-48-generic`.
- System reports pending updates and restart required.
- Root filesystem: about 29 GB total, about 32% used.
- Memory: about 1.9 GiB total, no swap.
- Open file limit from the shell: `1024`.
- Node.js: `/usr/bin/node`, version `v22.22.2`.
- npm/npx: `10.9.7`.
- No `nvm`, `fnm`, or `volta` detected.
- `git`, `curl`, `make`, `gcc`, `g++`, and `python3` are installed.
- `jq` is missing and should be installed for ops scripts.
- Redis `7.0.15` is active under systemd on `127.0.0.1:6379`.
- Redis keyspace observed: `db0=34`, `db1=33050`, `db2=11`.
- Redis DB 2 includes LIAN keys such as `lian:auth:store`, `lian:ai:records`, `lian:ai:drafts`, `lian:map:layers`, `lian:usercache`, `lian:map:locations`, `lian:feed:rules:current`, `lian:alias:pool`, `lian:channel:reads`, and `lian:clubs`.
- No local `mongosh`, legacy `mongo`, `mongod`, `psql`, or local PostgreSQL service was detected.
- NodeBB is running from `/opt/nodebb/loader.js` and `/opt/nodebb/app.js`.
- NodeBB listens on `0.0.0.0:4567`; `curl -I http://127.0.0.1:4567` returned HTTP 200 with `X-Powered-By: NodeBB`.
- The user initially ran LIAN syntax checks from `/root`, causing `MODULE_NOT_FOUND`; the runbook must identify the actual project directories.
- Nginx `1.24.0` is installed but inactive at the time of the check. Prior status output showed conflicting `server_name` warnings around `18080`.
- `caddy` and `certbot` were not detected.
- Running systemd units included `lian-frontend.service` and `redis-server.service`.
- PM2 `6.0.14` was installed. PM2 processes `forum-gate` and `lian-platform-server` were online.

These observations are a starting point for ops follow-up, not an architecture decision record.

## Non-goals

The ops executor must not use this handoff as approval to do any of the following:

- Refactor LIAN backend services.
- Change API route behavior.
- Add Express, Fastify, Koa, or another web framework.
- Migrate LIAN to PostgreSQL.
- Change feed ranking, audience rules, publish flow, AI draft behavior, or map product behavior.
- Modify NodeBB plugins, NodeBB theme code, or NodeBB data structures without a separate task and backup plan.
- Delete JSON/JSONL rollback/source files after Redis migration.
- Commit `.env`, `/etc/forum-gate.env`, API tokens, passwords, or runtime state.
- Put LIAN data in Redis DB 1.
- Run `FLUSHALL` or `redis-cli -n 1 FLUSHDB`.

## P0 requirements

### OPS-P0-001: Install baseline ops tools

Install tools needed by runbooks and diagnostics:

```bash
apt update
apt install -y jq htop unzip zip rsync logrotate ca-certificates lsb-release
```

Acceptance:

```bash
jq --version
rsync --version
logrotate --version
```

### OPS-P0-002: Write the server runbook

Create either `/root/LIAN-RUNBOOK.md` or `/opt/lian/RUNBOOK.md`.

The runbook must include:

- NodeBB directory, expected `/opt/nodebb`.
- LIAN backend directory, actual path to be confirmed.
- LIAN frontend directory, actual path to be confirmed.
- Redis config path, expected `/etc/redis/redis.conf`.
- Nginx config paths, especially `/etc/nginx/sites-enabled/*`.
- PM2 process names and exact start commands.
- systemd service names and ownership.
- Log locations and commands for NodeBB, LIAN backend, LIAN frontend, Redis, Nginx, and forum-gate.
- Health-check commands and expected responses.

Acceptance:

```bash
ls -la /opt/nodebb
pm2 list
systemctl list-units --type=service --state=running | grep -Ei 'lian|nodebb|redis|nginx'
```

### OPS-P0-003: Verify NodeBB runtime configuration

From `/opt/nodebb`, record:

- NodeBB version.
- NodeBB database type.
- NodeBB Redis DB number.
- NodeBB port and public/internal URL values.
- NodeBB process manager: loader, PM2, systemd, or another launcher.
- Whether `./nodebb status` and `./nodebb info` are available.

Suggested commands:

```bash
cd /opt/nodebb
node -p "require('./package.json').version"
cat config.json
./nodebb status || true
./nodebb info || true
```

Acceptance: the runbook states how NodeBB is started, stopped, restarted, and backed up.

### OPS-P0-004: Freeze Redis DB ownership

Current intended boundary:

```text
Redis DB 0: reserved/default, no new LIAN dependency
Redis DB 1: NodeBB
Redis DB 2: LIAN backend
LIAN key prefix: lian:
```

Acceptance:

```bash
redis-cli info keyspace
redis-cli -n 1 dbsize
redis-cli -n 2 dbsize
redis-cli -n 2 keys 'lian:*' | head
```

The executor must document any mismatch before changing application settings.

### OPS-P0-005: Clean up Nginx decision and config state

The operator check showed Nginx installed but inactive, with previous conflicting `server_name` warnings on `18080`. The executor must decide whether Nginx is currently part of production traffic or only leftover config.

Required steps:

1. Backup Nginx config.
2. List all enabled sites and all `listen`, `server_name`, and `proxy_pass` entries.
3. Confirm whether `18080` belongs to `forum-gate` or Nginx.
4. Do not replace `forum-gate` on `18080` unless a separate security decision approves that change.

Suggested commands:

```bash
mkdir -p /root/nginx-backups
cp -a /etc/nginx /root/nginx-backups/nginx-$(date +%F-%H%M%S)
nginx -T | grep -nE 'listen|server_name|proxy_pass'
ls -la /etc/nginx/sites-enabled
nginx -t
```

Acceptance: Nginx role is documented and there are no unexplained duplicate `server_name` warnings in the final plan.

### OPS-P0-006: Freeze PM2 startup and recovery

PM2 currently runs `forum-gate` and `lian-platform-server`. The executor must make restart behavior explicit.

Suggested commands:

```bash
pm2 list
pm2 describe forum-gate
pm2 describe lian-platform-server
pm2 save
pm2 startup systemd -u root --hp /root
```

Acceptance:

```bash
pm2 resurrect
pm2 list
systemctl status pm2-root --no-pager || true
```

The runbook must include the exact command needed to start `forum-gate`, including how `/etc/forum-gate.env` is loaded.

### OPS-P0-007: Create backup and restore docs

Create:

```text
/opt/lian-ops/bin/backup-runtime.sh
/opt/lian-ops/bin/restore-runtime.md
/opt/lian-ops/backups/
```

Backup scope must include, as applicable:

- `/opt/nodebb/config.json`.
- NodeBB uploads directory, actual path to be confirmed.
- LIAN backend runtime data, actual path to be confirmed.
- Redis RDB or exported Redis backup.
- `/etc/nginx`.
- PM2 dump file, usually `/root/.pm2/dump.pm2`.
- Relevant systemd unit files for LIAN/NodeBB/forum-gate if present.

Acceptance:

```bash
bash /opt/lian-ops/bin/backup-runtime.sh
ls -lh /opt/lian-ops/backups
```

## P1 requirements

### OPS-P1-001: Maintenance window for system updates and reboot

The server reports pending updates and a required restart. The executor must propose and execute a maintenance-window plan instead of rebooting ad hoc.

Suggested checks:

```bash
apt list --upgradable
test -f /var/run/reboot-required && cat /var/run/reboot-required || echo 'no reboot required file'
```

Acceptance: update/reboot decision, date, commands, and post-reboot validation output are recorded in the runbook or a dated ops note.

### OPS-P1-002: Swap and file descriptor baseline

Current observation: no swap and `ulimit -n=1024`. The executor should propose a safe baseline for this small VM.

Acceptance:

```bash
free -h
ulimit -n
systemctl show redis-server -p LimitNOFILE
```

Do not change kernel/system limits without documenting rollback.

### OPS-P1-003: Health-check script

Create `/opt/lian-ops/bin/healthcheck.sh`.

It should check:

- Redis ping.
- Redis DB 1 and DB 2 sizes.
- NodeBB HTTP on `127.0.0.1:4567`.
- LIAN backend HTTP, actual port to be confirmed from PM2/runbook.
- Forum-gate HTTP, expected `18080` if current security boundary remains.
- PM2 process status.
- Disk usage.
- Memory availability.

Acceptance:

```bash
bash /opt/lian-ops/bin/healthcheck.sh
```

### OPS-P1-004: Troubleshooting guide

Create `/opt/lian-ops/TROUBLESHOOTING.md` covering at least:

- NodeBB 502 or NodeBB start failure.
- Redis connection failure.
- PM2 process crash loops.
- Nginx port/config conflict.
- LIAN API 404/500.
- NodeBB API token failure.
- Forum-gate answer/env loading failure.
- Disk full.
- Memory pressure.

### OPS-P1-005: Deployment baseline scripts

Create scripts only after the runbook is accurate:

```text
/opt/lian-ops/bin/deploy-backend.sh
/opt/lian-ops/bin/deploy-frontend.sh
/opt/lian-ops/bin/restart-services.sh
```

Requirements:

- Backup before deploy.
- Print current and target git commit.
- Prefer `npm ci` when lockfiles are present.
- Do not delete the old working tree on failure.
- Run health check after restart.
- Use PM2 for the backend; do not spawn detached `nohup npm start` processes.

## P2 requirements

- Add UFW or cloud firewall rules if not already enforced upstream.
- Create a non-root ops user and reduce direct root login reliance.
- Add lightweight monitoring: Uptime Kuma, Netdata, or Prometheus node_exporter are acceptable options.
- Add TLS automation only if the domain is actually routed to this host.
- Create the NodeBB database backup strategy after verifying actual database type.
- Add scheduled Redis backup and off-host copy.
- Decide whether PM2 remains the Node process manager or whether services should converge to systemd.

## Deliverables expected from the ops executor

The executor should return:

1. `RUNBOOK.md` path and content summary.
2. `TROUBLESHOOTING.md` path and content summary.
3. `healthcheck.sh` path and one full output sample.
4. `backup-runtime.sh` path and one full output sample.
5. Nginx config backup path and final role decision.
6. PM2/systemd startup explanation.
7. Redis DB ownership confirmation.
8. NodeBB version/database/process-manager confirmation.
9. Open risks and unresolved questions.
10. Rollback notes for every persistent server change.

## Duplication and conflict review

This handoff intentionally overlaps with existing docs only at the boundary level and does not supersede them:

- `docs/agent/references/OPS_SECURITY_DEV_BOUNDARY_2026-05-04.md` remains the production security/deploy source of truth. This handoff adds executor-facing requirements and acceptance checks.
- `docs/agent/04_DECISIONS.md` remains the architecture/product decision log. This handoff makes no architecture decision.
- `docs/agent/domains/NODEBB_INTEGRATION.md` remains the NodeBB API and product-boundary reference. This handoff does not define or change NodeBB integration behavior.
- `docs/agent/03_FILE_OWNERSHIP.md` remains the conflict-level map. This handoff changes no runtime files.
- `docs/agent/handoffs/repo-split-backend-bootstrap.md` remains the backend repo bootstrap handoff. This handoff is about live-server ops readiness only.

If any conflict is found later, prefer the existing source-of-truth order in `docs/agent/README.md`: current code, latest handoff for the task area, current task doc, project file index, domain docs, architecture workplan, decisions, then historical baseline/planning docs.

## Rollback plan

Documentation rollback is simply reverting this file and the handoff index entry.

No runtime rollback is required because this handoff does not change code or server state.

## Next thread instructions

Assign this file to the ops executor. They should complete the P0 items first and return deliverables before P1/P2 work. The architecture thread can continue backend design without waiting for P1/P2, but should not ask implementation threads to change production deployment, Redis mode, ports, or PM2 definitions until P0 runbook/backup/healthcheck deliverables exist.
