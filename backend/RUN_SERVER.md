# How to Run FastAPI Server - Kedi Smart

## Quick Start (Step-by-Step)

### 1. Navigate to Backend Directory
```powershell
cd backend
```

### 2. Activate Virtual Environment
```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# Or use Python directly (if activation doesn't work)
# Skip this step and use .\.venv\Scripts\python.exe instead of python
```

### 3. Install Dependencies (if not already installed)
```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 4. Create Database Migrations (if needed)
```powershell
# Create initial migration (only needed once)
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "initial"

# Apply migrations
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### 5. Start the Server
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

**Alternative (if uvicorn is in PATH after activation):**
```powershell
uvicorn app.main:app --reload --port 8000
```

## Server URLs

Once running, the server will be available at:
- **API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## Troubleshooting

### Port Already in Use
If port 8000 is already in use:
```powershell
# Use a different port
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

### Database Not Found
The database will be created automatically in `backend/data/kedismart.db` when you run migrations or start the server.

### Import Errors
Make sure you're in the `backend` directory when running commands.

### Virtual Environment Issues
If activation doesn't work, always use the full path:
```powershell
.\.venv\Scripts\python.exe -m <command>
```

## Development Mode

The `--reload` flag enables auto-reload on code changes. Remove it for production:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

## Seed Demo Data (Optional)

After starting the server, you can seed demo data:
```powershell
# In a new terminal
cd backend
.\.venv\Scripts\python.exe ..\scripts\seed_demo.py
```

Demo credentials will be:
- Admin: admin@kedismart.com / admin123
- Vet: vet@kedismart.com / vet123
- Vendor: vendor@kedismart.com / vendor123
- Owner: owner@kedismart.com / owner123
