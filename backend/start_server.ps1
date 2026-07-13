# PowerShell script to start the Django backend server
Write-Host "Starting Kedi Smart Backend Server (Django)..." -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
.\.venv\Scripts\python.exe manage.py runserver 8000
