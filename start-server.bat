@echo off
echo Starting Smart Canteen System...
echo.
echo Checking for Node.js...
node --version
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo.
echo Starting server...
node server.js
pause
