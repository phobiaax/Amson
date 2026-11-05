@echo off
cd /d "%~dp0"
REM pulls the newest code for whatever branch this folder is on

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if "%BRANCH%"=="" (
  echo Couldn't tell which branch this folder is on. Is Git installed?
  goto end
)

echo This folder is on branch: %BRANCH%
echo Pulling the latest %BRANCH% from GitHub...
echo.
git pull origin %BRANCH%
if errorlevel 1 (
  echo.
  echo The pull failed - read the message above. Nothing else was changed.
  goto end
)

echo.
echo Done. Start the site with start-server.bat to test it.
echo To switch branch first:  git checkout cleanup   or   git checkout webapp

:end
echo.
echo Press any key to close this window.
pause >nul
