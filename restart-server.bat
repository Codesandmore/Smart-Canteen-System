@echo off
echo Stopping any existing server processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Smart Canteen System...
echo Server will be available at http://localhost:3000
echo.

node server.js
