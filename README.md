# LIAN Frontend

This frontend integrates with a NodeBB backend through `app/api/nodebb/*` routes.

## Local-first debugging

When debugging frontend issues on this workstation, check the local WSL frontend first.

- Local frontend URL: `http://localhost:3000`
- Local NodeBB URL: `http://localhost:4567`
- Local NodeBB root: `/home/ty/NodeBB`

Use these scripts:

```bat
start-frontend.bat
stop-frontend.bat
```

Detailed local startup notes live in `LOCAL_DEBUGGING.md`.
`start-frontend.bat` starts the local WSL frontend in a production-like mode and builds first when needed.

## NodeBB script sync (required on server)

Some API routes call helper scripts from the NodeBB server filesystem:

- `scripts/nodebb/get_frontend_anonymous_topics.js`
- `scripts/nodebb/create_topic_from_frontend.js`

Deploy-time sync command:

```bash
cd /opt/lian-frontend
mkdir -p /opt/nodebb/scripts
cp scripts/nodebb/get_frontend_anonymous_topics.js /opt/nodebb/scripts/
cp scripts/nodebb/create_topic_from_frontend.js /opt/nodebb/scripts/
chmod 755 /opt/nodebb/scripts/get_frontend_anonymous_topics.js
chmod 755 /opt/nodebb/scripts/create_topic_from_frontend.js
```

## Environment variables

Set these in `.env.local` (or service env):

```env
NODEBB_INTERNAL_URL=http://127.0.0.1:4567
NODEBB_INTERNAL_ROOT=/opt/nodebb
NEXT_PUBLIC_NODEBB_URL=http://149.104.21.74:4567
```

`NODEBB_INTERNAL_ROOT` is required for script-backed APIs (`/api/nodebb/recent` anonymous mapping and `/api/nodebb/publish`).

## Local development vs server deployment

Local development example:

```env
NODEBB_INTERNAL_URL=http://127.0.0.1:4567
NODEBB_INTERNAL_ROOT=/home/ty/NodeBB
NEXT_PUBLIC_NODEBB_URL=http://127.0.0.1:4567
```

Server deployment example:

```env
NODEBB_INTERNAL_URL=http://127.0.0.1:4567
NODEBB_INTERNAL_ROOT=/opt/nodebb
NEXT_PUBLIC_NODEBB_URL=http://149.104.21.74:4567
```

## Start

```bash
pnpm install
pnpm build
pnpm exec next start -p 3000
```
