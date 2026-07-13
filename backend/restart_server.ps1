# Script to kill all old server processes and start fresh
Write-Host "Stopping all Python processes on port 8000..." -ForegroundColor Yellow

# Get all processes listening on port 8000
$listening = netstat -ano | findstr ":8000.*LISTENING"
if ($listening) {
    $pids = $listening | ForEach-Object { 
        $parts = $_ -split '\s+'
        $parts[-1]
    } | Sort-Object -Unique
    
    foreach ($pid in $pids) {
        Write-Host "Killing process PID: $pid" -ForegroundColor Red
        taskkill /F /PID $pid /T 2>$null
    }
}

Start-Sleep -Seconds 2

# Verify port is free
$stillListening = netstat -ano | findstr ":8000.*LISTENING"
if ($stillListening) {
    Write-Host "Warning: Some processes are still running. You may need to restart your computer." -ForegroundColor Yellow
} else {
    Write-Host "Port 8000 is now free!" -ForegroundColor Green
}

Write-Host "`nStarting fresh server..." -ForegroundColor Green
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = $PWD
python -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
