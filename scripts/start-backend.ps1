# Start Kedi Smart backend (Django on port 8000)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
$venvPython = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Backend not set up. Run: .\scripts\setup-local.ps1" -ForegroundColor Red
    exit 1
}

try {
    & $venvPython --version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "broken venv" }
} catch {
    Write-Host "Virtual environment is broken. Run: .\scripts\setup-local.ps1" -ForegroundColor Red
    exit 1
}

$portInUse = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port 8000 is already in use (PID $($portInUse[0].OwningProcess))." -ForegroundColor Yellow
}

Write-Host "Starting backend at http://localhost:8000" -ForegroundColor Green
Write-Host "Health:   http://localhost:8000/health" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

Set-Location $backend
& $venvPython manage.py runserver 8000
