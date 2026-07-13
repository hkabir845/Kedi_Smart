# Kedi Smart - One-time local setup (venv, deps, DB, seed)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venvPython = Join-Path $backend ".venv\Scripts\python.exe"

function Require-Command($name, $installHint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$name' not found. $installHint" -ForegroundColor Red
        exit 1
    }
    try {
        & $name --version 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "not working" }
    } catch {
        Write-Host "ERROR: '$name' is not working. $installHint" -ForegroundColor Red
        exit 1
    }
}

function Test-VenvPython($path) {
    if (-not (Test-Path $path)) { return $false }
    try {
        & $path --version 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Write-Host "`n=== Kedi Smart Local Setup ===" -ForegroundColor Cyan

Require-Command "python" "Install Python 3.11+: winget install Python.Python.3.13"
Require-Command "node" "Install Node.js 18+: winget install OpenJS.NodeJS.LTS"
Require-Command "npm" "npm ships with Node.js"

# Backend venv
if (-not (Test-VenvPython $venvPython)) {
    Write-Host "Creating backend virtual environment..." -ForegroundColor Yellow
    $venvDir = Join-Path $backend ".venv"
    if (Test-Path $venvDir) {
        Write-Host "Removing broken .venv..." -ForegroundColor Gray
        Remove-Item -Recurse -Force $venvDir
    }
    Push-Location $backend
    python -m venv .venv
    Pop-Location
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $backend "requirements.txt")

# Database
$dataDir = Join-Path $backend "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

Write-Host "Running database migrations..." -ForegroundColor Yellow
Push-Location $backend
& $venvPython manage.py migrate --noinput
Pop-Location

$seed = $true
if ($args -contains "--no-seed") { $seed = $false }

if ($seed) {
    Write-Host "Seeding demo data..." -ForegroundColor Yellow
    & $venvPython (Join-Path $root "scripts\seed_demo.py")
}

# Frontend
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontend
npm install
Pop-Location

Write-Host "`nSetup complete." -ForegroundColor Green
Write-Host "Start backend:  .\scripts\start-backend.ps1" -ForegroundColor Gray
Write-Host "Start frontend: .\scripts\start-frontend.ps1" -ForegroundColor Gray
Write-Host ""
