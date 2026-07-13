# Kedi Smart - Plug-in-and-work bootstrap (run once per PC / when env is broken)
# Usage: .\scripts\bootstrap.ps1
#        .\scripts\bootstrap.ps1 -Quick   # skip seed, only repair deps
param(
    [switch]$Quick
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venvPython = Join-Path $backend ".venv\Scripts\python.exe"
$vscodeDir = Join-Path $root ".vscode"

function Require-Command($name, $installHint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$name' not found. $installHint" -ForegroundColor Red
        exit 1
    }
}

function Test-VenvPython($path) {
    if (-not (Test-Path $path)) { return $false }
    try {
        & $path -c "import django" 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Write-Host "`n=== Kedi Smart Bootstrap ===" -ForegroundColor Cyan
Write-Host "Portable drive workflow: repairs venv/deps and configures Cursor.`n" -ForegroundColor Gray

Require-Command "python" "Install Python 3.11+: winget install Python.Python.3.13"
Require-Command "node" "Install Node.js 18+: winget install OpenJS.NodeJS.LTS"
Require-Command "npm" "npm ships with Node.js"

# Backend venv — recreate when missing or broken (common after switching PCs)
if (-not (Test-VenvPython $venvPython)) {
    Write-Host "Creating/repairing backend virtual environment..." -ForegroundColor Yellow
    $venvDir = Join-Path $backend ".venv"
    if (Test-Path $venvDir) {
        Remove-Item -Recurse -Force $venvDir
    }
    Push-Location $backend
    python -m venv .venv
    Pop-Location
}

Write-Host "Syncing backend dependencies..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip -q
& $venvPython -m pip install -r (Join-Path $backend "requirements.txt") -q

$dataDir = Join-Path $backend "data"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir | Out-Null
}

Write-Host "Running database migrations..." -ForegroundColor Yellow
Push-Location $backend
& $venvPython manage.py migrate --noinput
& $venvPython manage.py seed_commerce
& $venvPython manage.py seed_pet_catalog
& $venvPython manage.py seed_general_catalog
& $venvPython manage.py create_admin
Pop-Location

if (-not $Quick) {
    Write-Host "Seeding demo data (skip with -Quick)..." -ForegroundColor Yellow
    & $venvPython (Join-Path $root "scripts\seed_demo.py")
}

# Frontend
$nodeModules = Join-Path $frontend "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontend
    npm install
    Pop-Location
} else {
    Write-Host "Frontend node_modules present." -ForegroundColor Gray
}

# Cursor / VS Code — always use project venv in terminal and language server
if (-not (Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir | Out-Null
}
$settingsPath = Join-Path $vscodeDir "settings.json"
$settings = @{
    "python.defaultInterpreterPath" = "`${workspaceFolder}/backend/.venv/Scripts/python.exe"
    "python.terminal.activateEnvironment" = $true
    "terminal.integrated.cwd" = "`${workspaceFolder}"
} | ConvertTo-Json -Depth 3
Set-Content -Path $settingsPath -Value $settings -Encoding UTF8
Write-Host "Configured Cursor/VS Code Python interpreter." -ForegroundColor Gray

Write-Host "`nBootstrap complete." -ForegroundColor Green
Write-Host "  Backend:  .\scripts\start-backend.ps1" -ForegroundColor Gray
Write-Host "  Frontend: .\scripts\start-frontend.ps1" -ForegroundColor Gray
Write-Host "  Or:       cd backend; python manage.py runserver 8000" -ForegroundColor Gray
Write-Host ""
