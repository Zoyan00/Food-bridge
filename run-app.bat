@echo off
title FoodBridge - Food Waste Redistribution System
color 0A

echo ====================================================================
echo   FOODBRIDGE - REAL-TIME FOOD REDISTRIBUTION APP
echo ====================================================================
echo.
echo [1/3] Checking Node.js environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [2/3] Starting Persistent Real-Time Application Server on port 3000...
start "FoodBridge Server" /min cmd /c "node server.js"

echo Waiting for server to initialize...
timeout /t 2 /nobreak >nul

echo [3/3] Launching FoodBridge Desktop App Window...
set APP_URL=http://localhost:3000
start %APP_URL%

echo.
echo ====================================================================
echo   SUCCESS! FoodBridge App is running at %APP_URL%
echo.
echo   Keep this window open or minimize it while using the app.
echo ====================================================================
pause
