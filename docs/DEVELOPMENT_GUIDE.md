# Kedi Smart - World-Class Development Guide

## 🎯 Table of Contents
1. [Pagination System](#pagination-system)
2. [Code Architecture Best Practices](#code-architecture-best-practices)
3. [Development Workflow](#development-workflow)
4. [Quality Standards](#quality-standards)
5. [Performance Optimization](#performance-optimization)
6. [Security Best Practices](#security-best-practices)
7. [Testing Strategy](#testing-strategy)
8. [Documentation Standards](#documentation-standards)

---

## 📄 Pagination System

### Backend Pagination Standard

**All list endpoints MUST use consistent pagination:**

#### 1. Use the `paginate()` utility function
```python
from app.utils.pagination import paginate

@router.get("/items", response_model=dict)
def list_items(
    page: int = 1,  # Use 'page' instead of 'skip'
    size: int = 20,  # Use 'size' instead of 'limit'
    db: Session = Depends(get_db)
):
    query = db.query(Item).filter(...)
    items, total, page, size, pages = paginate(query, page, size)
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }
```

#### 2. Standard Response Format
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "size": 20,
  "pages": 8
}
```

#### 3. Parameter Constraints
- `page`: Minimum 1, defaults to 1
- `size`: Minimum 1, Maximum 100, defaults to 20
- Always validate and sanitize inputs

#### 4. Endpoints to Update (Standardization Needed)
- ✅ `/shop/products` - Already uses pagination
- ✅ `/blog/posts` - Already uses pagination
- ✅ `/marketplace/listings` - Already uses pagination
- ✅ `/pets` - Already uses pagination
- ⚠️ `/admin/users` - Needs standardization (currently uses skip/limit)
- ⚠️ `/admin/orders` - Needs standardization (currently uses skip/limit)
- ⚠️ `/vets/appointments` - Check if pagination exists
- ⚠️ `/dashboard/orders` - Check if pagination exists

### Frontend Pagination Standard

#### 1. Use Reusable Pagination Component
```tsx
import Pagination from '@/components/Pagination'

function MyListPage() {
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // ... fetch data with page parameter
  
  return (
    <>
      {/* Your list items */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </>
  )
}
```

#### 2. Standard Fetch Pattern
```tsx
const fetchData = async () => {
  setLoading(true)
  try {
    const params = new URLSearchParams({
      page: String(page),
      size: '20', // or appropriate page size
    })
    // Add filters if needed
    if (filter) {
      params.append('filter', filter)
    }
    
    const data = await api.get(`/endpoint?${params.toString()}`)
    setItems(data.items || [])
    setTotalPages(data.pages || 1)
  } catch (err) {
    console.error('Failed to fetch:', err)
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchData()
}, [page, filter]) // Re-fetch when page or filters change
```

#### 3. Pages Requiring Pagination
- ✅ `/shop` - Already has pagination
- ⚠️ `/blog` - Check if pagination exists
- ⚠️ `/marketplace` - Check if pagination exists
- ⚠️ `/dashboard/pets` - Needs pagination
- ⚠️ `/dashboard/orders` - Needs pagination
- ⚠️ `/dashboard/listings` - Needs pagination
- ⚠️ `/dashboard/vendor/products` - Needs pagination
- ⚠️ `/dashboard/vendor/orders` - Needs pagination
- ⚠️ `/dashboard/vet/appointments` - Needs pagination
- ⚠️ `/admin/users` - Needs pagination
- ⚠️ `/admin/orders` - Needs pagination
- ⚠️ `/admin/moderation` - Needs pagination
- ⚠️ `/admin/verifications` - Needs pagination

---

## 🏗️ Code Architecture Best Practices

### 1. Layered Architecture (Backend)

```
backend/app/
├── api/              # API routes (thin controllers)
├── core/             # Configuration, security, dependencies
├── db/               # Database session, base models
├── models/           # SQLAlchemy models (data layer)
├── schemas/          # Pydantic schemas (validation, serialization)
├── services/         # Business logic (fat services)
└── utils/            # Helper functions (pagination, slug, etc.)
```

**Principles:**
- Controllers (API routes) should be thin - delegate to services
- Business logic belongs in services
- Models define data structure
- Schemas handle validation and serialization
- Utils contain reusable helper functions

### 2. Component Architecture (Frontend)

```
frontend/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (buttons, inputs)
│   ├── layout/      # Layout components
│   └── features/    # Feature-specific components
├── lib/             # Utilities, API client, helpers
├── hooks/           # Custom React hooks (if needed)
└── types/           # TypeScript type definitions
```

**Principles:**
- Pages should be thin - compose from components
- Components should be reusable and focused
- Business logic in hooks or services
- Types should be well-defined and exported

### 3. Naming Conventions

**Backend:**
- Models: `PascalCase` (e.g., `User`, `Product`)
- Functions: `snake_case` (e.g., `get_user`, `create_product`)
- Files: `snake_case` (e.g., `user.py`, `product_service.py`)

**Frontend:**
- Components: `PascalCase` (e.g., `ProductCard`, `UserProfile`)
- Functions: `camelCase` (e.g., `fetchProducts`, `handleSubmit`)
- Files: Component files use `PascalCase.tsx`, utilities use `camelCase.ts`

### 4. Error Handling

**Backend:**
```python
from fastapi import HTTPException

# Use appropriate HTTP status codes
raise HTTPException(status_code=404, detail="Resource not found")
raise HTTPException(status_code=403, detail="Permission denied")
raise HTTPException(status_code=400, detail="Invalid input")
```

**Frontend:**
```tsx
try {
  const data = await api.get('/endpoint')
} catch (error: any) {
  if (error.response?.status === 404) {
    // Handle not found
  } else if (error.response?.status === 403) {
    // Handle permission denied
  } else {
    // Handle generic error
    console.error('Error:', error)
  }
}
```

---

## 🔄 Development Workflow

### 1. Feature Development Checklist

**Before Starting:**
- [ ] Understand the requirement clearly
- [ ] Check existing similar features for patterns
- [ ] Plan the data model (if new)
- [ ] Plan the API endpoints (if new)
- [ ] Plan the UI/UX flow

**Backend:**
- [ ] Create/update database models (if needed)
- [ ] Create Alembic migration
- [ ] Create Pydantic schemas
- [ ] Implement service layer (if complex logic)
- [ ] Implement API endpoints
- [ ] Add error handling
- [ ] Test with API documentation (OpenAPI)

**Frontend:**
- [ ] Create/update TypeScript types
- [ ] Create UI components (if reusable)
- [ ] Implement page/feature
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add pagination (if list)
- [ ] Test responsive design
- [ ] Test accessibility

**After Implementation:**
- [ ] Test end-to-end flow
- [ ] Update documentation if needed
- [ ] Check code quality (linting, formatting)
- [ ] Review for security issues
- [ ] Test performance (if critical path)

### 2. Database Changes

**Always use Alembic migrations:**
```bash
# Create migration
alembic revision --autogenerate -m "description"

# Review the migration file

# Apply migration
alembic upgrade head
```

**Never modify models without migrations!**

### 3. Code Quality

**Backend:**
- Use type hints everywhere
- Follow PEP 8 style guide
- Use meaningful variable/function names
- Add docstrings for complex functions
- Keep functions focused and small

**Frontend:**
- Use TypeScript strictly (no `any` unless necessary)
- Use ESLint and Prettier
- Follow React best practices
- Use meaningful component/function names
- Keep components focused and small

---

## ✅ Quality Standards

### 1. Performance Targets

**Backend:**
- API response time: < 200ms for simple queries
- API response time: < 500ms for complex queries
- Database queries: Use indexes, avoid N+1 queries
- Use eager loading for related data when needed

**Frontend:**
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Page load: < 3s
- Use Next.js Image component for images
- Implement code splitting
- Lazy load components when appropriate

### 2. Accessibility (a11y)

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios (WCAG AA minimum)
- Screen reader compatibility
- Focus indicators

### 3. Responsive Design

- Mobile-first approach
- Test on multiple screen sizes:
  - Mobile (320px - 640px)
  - Tablet (641px - 1024px)
  - Desktop (1025px+)
- Use Tailwind responsive utilities
- Test touch interactions on mobile

### 4. SEO Best Practices

- Semantic HTML structure
- Proper heading hierarchy (h1, h2, h3...)
- Meta tags (title, description)
- OpenGraph tags
- Canonical URLs
- Structured data (JSON-LD)
- Clean, descriptive URLs
- Sitemap generation
- Robots.txt configuration

---

## ⚡ Performance Optimization

### Backend

1. **Database Optimization:**
   - Add indexes for frequently queried fields
   - Use select_related/joinedload to avoid N+1 queries
   - Paginate all list endpoints
   - Use database connection pooling

2. **Caching Strategy:**
   - Cache frequently accessed data (Redis in production)
   - Cache expensive computations
   - Use HTTP caching headers

3. **Query Optimization:**
   - Use select() to limit columns
   - Use filters early in query chain
   - Avoid loading unnecessary relationships

### Frontend

1. **Code Splitting:**
   - Use dynamic imports for heavy components
   - Use Next.js automatic code splitting
   - Lazy load routes when possible

2. **Image Optimization:**
   - Use Next.js Image component
   - Optimize image sizes
   - Use appropriate formats (WebP when possible)

3. **State Management:**
   - Avoid unnecessary re-renders
   - Use React.memo for expensive components
   - Use useMemo/useCallback appropriately

4. **API Calls:**
   - Implement request debouncing for search
   - Cache API responses when appropriate
   - Use pagination to limit data transfer

---

## 🔒 Security Best Practices

### Backend

1. **Authentication & Authorization:**
   - Always validate JWT tokens
   - Check user permissions for every protected endpoint
   - Use role-based access control (RBAC)
   - Implement refresh token rotation

2. **Input Validation:**
   - Validate all inputs with Pydantic schemas
   - Sanitize user inputs
   - Use parameterized queries (SQLAlchemy does this)
   - Validate file uploads (type, size, content)

3. **Data Protection:**
   - Hash passwords (bcrypt)
   - Encrypt sensitive data
   - Never expose sensitive data in API responses
   - Use HTTPS in production

4. **SQL Injection Prevention:**
   - Always use SQLAlchemy ORM (never raw SQL with user input)
   - Use parameterized queries if raw SQL is needed

5. **CORS:**
   - Configure CORS properly
   - Only allow trusted origins

### Frontend

1. **Authentication:**
   - Store tokens securely (localStorage is acceptable for MVP)
   - Implement token refresh
   - Handle token expiration gracefully

2. **Input Validation:**
   - Validate on client-side (UX)
   - Never trust client-side validation alone
   - Use Zod or similar for form validation

3. **XSS Prevention:**
   - Use React's automatic escaping
   - Sanitize user-generated content
   - Avoid dangerouslySetInnerHTML unless necessary and sanitized

4. **CSRF:**
   - Use SameSite cookies in production
   - Implement CSRF tokens for state-changing operations

---

## 🧪 Testing Strategy

### Backend Testing

**Unit Tests:**
- Test individual functions/services
- Test business logic
- Mock external dependencies

**Integration Tests:**
- Test API endpoints
- Test database operations
- Test authentication/authorization

**Example Structure:**
```
backend/tests/
├── unit/
│   ├── test_services/
│   └── test_utils/
└── integration/
    ├── test_api/
    └── test_auth/
```

### Frontend Testing

**Unit Tests:**
- Test utility functions
- Test custom hooks
- Test component rendering

**Integration Tests:**
- Test user flows
- Test API integration
- Test form submissions

**E2E Tests (Future):**
- Test critical user journeys
- Use Playwright or Cypress

---

## 📚 Documentation Standards

### Code Documentation

**Backend (Python):**
```python
def create_product(data: ProductCreate, db: Session) -> Product:
    """
    Create a new product.
    
    Args:
        data: Product creation data
        db: Database session
        
    Returns:
        Created product instance
        
    Raises:
        HTTPException: If validation fails or product exists
    """
    # Implementation
```

**Frontend (TypeScript):**
```tsx
/**
 * ProductCard component displays a product in a card format.
 * 
 * @param product - Product data to display
 * @param onAddToCart - Callback when add to cart is clicked
 */
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // Implementation
}
```

### API Documentation

- Use OpenAPI/Swagger (FastAPI auto-generates this)
- Document all endpoints
- Include request/response examples
- Document error responses
- Document authentication requirements

### README Files

- Keep README.md updated
- Document setup instructions
- Document environment variables
- Document deployment process
- Include architecture overview

---

## 🚀 Deployment Checklist

**Before Deployment:**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security review completed
- [ ] Performance testing done
- [ ] Error monitoring set up
- [ ] Logging configured
- [ ] Backup strategy in place

**Post-Deployment:**
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Check logs for issues
- [ ] Verify all features working
- [ ] Monitor user feedback

---

## 📋 Priority Implementation Roadmap

### Phase 1: Foundation (Current)
1. ✅ Standardize pagination system
2. ✅ Create reusable components
3. ⚠️ Add pagination to all list pages
4. ⚠️ Standardize error handling
5. ⚠️ Add loading states everywhere

### Phase 2: Quality & Performance
1. Add comprehensive error handling
2. Implement caching strategy
3. Optimize database queries
4. Add performance monitoring
5. Implement proper logging

### Phase 3: Testing & Documentation
1. Write unit tests for core modules
2. Write integration tests for APIs
3. Complete API documentation
4. Add inline code documentation
5. Create user guides

### Phase 4: Advanced Features
1. Real-time notifications
2. Advanced search/filtering
3. Analytics dashboard
4. Email notifications
5. Payment gateway integration

---

## 💡 World-Class Tips

1. **User Experience First:**
   - Always think from the user's perspective
   - Make common tasks easy
   - Provide clear feedback
   - Handle errors gracefully

2. **Performance Matters:**
   - Optimize for the slowest connection
   - Show loading states
   - Implement optimistic updates
   - Cache when appropriate

3. **Security is Non-Negotiable:**
   - Never trust user input
   - Always validate and sanitize
   - Use HTTPS in production
   - Keep dependencies updated

4. **Code Quality:**
   - Write code for humans, not just computers
   - Refactor when needed
   - Don't optimize prematurely
   - Keep it simple

5. **Documentation:**
   - Document complex logic
   - Keep README updated
   - Comment why, not what
   - Update docs when code changes

6. **Continuous Improvement:**
   - Review and refactor regularly
   - Learn from errors
   - Seek feedback
   - Stay updated with best practices

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
