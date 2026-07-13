# Pagination Implementation Guide

This document provides a step-by-step guide for implementing pagination across all modules.

## 📋 Current Status

### ✅ Already Implemented
- Backend pagination utility (`backend/app/utils/pagination.py`)
- Shop page (`/shop`) - Frontend pagination
- Backend endpoints with pagination:
  - `/shop/products`
  - `/blog/posts`
  - `/marketplace/listings`
  - `/pets`

### ⚠️ Needs Implementation

#### Backend Endpoints (Standardization Needed)
1. `/admin/users` - Currently uses skip/limit, needs page/size
2. `/admin/orders` - Currently uses skip/limit, needs page/size
3. `/vets/appointments` - Check implementation
4. `/dashboard/orders` - Check if endpoint exists

#### Frontend Pages
1. `/blog` - Check if pagination exists
2. `/marketplace` - Check if pagination exists
3. `/dashboard/pets`
4. `/dashboard/orders`
5. `/dashboard/listings`
6. `/dashboard/vendor/products`
7. `/dashboard/vendor/orders`
8. `/dashboard/vet/appointments`
9. `/admin/users`
10. `/admin/orders`
11. `/admin/moderation`
12. `/admin/verifications`

---

## 🔧 Implementation Steps

### Step 1: Backend Standardization

#### For `/admin/users` endpoint:

**Current:**
```python
@router.get("/users", response_model=List[dict])
def list_users(
    skip: int = 0,
    limit: int = 50,
    ...
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users
```

**Updated:**
```python
@router.get("/users", response_model=dict)
def list_users(
    page: int = 1,
    size: int = 50,
    ...
):
    query = db.query(User)
    items, total, page, size, pages = paginate(query, page, size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }
```

#### For `/admin/orders` endpoint:

Apply the same pattern - replace skip/limit with page/size and use paginate() utility.

---

### Step 2: Frontend Implementation

#### Template for List Pages with Pagination:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Pagination from '@/components/Pagination'
import { api } from '@/lib/api'

export default function MyListPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    fetchItems()
  }, [page, router])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: '20',
      })
      
      const data = await api.get(`/endpoint?${params.toString()}`)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Items</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No items found</p>
          </div>
        ) : (
          <>
            {/* Your list items here */}
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                  {/* Item content */}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}
```

---

## 📝 Implementation Checklist

### Backend

- [ ] Update `/admin/users` endpoint
  - [ ] Change parameters from skip/limit to page/size
  - [ ] Use paginate() utility
  - [ ] Update response format
  - [ ] Test with API docs

- [ ] Update `/admin/orders` endpoint
  - [ ] Change parameters from skip/limit to page/size
  - [ ] Use paginate() utility
  - [ ] Update response format
  - [ ] Test with API docs

- [ ] Check `/vets/appointments` endpoint
  - [ ] Verify pagination implementation
  - [ ] Standardize if needed

- [ ] Verify all endpoints return consistent format:
  ```json
  {
    "items": [...],
    "total": 150,
    "page": 1,
    "size": 20,
    "pages": 8
  }
  ```

### Frontend

- [ ] `/blog` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/marketplace` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/pets` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/orders` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/listings` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/vendor/products` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/vendor/orders` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/dashboard/vet/appointments` page
  - [ ] Add pagination state
  - [ ] Update fetch function
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/admin/users` page
  - [ ] Update to use new API format
  - [ ] Add pagination state
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/admin/orders` page
  - [ ] Update to use new API format
  - [ ] Add pagination state
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/admin/moderation` page
  - [ ] Check if endpoint has pagination
  - [ ] Add pagination if needed
  - [ ] Add Pagination component
  - [ ] Test navigation

- [ ] `/admin/verifications` page
  - [ ] Check if endpoint has pagination
  - [ ] Add pagination if needed
  - [ ] Add Pagination component
  - [ ] Test navigation

---

## 🧪 Testing

For each implementation:

1. **Backend Testing:**
   - Test with page=1, size=20
   - Test with page=2, size=20
   - Test with large page numbers
   - Test with size limits (max 100)
   - Verify total and pages calculation

2. **Frontend Testing:**
   - Test pagination navigation
   - Test with empty results
   - Test with single page
   - Test with many pages
   - Test responsive design
   - Test loading states

---

## 📚 References

- Pagination Component: `frontend/components/Pagination.tsx`
- Backend Utility: `backend/app/utils/pagination.py`
- Development Guide: `docs/DEVELOPMENT_GUIDE.md`
- Shop Page Example: `frontend/app/shop/page.tsx`

---

**Last Updated:** [Current Date]
