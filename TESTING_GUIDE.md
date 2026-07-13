# Kedi Smart - Local Testing & Development Guide

## Prerequisites

- Python 3.11+ installed
- Node.js 18+ and npm installed
- PowerShell (Windows) or bash (Linux/Mac)

## Initial Setup

### 1. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# For Linux/Mac:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed demo data
python ../scripts/seed_demo.py

# Start backend server (runs on http://localhost:8000)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

Open a new terminal window:

```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:3000)
npm run dev
```

## Demo Credentials

After seeding, you can use these accounts:

- **Super Admin**: admin@kedismart.com / admin123
- **Vet**: vet@kedismart.com / vet123
- **Vendor**: vendor@kedismart.com / vendor123
- **Owner**: owner@kedismart.com / owner123

## Testing Checklist

### Backend Testing

1. **API Documentation**
   - Visit http://localhost:8000/docs (Swagger UI)
   - Visit http://localhost:8000/redoc (ReDoc)

2. **Health Check**
   - GET http://localhost:8000/health
   - Should return: `{"status": "healthy"}`

3. **Authentication**
   - POST http://localhost:8000/api/v1/auth/register
   - POST http://localhost:8000/api/v1/auth/login
   - POST http://localhost:8000/api/v1/auth/me (requires token)

### Frontend Testing

1. **Homepage**
   - Visit http://localhost:3000
   - Should display homepage with navigation

2. **Authentication Flow**
   - Register new user: http://localhost:3000/register
   - Login: http://localhost:3000/login
   - Test with demo credentials

3. **Public Pages**
   - Shop: http://localhost:3000/shop
   - Blog: http://localhost:3000/blog
   - Vets: http://localhost:3000/vets
   - Marketplace: http://localhost:3000/marketplace

4. **Dashboard Pages** (requires login)
   - Owner: http://localhost:3000/dashboard
   - Vet: http://localhost:3000/dashboard/vet/profile
   - Vendor: http://localhost:3000/dashboard/vendor/products
   - Admin: http://localhost:3000/admin

5. **Admin Pages** (requires admin login)
   - Users: http://localhost:3000/admin/users
   - Moderation: http://localhost:3000/admin/moderation
   - Verifications: http://localhost:3000/admin/verifications
   - Orders: http://localhost:3000/admin/orders
   - Settings: http://localhost:3000/admin/settings

## Common Issues & Solutions

### Backend Issues

1. **Database not found**
   - Solution: Run `alembic upgrade head` to create database
   - Database file will be created at: `backend/data/kedismart.db`

2. **Port 8000 already in use**
   - Solution: Change port: `uvicorn app.main:app --reload --port 8001`
   - Update frontend API URL if changed

3. **Import errors**
   - Solution: Ensure virtual environment is activated
   - Verify all dependencies installed: `pip install -r requirements.txt`

4. **Migration errors**
   - Solution: Delete `backend/data/kedismart.db` and run `alembic upgrade head` again

### Frontend Issues

1. **API connection errors**
   - Check backend is running on http://localhost:8000
   - Check browser console for CORS errors
   - Verify API_URL in `frontend/lib/api.ts` (default: `http://localhost:8000/api/v1`)

2. **Port 3000 already in use**
   - Solution: Next.js will prompt to use different port, or:
   - `npm run dev -- -p 3001`

3. **Module not found errors**
   - Solution: Run `npm install` again
   - Delete `node_modules` and `package-lock.json`, then `npm install`

4. **TypeScript errors**
   - Check for missing type definitions
   - Run `npm install --save-dev @types/node` if needed

## Development Workflow

### Making Changes

1. **Backend Changes**
   - Code changes auto-reload with `--reload` flag
   - Database changes require new Alembic migration:
     ```powershell
     alembic revision --autogenerate -m "description"
     alembic upgrade head
     ```

2. **Frontend Changes**
   - Next.js hot-reloads on file changes
   - TypeScript errors shown in terminal and browser

### Database Resets

To reset database with fresh demo data:

```powershell
cd backend
# Delete database
Remove-Item data\kedismart.db
# Recreate schema
alembic upgrade head
# Seed data
python ../scripts/seed_demo.py
```

## Testing Different Roles

### Owner Role
1. Login as owner@kedismart.com
2. Test pet management: `/dashboard/pets`
3. Test orders: `/dashboard/orders`
4. Test pet details, medical records, privacy settings

### Vet Role
1. Login as vet@kedismart.com
2. Test profile: `/dashboard/vet/profile`
3. Test appointments: `/dashboard/vet/appointments`
4. Test public vet listing: `/vets`

### Vendor Role
1. Login as vendor@kedismart.com
2. Test products: `/dashboard/vendor/products`
3. Test orders: `/dashboard/vendor/orders`

### Admin Role
1. Login as admin@kedismart.com
2. Test all admin pages
3. Test user management, moderation, settings

## API Testing

### Using Swagger UI

1. Visit http://localhost:8000/docs
2. Click "Authorize" button
3. Enter JWT token from login response
4. Test endpoints interactively

### Using curl (PowerShell)

```powershell
# Login
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/login" -Method POST -Body (@{email="admin@kedismart.com"; password="admin123"} | ConvertTo-Json) -ContentType "application/json"
$token = $response.access_token

# Get current user
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/auth/me" -Method GET -Headers @{Authorization="Bearer $token"}
```

## Performance Testing

1. **Backend Performance**
   - Check response times in browser DevTools Network tab
   - Monitor terminal output for slow queries

2. **Frontend Performance**
   - Use Chrome DevTools Lighthouse
   - Check for unused dependencies
   - Monitor bundle size

## Next Steps

- Add unit tests for critical modules
- Add integration tests for API endpoints
- Set up E2E tests with Playwright/Cypress
- Configure production environment variables
- Set up CI/CD pipeline
