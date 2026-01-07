@echo off
REM AI Chatbot Lab - Windows Startup Script
REM This script starts both the backend API server and frontend dev server

echo ====================================
echo   AI Chatbot Lab - Starting...
echo ====================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Dependencies not found. Installing...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found
    echo [INFO] Creating .env from template...
    copy .env.example .env
    echo [WARNING] Please configure .env file with your API keys
    echo.
)

echo [INFO] Starting backend server...
start "Backend API" cmd /k "npm run api"

timeout /t 2 /nobreak > nul

echo [INFO] Starting frontend dev server...
start "Frontend Dev" cmd /k "npm run dev"

echo.
echo ====================================
echo   Servers are starting...
echo ====================================
echo.
echo Backend API: Check the "Backend API" window
echo Frontend Dev: Check the "Frontend Dev" window
echo.
echo Press any key to exit this window...
pause > nul
