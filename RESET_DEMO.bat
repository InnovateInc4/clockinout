@echo off
cd /d "%~dp0"
if exist "%~dp0database\real_municipal_db.sql" (
  echo Resetting MCMS REAL portable database and containers...
  docker compose -f docker-compose.real.yml down -v
) else (
  echo Resetting MCMS portable demo database and containers...
  docker compose down -v
)
if errorlevel 1 (
  echo.
  echo Docker could not reset the project. Make sure Docker Desktop is running.
  pause
  exit /b 1
)
call "%~dp0START_DEMO.bat"
