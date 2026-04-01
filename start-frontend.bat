@echo off
setlocal EnableExtensions
chcp 65001 >nul
title NodeBB Frontend Starter

set "ROOT=%~dp0"
set "LOG_FILE=%ROOT%start-frontend.log"
set "WSL_PROJECT=/mnt/f/26.3.13/NodeBB-frontend"
set "APP_PORT=0"
set "APP_URL="
set "WSL_IP="
set "APP_URL_WSL="

>> "%LOG_FILE%" echo ========================================
>> "%LOG_FILE%" echo [%date% %time%] Frontend starter begin
>> "%LOG_FILE%" echo [%date% %time%] Workspace: %ROOT%

echo.
echo Starting NodeBB-frontend...
echo Log: %LOG_FILE%
echo.

echo [1/3] Checking existing frontend service...
>> "%LOG_FILE%" echo [%date% %time%] [1/3] Checking existing frontend service
wsl.exe -e bash -lc "if curl -fsS http://localhost:3000 >/dev/null 2>&1; then echo 3000; elif curl -fsS http://localhost:3001 >/dev/null 2>&1; then echo 3001; else echo 0; fi" > "%TEMP%\nodebb_frontend_port.txt" 2>> "%LOG_FILE%"
set /p APP_PORT=<"%TEMP%\nodebb_frontend_port.txt"
del "%TEMP%\nodebb_frontend_port.txt" >nul 2>&1
if "%APP_PORT%"=="" set "APP_PORT=0"

if not "%APP_PORT%"=="0" (
  echo Frontend already running on port %APP_PORT%.
  >> "%LOG_FILE%" echo [%date% %time%] Frontend already running on port %APP_PORT%
  goto :open_browser
)

echo [2/3] Launching frontend in background...
>> "%LOG_FILE%" echo [%date% %time%] [2/3] Launching frontend in background
wsl.exe -e bash -lc "cd %WSL_PROJECT% && nohup corepack pnpm dev --hostname 0.0.0.0 --port 3000 > /tmp/nodebb-frontend-dev.log 2>&1 < /dev/null &" >nul 2>> "%LOG_FILE%"
if errorlevel 1 goto :start_fail

echo [3/3] Waiting for frontend HTTP...
>> "%LOG_FILE%" echo [%date% %time%] [3/3] Waiting for frontend HTTP
wsl.exe -e bash -lc "for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do if curl -fsS http://localhost:3000 >/dev/null 2>&1; then echo 3000; exit 0; fi; if curl -fsS http://localhost:3001 >/dev/null 2>&1; then echo 3001; exit 0; fi; sleep 1; done; echo 0; exit 1" > "%TEMP%\nodebb_frontend_port.txt" 2>> "%LOG_FILE%"
set /p APP_PORT=<"%TEMP%\nodebb_frontend_port.txt"
del "%TEMP%\nodebb_frontend_port.txt" >nul 2>&1
if "%APP_PORT%"=="" set "APP_PORT=0"
if "%APP_PORT%"=="0" goto :http_fail

:open_browser
set "APP_URL=http://localhost:%APP_PORT%"
for /f "delims=" %%i in ('wsl.exe -e bash -lc "hostname -I" 2^>nul') do set "WSL_IP=%%i"
for /f "tokens=1" %%i in ("%WSL_IP%") do set "WSL_IP=%%i"
if not "%WSL_IP%"=="" set "APP_URL_WSL=http://%WSL_IP%:%APP_PORT%"
echo Frontend is ready: %APP_URL%
>> "%LOG_FILE%" echo [%date% %time%] Frontend ready at %APP_URL%
echo Opening browser...
start "" "%APP_URL%"
if not "%APP_URL_WSL%"=="" start "" "%APP_URL_WSL%"
echo.
echo If the page does not load, open manually:
echo %APP_URL%
if not "%APP_URL_WSL%"=="" echo %APP_URL_WSL%
echo.
echo Frontend runtime log (WSL): /tmp/nodebb-frontend-dev.log
exit /b 0

:start_fail
echo Frontend failed to start.
>> "%LOG_FILE%" echo [%date% %time%] Frontend failed to start
goto :show_log

:http_fail
echo Frontend HTTP check failed.
>> "%LOG_FILE%" echo [%date% %time%] Frontend HTTP check failed
goto :show_log

:show_log
echo.
echo Last log lines:
powershell -NoProfile -Command "Get-Content '%LOG_FILE%' -Tail 30"
echo.
echo WSL runtime log tail:
wsl.exe -e bash -lc "tail -n 40 /tmp/nodebb-frontend-dev.log 2>/dev/null || true"
echo.
echo Press any key to close this window.
pause >nul
exit /b 1
