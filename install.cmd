@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.12.0 or newer is required; Node 24 LTS is recommended: https://nodejs.org/
  pause
  exit /b 1
)

node -e "process.exit((()=>{const [major,minor]=process.versions.node.split('.').map(Number);return major>22||(major===22&&minor>=12)?0:1})())"
if errorlevel 1 (
  echo This Node.js version is too old. Install Node.js 22.12.0 or newer.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm is required to install dependencies. Install Node.js with npm from https://nodejs.org/
  echo An already installed and built bot can still run through start.cmd using Node directly.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo Add your Discord, Twitch, and Kick credentials before starting the bot.
)

call npm.cmd ci
if errorlevel 1 goto :failed
call npm.cmd run build
if errorlevel 1 goto :failed

echo.
echo Installation complete. Edit .env, then run start.cmd.
pause
exit /b 0

:failed
echo.
echo Installation failed. Review the error above.
pause
exit /b 1
