# Kedi Smart Platform

World-class pet & animal platform with knowledge hub, e-commerce, vet booking, marketplace, and pet identity management.

## Portable SSD / Multi-PC Workflow

Your code and database live on the drive; Python/Node runtimes live on each PC. **Do not rely on global `python`** — use the project bootstrap once per machine:

```powershell
# From project root (after plugging in the drive):
.\scripts\bootstrap.ps1          # full repair + Cursor config
.\scripts\bootstrap.ps1 -Quick   # deps/migrate only, skip seed

# Then start working:
.\scripts\start-backend.ps1
.\scripts\start-frontend.ps1
```

`python manage.py ...` also works without activating the venv — `manage.py` auto-uses `backend\.venv`.

Install on each PC once: **Python 3.11+** and **Node.js 18+** (`winget install Python.Python.3.13 OpenJS.NodeJS.LTS`).

Drive-level helper (all projects under `ITProjects`):

```powershell
I:\ITProjects\portable-bootstrap.ps1 -Project Kedi_Smart
```

## Tech Stack

- **Backend**: Django + Django REST Framework (Python 3.11+)
- **Frontend**: Next.js 14+ (App Router, TypeScript)
- **Database**: SQLite (file-based, stored in `/backend/data/kedismart.db`)
- **No Docker or external services required** - fully self-contained

## Quick Start

### Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell
# source .venv/bin/activate    # Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python ..\scripts\seed_demo.py
python manage.py runserver 8000
```

Backend runs at: `http://localhost:8000`
Health check: `http://localhost:8000/health`

### Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:3000`

## Demo Credentials

After seeding:
- **Super Admin**: admin@kedismart.com / admin123
- **Vet**: vet@kedismart.com / vet123
- **Vendor**: vendor@kedismart.com / vendor123
- **Owner**: owner@kedismart.com / owner123

## Project Structure

```
.
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/      # API routers
│   │   ├── core/     # Config, security, settings
│   │   ├── db/       # Database session, base models
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   └── utils/    # Utilities
│   ├── data/         # SQLite database
│   ├── uploads/      # File uploads
│   └── alembic/      # Migrations
├── frontend/         # Next.js application
│   ├── app/          # App Router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities, API client
│   └── public/       # Static assets
├── docs/             # Documentation
└── scripts/          # Seed scripts
```

## Features

- 🔐 **Authentication & RBAC**: JWT auth with role-based permissions
- 🐾 **Pet Profiles**: Digital pet passports with medical records, vaccines
- 🏷️ **NFC/QR Tags**: Tag ordering, activation, lost/found, masked messaging
- 📚 **Knowledge Hub**: SEO-optimized care guides, disease information
- 📝 **Community Blog**: User-generated content with comments/likes
- 🛒 **E-commerce**: Full catalog, cart, checkout, orders, reviews
- 🏥 **Vet Booking**: Directory, availability, appointments, consultation notes
- 🏪 **Marketplace**: Buy/sell pets, adoptions, moderation
- 👥 **Multi-role**: Owner, Vet, Vendor, Seller, Shelter, Admin
- 🔍 **SEO-First**: Schema markup, clean URLs, meta controls
- 📊 **Admin Dashboard**: Moderation, analytics, platform settings

## Documentation

See `/docs` folder:
- `ARCHITECTURE.md` - System architecture and design decisions
- `ERD.md` - Entity relationship diagram
- `SEO_PLAYBOOK.md` - SEO guidelines and patterns
- `FEATURE_CHECKLIST.md` - Complete feature implementation status

See root folder:
- `QUICK_START.md` - Quick setup guide (5 minutes)
- `TESTING_GUIDE.md` - Comprehensive testing and development guide
- `SETUP_CHECK.md` - Setup verification checklist

## Development

### Database Migrations

```powershell
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Seed Demo Data

```powershell
cd backend
python ../scripts/seed_demo.py
```

### Environment Variables

Backend: Create `backend/.env` (see `backend/.env.example`)
Frontend: Create `frontend/.env.local` (see `frontend/.env.local.example`)

## License

Proprietary - Kedi Smart Platform
