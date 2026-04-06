@echo off
setlocal EnableExtensions
chcp 65001 >nul
title LIAN Frontend Local Stopper

set "WSL_STOP_SCRIPT=/mnt/f/26.3.13/NodeBB-frontend/scripts/stop-local-frontend.sh"

echo.
echo Stopping local LIAN frontend processes in WSL...
wsl bash -lc "chmod +x %WSL_STOP_SCRIPT% && %WSL_STOP_SCRIPT%"
echo Done.
echo.
echo Check port 3000:
wsl bash -lc "ss -ltnp | grep :3000 || true"
exit /b 0
