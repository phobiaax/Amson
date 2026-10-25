@echo off
cd /d "%~dp0"
echo Pulling latest changes from GitHub...
echo.

git pull origin webapp

echo.
echo Done. Press any key to close this window.
pause >nul
