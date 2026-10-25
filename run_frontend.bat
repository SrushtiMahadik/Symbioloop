@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo SymbioLoop - Frontend Setup and Launch
echo ========================================
where node >nul 2>nul
if errorlevel 1 (echo ERROR: Node.js was not found. Install Node.js 20 LTS or newer from https://nodejs.org/ and restart VS Code.& pause & exit /b 1)
where npm >nul 2>nul
if errorlevel 1 (echo ERROR: npm was not found. Repair your Node.js installation.& pause & exit /b 1)
if not exist package.json (echo ERROR: package.json missing. Run this file from the extracted project folder.& pause & exit /b 1)
if not exist node_modules\vite\bin\vite.js (
  echo Installing frontend dependencies. This may take a few minutes...
  call npm install
  if errorlevel 1 (echo ERROR: npm install failed. Check internet connection and package errors.& pause & exit /b 1)
)
echo Starting frontend. Use the URL printed below.
call npm run dev -- --host 127.0.0.1
pause
