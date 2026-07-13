# Setup Verification Checklist

Use this checklist to verify your local development environment is ready.

## Prerequisites ✅

- [x] Python 3.11+ installed (You have: Python 3.13.1 ✅)
- [x] Node.js 18+ installed (You have: Node v22.14.0 ✅)
- [x] npm installed (comes with Node.js)

## Backend Setup Checklist

### 1. Virtual Environment
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
- [ ] Virtual environment created
- [ ] Virtual environment activated (you should see `(.venv)` in prompt)

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```
- [ ] All packages installed without errors
- [ ] Check: `pip list` shows fastapi, uvicorn, sqlalchemy, etc.

### 3. Database Setup
```powershell
alembic upgrade head
```
- [ ] Migrations run successfully
- [ ] Database file created at `backend/data/kedismart.db`

### 4. Seed Data
```powershell
python ../scripts/seed_demo.py
```
- [ ] Seed script runs successfully
- [ ] Demo users created (admin, vet, vendor, owner)
- [ ] Demo data created (pets, products, listings, etc.)

### 5. Start Backend
```powershell
uvicorn app.main:app --reload --port 8000
```
- [ ] Server starts without errors
- [ ] Visit http://localhost:8000 - should see `{"message": "Kedi Smart API"}`
- [ ] Visit http://localhost:8000/docs - should see Swagger UI
- [ ] Visit http://localhost:8000/health - should see `{"status": "healthy"}`

## Frontend Setup Checklist

### 1. Install Dependencies
```powershell
cd frontend
npm install
```
- [ ] All packages installed without errors
- [ ] Check: `node_modules` directory exists

### 2. Start Development Server
```powershell
npm run dev
```
- [ ] Server starts without errors
- [ ] Visit http://localhost:3000 - should see homepage
- [ ] No console errors in browser DevTools

## Integration Testing

### Backend API Tests

1. **Health Check**
   ```powershell
   Invoke-RestMethod http://localhost:8000/health
   ```
   Expected: `{"status": "healthy"}`

2. **Login Test**
   ```powershell
   $body = @{email="admin@kedismart.com"; password="admin123"} | ConvertTo-Json
   Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/login -Method POST -Body $body -ContentType "application/json"
   ```
   Expected: JSON with `access_token` and `refresh_token`

3. **Protected Endpoint Test**
   ```powershell
   $token = "YOUR_ACCESS_TOKEN_FROM_LOGIN"
   $headers = @{Authorization="Bearer $token"}
   Invoke-RestMethod -Uri http://localhost:8000/api/v1/auth/me -Headers $headers
   ```
   Expected: User data (email, role, etc.)

### Frontend Tests

1. **Homepage**
   - [ ] Loads without errors
   - [ ] Navigation links visible
   - [ ] No console errors

2. **Login Flow**
   - [ ] Navigate to `/login`
   - [ ] Enter credentials: admin@kedismart.com / admin123
   - [ ] Login successful, redirected to dashboard
   - [ ] Token stored in localStorage

3. **Dashboard**
   - [ ] Dashboard loads after login
   - [ ] Role-based navigation visible
   - [ ] Can navigate to role-specific pages

4. **Admin Pages** (login as admin@kedismart.com)
   - [ ] `/admin` - Dashboard loads
   - [ ] `/admin/users` - User list loads
   - [ ] `/admin/moderation` - Moderation queue loads
   - [ ] `/admin/verifications` - Verifications load
   - [ ] `/admin/orders` - Orders list loads
   - [ ] `/admin/settings` - Settings page loads

5. **Public Pages**
   - [ ] `/shop` - Product listing loads
   - [ ] `/blog` - Blog listing loads
   - [ ] `/vets` - Vet listing loads
   - [ ] `/marketplace` - Marketplace listing loads

## Common Issues & Quick Fixes

### Backend Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` again |
| `alembic: command not found` | Install alembic: `pip install alembic` |
| Port 8000 already in use | Change port: `--port 8001` |
| Database locked | Close other connections, restart backend |
| Migration errors | Delete `backend/data/kedismart.db`, run `alembic upgrade head` again |

### Frontend Issues

| Issue | Solution |
|-------|----------|
| `npm: command not found` | Install Node.js |
| Port 3000 already in use | Next.js will auto-use 3001, or: `npm run dev -- -p 3001` |
| API connection errors | Check backend is running on port 8000 |
| CORS errors | Check backend CORS settings in `backend/app/core/config.py` |
| Module not found | Run `npm install` again, check `package.json` |

## Next Steps After Setup

1. ✅ Run all checklist items above
2. Test each user role (admin, vet, vendor, owner)
3. Test key workflows:
   - User registration and login
   - Pet creation and management
   - Product browsing and cart
   - Vet appointment booking
   - Admin moderation
4. Check browser console for errors
5. Test API endpoints via Swagger UI
6. Verify file uploads work (pet photos, etc.)

## Performance Checks

- Backend response times < 200ms for simple queries
- Frontend page load < 2 seconds
- No memory leaks (check process memory over time)
- Database queries optimized (check terminal output)
