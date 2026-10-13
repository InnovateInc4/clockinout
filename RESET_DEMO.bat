@echo off
cd /d "%~dp0"
echo Resetting MCMS portable demo database and containers...
docker compose down -v
if errorlevel 1 (
  echo.
  echo Docker could not reset the demo. Make sure Docker Desktop is running.
  pause
  exit /b 1
)
call "%~dp0START_DEMO.bat"
