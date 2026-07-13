# Check Backend Server Status

## Quick Status Check

Run this command to check if the backend is running:
```powershell
Invoke-RestMethod http://localhost:8000/health
```

If you see `{"status": "healthy"}`, the server is running correctly.

## Check Port Status

To see what's using port 8000:
```powershell
Get-NetTCPConnection -LocalPort 8000 | Select-Object LocalAddress, LocalPort, State, OwningProcess
```

## Stop Existing Server

If port 8000 is occupied by the wrong process:
```powershell
# Find the process
$process = Get-NetTCPConnection -LocalPort 8000 | Select-Object -ExpandProperty OwningProcess
# Kill it
Stop-Process -Id $process -Force
```

## Start Server Correctly

Always use the virtual environment Python:
```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Verify Server is Working

1. **Health Check**: http://localhost:8000/health
2. **API Docs**: http://localhost:8000/docs
3. **Root**: http://localhost:8000/
