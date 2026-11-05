@echo off
cd /d "%~dp0"
echo Starting local server for Amson Pharmaceuticals...
echo (Leave this window open while testing. Press Ctrl+C to stop the server.)
echo.

start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080/shop/index.html"

REM -c-1 turns off caching so you always get the code you just pulled
npx.cmd http-server -p 8080 -c-1

pause
