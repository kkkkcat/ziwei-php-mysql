@echo off
setlocal
cd /d "%~dp0"
echo Ziwei PHP MySQL - GitHub uploader
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push-github.ps1"
if errorlevel 1 (
  echo.
  echo Upload failed. Read the message above and try again.
  pause
)
