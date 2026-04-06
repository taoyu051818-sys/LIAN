#!/usr/bin/env bash
set -euo pipefail

pkill -f 'pnpm dev --hostname 0.0.0.0 --port 3000' || true
pkill -f 'pnpm exec next start -H 0.0.0.0 -p 3000' || true
pkill -f 'next start -H 0.0.0.0 -p 3000' || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1
