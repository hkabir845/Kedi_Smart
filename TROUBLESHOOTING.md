# Troubleshooting Guide - Kedi Smart

## Frontend Issues

### "Cannot run dev" - Node Modules Not Installed

**Problem**: `npm run dev` fails with "module not found" errors

**Solution**:
```powershell
cd frontend
npm install
npm run dev
```

### Security Vulnerability Warning

**Problem**: npm shows security vulnerability in Next.js 14.0.4

**Solution** (Optional - for production):
```powershell
cd frontend
npm update next
```

Note: For development, the current version works fine. Update before production deployment.

### Port Already in Use

**Problem**: Error: "Port 3000 is already in use"

**Solutions**:
1. **Kill the process using port 3000**:
   ```powershell
   netstat -ano | findstr :3000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Use a different port**:
   ```powershell
   npm run dev -- -p 3001
   ```
   Then update `backend/app/core/config.py` CORS origins if needed.

### TypeScript Errors

**Problem**: TypeScript compilation errors

**Solutions**:
- Check for missing type definitions: `npm install --save-dev @types/node`
- Check `tsconfig.json` paths configuration
- Verify all imports use correct paths (`@/lib/api`, etc.)

### Module Not Found Errors

**Problem**: "Cannot find module '@/lib/api'" or similar

**Solutions**:
1. Verify `tsconfig.json` has correct paths:
   ```json
   "paths": {
     "@/*": ["./*"]
   }
   ```

2. Restart the dev server after path changes

3. Clear Next.js cache:
   ```powershell
   Remove-Item -Recurse -Force .next
   npm run dev
   ```

## Backend Issues

### Backend Won't Start

**Problem**: `uvicorn app.main:app --reload` fails

**Common Causes**:

1. **Virtual environment not activated**
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   ```

2. **Dependencies not installed**
   ```powershell
   pip install -r requirements.txt
   ```

3. **Port 8000 already in use**
   ```powershell
   # Use different port
   uvicorn app.main:app --reload --port 8001
   ```

4. **Database migration not run**
   ```powershell
   alembic upgrade head
   ```

5. **Import errors**
   - Verify all models are imported in `backend/app/models/__init__.py`
   - Check for circular imports
   - Verify all schemas exist

### Database Errors

**Problem**: "Database locked" or migration errors

**Solutions**:
1. **Database locked**:
   - Close all database connections
   - Restart backend server
   - Delete `backend/data/kedismart.db` and recreate:
     ```powershell
     Remove-Item backend\data\kedismart.db
     alembic upgrade head
     python ../scripts/seed_demo.py
     ```

2. **Migration errors**:
   ```powershell
   # Reset database
   Remove-Item backend\data\kedismart.db
   alembic upgrade head
   ```

3. **Table doesn't exist**:
   ```powershell
   alembic upgrade head
   ```

### Alembic Migration Issues

**Problem**: `alembic upgrade head` fails

**Solutions**:
1. **No migrations found**:
   - First migration needs to be created:
     ```powershell
     alembic revision --autogenerate -m "initial"
     alembic upgrade head
     ```

2. **Import errors in migrations**:
   - Check `backend/alembic/env.py` imports all models
   - Verify model imports in `backend/app/models/__init__.py`

## API Connection Issues

### CORS Errors

**Problem**: Browser shows CORS errors when frontend calls backend

**Solution**: Verify backend CORS configuration in `backend/app/core/config.py`:
```python
BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000"]
```

If frontend runs on different port, add it to the list.

### API Connection Failed

**Problem**: Frontend cannot connect to backend

**Solutions**:
1. **Backend not running**:
   - Verify backend is running on http://localhost:8000
   - Check: `Invoke-RestMethod http://localhost:8000/health`

2. **Wrong API URL**:
   - Check `frontend/lib/api.ts`: `API_URL = 'http://localhost:8000/api/v1'`
   - If backend runs on different port, update URL

3. **Network errors**:
   - Check firewall settings
   - Verify ports are not blocked
   - Try accessing backend directly: http://localhost:8000/docs

## Authentication Issues

### Login Not Working

**Problem**: Login fails or tokens not stored

**Solutions**:
1. **Check backend logs** for error details
2. **Verify credentials**:
   - Admin: admin@kedismart.com / admin123
   - Vet: vet@kedismart.com / vet123
   - Vendor: vendor@kedismart.com / vendor123
   - Owner: owner@kedismart.com / owner123

3. **Check token storage**:
   - Open browser DevTools → Application → Local Storage
   - Verify `access_token` is stored after login

4. **Token expiration**:
   - Tokens expire after 30 minutes (default)
   - Re-login to get new tokens

### Protected Routes Not Working

**Problem**: Can't access dashboard or protected pages

**Solutions**:
1. **Check authentication**:
   - Verify token exists in localStorage
   - Check token format (should start with `eyJ...`)

2. **Check backend logs**:
   - Look for 401 Unauthorized errors
   - Verify token is being sent in Authorization header

3. **Token expired**:
   - Re-login to get fresh token

## Common PowerShell Issues

### Command Not Found

**Problem**: `npm`, `python`, or `alembic` command not found

**Solutions**:
1. **npm**: Install Node.js (includes npm)
2. **python**: Install Python 3.11+
3. **alembic**: Install via pip: `pip install alembic`

### Permission Errors

**Problem**: "Execution Policy" errors in PowerShell

**Solution**: Run PowerShell as Administrator, then:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Issues

**Problem**: Commands work in some directories but not others

**Solutions**:
- Use full paths or navigate to correct directory first
- Verify you're in the correct directory: `pwd` or `Get-Location`

## Performance Issues

### Slow Page Loads

**Solutions**:
1. **Check backend response times** in browser DevTools Network tab
2. **Check database queries** - look for N+1 query problems
3. **Clear browser cache**
4. **Restart both servers**

### Memory Leaks

**Solutions**:
1. Monitor memory usage over time
2. Restart servers periodically during development
3. Check for infinite loops in useEffect hooks (frontend)
4. Verify database connections are properly closed (backend)

## Getting Help

1. **Check logs**:
   - Backend: Terminal running uvicorn
   - Frontend: Browser DevTools Console
   - Frontend build: Terminal running npm run dev

2. **Verify setup**:
   - Run through SETUP_CHECK.md checklist
   - Verify all prerequisites are met

3. **Reset and retry**:
   - Delete `node_modules` and reinstall: `npm install`
   - Delete `.next` cache: `Remove-Item -Recurse -Force .next`
   - Reset database: Delete `backend/data/kedismart.db`, run migrations and seed

4. **Check documentation**:
   - README.md for basic setup
   - TESTING_GUIDE.md for detailed testing
   - QUICK_START.md for quick setup
