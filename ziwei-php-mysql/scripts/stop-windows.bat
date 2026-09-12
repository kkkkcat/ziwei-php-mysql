@echo off
cd /d "%~dp0.."
docker compose stop
if errorlevel 1 pause & exit /b 1
echo Ziwei PHP + MySQL stopped. Data remains in the Docker volume.
pause
