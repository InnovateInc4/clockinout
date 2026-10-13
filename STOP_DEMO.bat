@echo off
cd /d "%~dp0"
if exist "%~dp0database\real_municipal_db.sql" (
  echo Stopping MCMS real portable project...
  docker compose -f docker-compose.real.yml down
) else (
  echo Stopping MCMS portable demo...
  docker compose down
)
pause
