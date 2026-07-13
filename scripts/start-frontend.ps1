# Start Kedi Smart frontend (Next.js on port 3000)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"

$nodeDir = "C:\Program Files\nodejs"
$npm = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $npm)) {
    Write-Host "Node.js not found. Install with: winget install OpenJS.NodeJS.LTS" -ForegroundColor Red
    exit 1
}
$env:Path = "$nodeDir;$env:Path"

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Frontend dependencies missing. Run: .\scripts\setup-local.ps1" -ForegroundColor Red
    exit 1
}

$portInUse = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port 3000 is already in use (PID $($portInUse[0].OwningProcess)). Next.js may use 3001." -ForegroundColor Yellow
}

Write-Host "Starting frontend at http://localhost:3000" -ForegroundColor Green
Write-Host "API target: http://localhost:8000/api/v1 (default)" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

Set-Location $frontend
& $npm run dev
