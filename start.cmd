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

if not exist ".env" (
  echo Missing .env. Run install.cmd first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencies are missing. Run install.cmd first.
  pause
  exit /b 1
)

if not exist "dist\src\index.js" (
  if not exist "node_modules\typescript\bin\tsc" (
    echo The compiled bot is missing. Run install.cmd to install build tools and build it.
    pause
    exit /b 1
  )
  node "node_modules\typescript\bin\tsc" -p tsconfig.json
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

node "dist\src\index.js"
set "botExitCode=%errorlevel%"
if not "%botExitCode%"=="0" pause
exit /b %botExitCode%
