# How to Run Backend Server - Django

## Quick Start

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py runserver 8000
```

Or use the helper script:

```powershell
cd backend
.\start_server.ps1
```

## First-time setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python ..\scripts\seed_demo.py
python manage.py runserver 8000
```

## URLs

- **API base**: http://localhost:8000/api/v1/
- **Health**: http://localhost:8000/health
- **Django admin**: http://localhost:8000/admin/

## Demo credentials

After seeding:
- admin@kedismart.com / admin123
- vet@kedismart.com / vet123
- vendor@kedismart.com / vendor123
- owner@kedismart.com / owner123

## Notes

- The backend was migrated from FastAPI to **Django REST Framework**
- API routes remain under `/api/v1/` for frontend compatibility
- Legacy FastAPI code is kept in `backend/app/` for reference during migration
