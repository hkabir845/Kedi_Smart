@echo off
echo Starting Kedi Smart Backend Server (Django)...
echo.
cd /d %~dp0
.\.venv\Scripts\python.exe manage.py runserver 8000
pause
