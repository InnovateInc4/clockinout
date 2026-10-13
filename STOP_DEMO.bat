@echo off
cd /d "%~dp0"
echo Stopping MCMS portable demo...
docker compose down
pause
