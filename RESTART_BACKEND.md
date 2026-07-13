# How to Restart the Backend Server

## Quick Steps:

### Option 1: If using a terminal window
1. Go to your backend terminal window
2. Press `Ctrl+C` to stop the server
3. Run the start command again:
   ```bash
   cd backend
   .venv\Scripts\python.exe -m uvicorn app.main:app --reload
   ```

### Option 2: Using PowerShell Script
```powershell
cd backend
.\START_SERVER.ps1
```

### Option 3: Using Batch Script (Windows)
```cmd
cd backend
START_SERVER.bat
```

### Option 4: Manual Restart
```powershell
# Stop any process on port 8000 (if needed)
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*uvicorn*" } | Stop-Process -Force

# Start the server
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## After Restart:
1. Check that the server is running at: http://localhost:8000
2. Check API docs at: http://localhost:8000/docs
3. Refresh your shop page: http://localhost:3000/shop

The API serialization fix has been applied, so products should now display correctly!
