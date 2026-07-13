# Quick Start Guide - Kedi Smart

Get the application running locally in 5 minutes!

## Step 1: Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python ../scripts/seed_demo.py
uvicorn app.main:app --reload --port 8000
```

✅ Backend running at: **http://localhost:8000**

## Step 2: Frontend Setup (New Terminal)

```powershell
cd frontend
npm install
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

## Step 3: Test the Application

1. Visit http://localhost:3000
2. Click "Login" or "Register"
3. Use demo credentials:
   - **Admin**: admin@kedismart.com / admin123
   - **Vet**: vet@kedismart.com / vet123
   - **Vendor**: vendor@kedismart.com / vendor123
   - **Owner**: owner@kedismart.com / owner123

## API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Quick Test Endpoints

```powershell
# Health check
Invoke-RestMethod http://localhost:8000/health

# Login
$login = @{email="admin@kedismart.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/login -Method POST -Body $login -ContentType "application/json"
```

## Troubleshooting

- **Backend won't start**: Check Python version (3.11+), activate venv
- **Frontend won't start**: Run `npm install`, check Node version (18+)
- **Database errors**: Run `alembic upgrade head`
- **API errors**: Check backend is running on port 8000

For detailed testing guide, see [TESTING_GUIDE.md](TESTING_GUIDE.md)
