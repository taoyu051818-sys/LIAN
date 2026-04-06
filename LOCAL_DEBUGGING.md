# Local Debugging Notes

This file records the agreed local debugging path for this workstation so future sessions do not confuse the local WSL app with the remote server deployment.

## Default version to inspect first

Always check the local WSL frontend first unless the task explicitly says to debug the server.

- Frontend: `http://localhost:3000`
- NodeBB: `http://localhost:4567`
- Frontend workspace in WSL: `/mnt/f/26.3.13/NodeBB-frontend`
- NodeBB root in WSL: `/home/ty/NodeBB`

## Root cause of the local startup issue

The Windows batch launcher started WSL with a non-interactive shell. In that mode, `nvm`, `node`, `pnpm`, and `corepack` were not reliably available on `PATH`, so the frontend silently failed to boot.

Typical symptoms:

- `Frontend HTTP check failed`
- `corepack: command not found`
- `pnpm: command not found`
- `/usr/bin/env: 'node': No such file or directory`

There is also a separate machine-specific networking caveat:

- this workstation sometimes does not mirror WSL `localhost` listeners back to Windows correctly
- when that happens, the frontend may be healthy inside WSL while `http://localhost:3000` on Windows still refuses connections

## Fixed startup rule

When starting the local frontend through WSL, always load `nvm` first:

```bash
source ~/.nvm/nvm.sh
```

Then run the frontend command from `/mnt/f/26.3.13/NodeBB-frontend`.

## Recommended local commands

Development mode:

```bash
wsl bash -lc "source ~/.nvm/nvm.sh && cd /mnt/f/26.3.13/NodeBB-frontend && pnpm dev --hostname 0.0.0.0 --port 3000"
```

Production-like mode:

```bash
wsl bash -lc "source ~/.nvm/nvm.sh && cd /mnt/f/26.3.13/NodeBB-frontend && pnpm build && pnpm exec next start -H 0.0.0.0 -p 3000"
```

## Windows helper scripts

- `start-frontend.bat`: starts the local WSL frontend in production-like mode (`next start`). If `.next` is missing, it builds first.
- `stop-frontend.bat`: stops local WSL frontend processes on ports used by the project

The actual startup and shutdown logic now lives in:

- `scripts/start-local-frontend.sh`
- `scripts/stop-local-frontend.sh`

This avoids Windows batch quoting issues and keeps the WSL runtime logic in one place.

## Sanity checks

After startup:

```bash
wsl bash -lc "ss -ltnp | grep :3000 || true"
```

From Windows:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

If Windows still cannot connect, verify from WSL first:

```bash
wsl bash -lc "curl -I http://127.0.0.1:3000"
```

If the local version is healthy, debug there first. Only switch to the remote server after the local result is understood.
