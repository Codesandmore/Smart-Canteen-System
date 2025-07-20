@echo off
echo Smart Canteen System - Quick Setup
echo ===================================
echo.

echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Initializing database...
call npm run init-db

if %errorlevel% neq 0 (
    echo Error: Failed to initialize database
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
echo.
echo Starting the server...
echo You can access the application at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
