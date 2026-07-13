# Start Next.js dev server (works even when npm is not on PATH)
$ErrorActionPreference = "Stop"
$nodeDir = "C:\Program Files\nodejs"
$npm = Join-Path $nodeDir "npm.cmd"

if (-not (Test-Path $npm)) {
    Write-Host "Node.js not found. Install with: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    exit 1
}

$env:Path = "$nodeDir;$env:Path"
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & $npm install
}

Write-Host "Starting frontend at http://localhost:3000" -ForegroundColor Green
& $npm run dev
