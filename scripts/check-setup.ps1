# Kedi Smart - Local environment check
$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Kedi Smart Setup Check ===" -ForegroundColor Cyan

function Test-CommandAvailable($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) { return $false }
    try {
        & $name --version 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Test-VenvPython($venvPython) {
    if (-not (Test-Path $venvPython)) { return $false }
    try {
        & $venvPython -c "import django" 2>&1 | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

$checks = @()

# Python
$pythonOk = Test-CommandAvailable "python"
$checks += [pscustomobject]@{
    Item = "Python 3.11+"
    Status = if ($pythonOk) { "OK" } else { "MISSING" }
    Detail = if ($pythonOk) { (python --version 2>&1) } else { "Install: winget install Python.Python.3.13" }
}

# Node
$nodeOk = Test-CommandAvailable "node"
$npmOk = Test-CommandAvailable "npm"
$checks += [pscustomobject]@{
    Item = "Node.js 18+"
    Status = if ($nodeOk) { "OK" } else { "MISSING" }
    Detail = if ($nodeOk) { (node --version) } else { "Install: winget install OpenJS.NodeJS.LTS" }
}
$checks += [pscustomobject]@{
    Item = "npm"
    Status = if ($npmOk) { "OK" } else { "MISSING" }
    Detail = if ($npmOk) { (npm --version) } else { "Comes with Node.js" }
}

# Backend venv
$venvPython = Join-Path $root "backend\.venv\Scripts\python.exe"
$venvOk = Test-VenvPython $venvPython
$checks += [pscustomobject]@{
    Item = "Backend virtualenv"
    Status = if ($venvOk) { "OK" } else { "BROKEN/MISSING" }
    Detail = if ($venvOk) { $venvPython } else { "Run: .\scripts\bootstrap.ps1" }
}

# Database
$dbPath = Join-Path $root "backend\data\kedismart.db"
$dbOk = Test-Path $dbPath
$dbSize = if ($dbOk) { "{0:N0} bytes" -f (Get-Item $dbPath).Length } else { "not found"
}
$checks += [pscustomobject]@{
    Item = "SQLite database"
    Status = if ($dbOk) { "OK" } else { "MISSING" }
    Detail = if ($dbOk) { $dbPath + " ($dbSize)" } else { "Created by: python manage.py migrate" }
}

# Frontend deps
$nodeModules = Join-Path $root "frontend\node_modules"
$nmOk = Test-Path $nodeModules
$checks += [pscustomobject]@{
    Item = "Frontend node_modules"
    Status = if ($nmOk) { "OK" } else { "MISSING" }
    Detail = if ($nmOk) { "installed" } else { "Run: cd frontend; npm install" }
}

# Ports
foreach ($port in @(8000, 3000)) {
    $inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    $checks += [pscustomobject]@{
        Item = "Port $port"
        Status = if ($inUse) { "IN USE" } else { "FREE" }
        Detail = if ($inUse) { "PID $($inUse[0].OwningProcess)" } else { "available" }
    }
}

$checks | Format-Table -AutoSize

$ready = $pythonOk -and $nodeOk -and $venvOk -and $dbOk -and $nmOk
if ($ready) {
    Write-Host "Ready to start servers." -ForegroundColor Green
    Write-Host "  Backend:  .\scripts\start-backend.ps1" -ForegroundColor Gray
    Write-Host "  Frontend: .\scripts\start-frontend.ps1" -ForegroundColor Gray
} else {
    Write-Host "Not ready yet. Run bootstrap first:" -ForegroundColor Yellow
    Write-Host "  .\scripts\bootstrap.ps1" -ForegroundColor Gray
}

Write-Host ""
