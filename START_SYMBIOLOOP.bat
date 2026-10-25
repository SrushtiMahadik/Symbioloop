@echo off
set "ROOT=%~dp0"
echo Starting SymbioLoop in two windows...
start "SymbioLoop Backend" cmd /k ""%ROOT%run_backend.bat""
timeout /t 3 /nobreak >nul
start "SymbioLoop Frontend" cmd /k ""%ROOT%run_frontend.bat""
echo.
echo Backend API docs: http://127.0.0.1:8000/docs
echo Frontend: http://localhost:5173 (after Vite starts)
echo Keep both terminal windows open while using SymbioLoop.
pause
