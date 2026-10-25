@echo off
cd /d "%~dp0"
echo Deploying Amson Pharmaceuticals to https://amsonpharma.web.app
echo.

if not exist firebase.json (
  echo firebase.json is missing - pull the latest code first ^(pull-latest.bat^).
  goto end
)

echo Pulling latest changes from GitHub...
git pull origin webapp
if errorlevel 1 (
  echo.
  echo The pull failed, so nothing was deployed. Fix the message above first.
  goto end
)
echo.

REM The deploy uploads this folder exactly as it is, so warn about edits
REM that were never committed.
set CHANGES=0
for /f %%i in ('git status --porcelain ^| find /c /v ""') do set CHANGES=%%i
if not "%CHANGES%"=="0" (
  echo WARNING: this folder has %CHANGES% file^(s^) changed or added that are not on GitHub:
  git status --short
  echo They will be published too.
  echo.
)

choice /c YN /m "Publish this version to the live site now"
if errorlevel 2 (
  echo Cancelled - nothing was deployed.
  goto end
)
echo.

REM --only hosting: publishes the website only, never the database rules.
REM The first time on this computer, run "npx firebase-tools login" first.
call npx.cmd --yes firebase-tools deploy --only hosting
if errorlevel 1 (
  echo.
  echo Deploy failed. If it says you are not logged in, run:
  echo     npx firebase-tools login
  echo and sign in with the account that owns the amson-web-app project.
  goto end
)
echo.
echo Live at https://amsonpharma.web.app ^(and the old https://amson-web-app.web.app^) - refresh to see it.
echo To undo: Firebase console - Hosting - Release history - Rollback.

:end
echo.
echo Press any key to close this window.
pause >nul
