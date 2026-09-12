@echo off
setlocal
cd /d "%~dp0.."
if not exist "public\assets\vendor\iztro-v2.6.1.min.js" (
  echo [1/3] Downloading pinned astrology engine...
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-vendor.ps1"
  if errorlevel 1 (
    echo Warning: local engine download failed. The app can still use the pinned CDN when online.
  )
) else (
  echo [1/3] Pinned astrology engine found.
)
where docker >nul 2>nul
if errorlevel 1 (
  echo.
  echo Docker Desktop is required for the one-click stack.
  echo Install Docker Desktop, then run this file again.
  echo Alternatively use XAMPP/PHP + MySQL and point DocumentRoot to public\.
  pause
  exit /b 1
)
echo [2/3] Starting PHP + MySQL...
docker compose up -d --build
if errorlevel 1 (
  echo Failed to start containers. Make sure Docker Desktop is running.
  pause
  exit /b 1
)
echo [3/3] Opening app...
start "" http://localhost:8080
echo.
echo Ziwei app: http://localhost:8080
echo MySQL host port: 3307
pause
