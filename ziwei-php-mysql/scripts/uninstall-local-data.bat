@echo off
cd /d "%~dp0.."
echo WARNING: This will delete the local MySQL Docker volume and all saved cases.
set /p CONFIRM=Type DELETE to continue: 
if /I not "%CONFIRM%"=="DELETE" exit /b 0
docker compose down -v
echo Local database volume deleted.
pause
