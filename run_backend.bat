@echo off
setlocal
cd /d "%~dp0backend"
echo ========================================
echo SymbioLoop - Backend Setup and Launch
echo ========================================
where py >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python launcher 'py' was not found. Install Python 3.11 or 3.12 from https://www.python.org/downloads/ and enable Add Python to PATH.
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe (
  echo Creating Python virtual environment...
  py -m venv .venv
  if errorlevel 1 (echo ERROR: Could not create virtual environment.& pause & exit /b 1)
)
call .venv\Scripts\activate.bat
if not exist .env (
  if exist .env.example copy .env.example .env >nul
  echo.
  echo IMPORTANT: A new backend/.env was created from .env.example.
  echo Before using MySQL, run backend/schema_mysql.sql in MySQL Workbench,
  echo then edit backend/.env and replace YOUR_MYSQL_PASSWORD.
  echo If .env is not configured, the backend will not connect to MySQL.
  echo.
  pause
)
echo Installing/verifying backend dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (echo ERROR: Backend dependencies could not be installed. Check your internet connection and Python version.& pause & exit /b 1)
echo Starting API at http://127.0.0.1:8000
echo API docs: http://127.0.0.1:8000/docs
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
