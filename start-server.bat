@echo off
cd /d "%~dp0"
echo Starting local server for Amson Pharmaceuticals...
echo (Leave this window open while testing. Press Ctrl+C to stop the server.)
echo.

start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080/shop/index.html"

REM -c-1 turns off browser caching, so a page always runs the code you just
REM pulled (no hard refresh needed after "pull-latest").
npx.cmd http-server -p 8080 -c-1

pause
