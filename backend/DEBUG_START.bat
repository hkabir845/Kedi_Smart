@echo off
echo ========================================
echo Kedi Smart Backend - Debug Startup
echo ========================================
echo.

cd /d %~dp0

echo [1/5] Checking Python...
.\.venv\Scripts\python.exe --version
if errorlevel 1 (
    echo ERROR: Python not found in virtual environment!
    echo Run: python -m venv .venv
    pause
    exit /b 1
)
echo.

echo [2/5] Checking dependencies...
.\.venv\Scripts\python.exe -m pip list | findstr /i "fastapi uvicorn"
if errorlevel 1 (
    echo ERROR: Dependencies not installed!
    echo Run: .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)
echo.

echo [3/5] Testing imports...
.\.venv\Scripts\python.exe -c "from app.main import app; print('OK')" 2>&1
if errorlevel 1 (
    echo ERROR: Import failed! Check error above.
    pause
    exit /b 1
)
echo.

echo [4/5] Checking port 8000...
netstat -ano | findstr :8000
if not errorlevel 1 (
    echo WARNING: Port 8000 is in use!
    echo You may need to stop the existing process first.
    echo.
    choice /C YN /M "Continue anyway"
    if errorlevel 2 exit /b 1
)
echo.

echo [5/5] Starting server...
echo.
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
pause
