#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/mnt/f/26.3.13/NodeBB-frontend"
LOG_FILE="/tmp/nodebb-frontend-dev.log"
PORT="3000"

source "$HOME/.nvm/nvm.sh"
cd "$PROJECT_DIR"

if [[ ! -d .next ]]; then
  pnpm build
fi

nohup pnpm exec next start -H 0.0.0.0 -p "$PORT" >"$LOG_FILE" 2>&1 </dev/null &
