# Kedi Smart Platform - Architecture Documentation

## Overview

Kedi Smart is a comprehensive pet & animal platform built with FastAPI (backend) and Next.js (frontend), using SQLite as the database. The platform is designed to be self-contained with no external dependencies required for local development.

## Tech Stack

### Backend
- **Framework**: FastAPI 0.104+
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Validation**: Pydantic
- **Authentication**: JWT (access + refresh tokens)
- **Database**: SQLite (file-based)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State**: React hooks + localStorage for auth

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/              # API routers
│   │   │   └── api_v1/
│   │   │       ├── endpoints/ # Route handlers
│   │   │       └── api.py     # Router aggregation
│   │   ├── core/             # Core functionality
│   │   │   ├── config.py     # Settings
│   │   │   ├── security.py   # JWT, password hashing
│   │   │   ├── dependencies.py # FastAPI dependencies
│   │   │   └── permissions.py # RBAC
│   │   ├── db/               # Database
│   │   │   ├── session.py    # DB session
│   │   │   └── base.py       # Base models
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utilities
│   ├── data/                 # SQLite database
│   ├── uploads/              # File uploads
│   ├── alembic/              # Migrations
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── lib/                  # Utilities, API client
│   └── public/               # Static assets
├── docs/                     # Documentation
└── scripts/                  # Seed scripts
```

## Database Schema

### Core Models

#### Users & Authentication
- `User`: Core user account (email, password, role)
- `UserProfile`: Extended user profile (name, phone, address, etc.)
- `VerificationRequest`: User verification requests (vet, vendor, seller, shelter)
- `RefreshToken`: JWT refresh tokens
- `PasswordResetToken`: Password reset tokens

#### Roles & Permissions
- Roles: OWNER, VET, VENDOR, BREEDER, TRADER, SHELTER, ADMIN, SUPER_ADMIN
- Permissions managed via `core/permissions.py` mapping
- Route-level protection via FastAPI dependencies

### Pet Management

#### Pets
- `Pet`: Pet profiles (species, breed, age, gender, etc.)
- `PetPhoto`: Pet photos
- `PetPrivacySetting`: Privacy controls for NFC scanning
- `PetMedicalRecord`: Medical history
- `Vaccination`: Vaccination records
- `Prescription`: Prescription records
- `PetHealthReminder`: Health reminders (Phase 3)

### NFC/QR Tags

- `NFCTag`: NFC tag inventory
- `TagActivation`: Tag-to-pet mapping
- `LostPetReport`: Lost pet reports
- `FoundReport`: Found pet reports
- `MaskedMessageThread`: Anonymous messaging threads
- `MaskedMessage`: Messages in threads

### Content & SEO

- `AnimalCategory`: Animal categories (Cats, Dogs, etc.)
- `ContentTopic`: Care guides and articles
- `ContentTag`: Content tags
- `FAQItem`: FAQs for topics
- `SEOSetting`: SEO metadata per entity

### Blog

- `BlogPost`: Blog posts
- `BlogComment`: Comments
- `BlogLike`: Likes

### E-commerce

- `ProductCategory`: Product categories (hierarchical)
- `Product`: Products
- `ProductVariant`: Product variants (size, flavor, etc.)
- `ProductImage`: Product images
- `ProductReview`: Reviews
- `Cart`: Shopping carts
- `CartItem`: Cart items
- `Order`: Orders
- `OrderItem`: Order items
- `Payment`: Payments (COD/Manual stubs)
- `ShippingAddress`: Shipping addresses
- `Coupon`: Discount coupons
- `SubscriptionPlan`: Subscription plans (Phase 2)
- `Subscription`: User subscriptions (Phase 2)

### Veterinary Services

- `VetProfile`: Veterinarian profiles
- `VetAvailability`: Availability schedules
- `Appointment`: Appointments
- `ConsultationNote`: Consultation notes

### Marketplace

- `PetListing`: Pet listings (sale/adoption/giveaway)
- `ListingPhoto`: Listing photos
- `ListingReport`: Listing reports

### Platform/Admin

- `SiteSetting`: Platform settings
- `ModerationQueue`: Content moderation queue
- `AuditLog`: Audit logs
- `Notification`: User notifications

## API Architecture

### Authentication Flow

1. **Registration/Login**: Returns JWT access + refresh tokens
2. **Access Token**: Short-lived (30 min), included in Authorization header
3. **Refresh Token**: Long-lived (7 days), stored in DB, used to get new access token
4. **Password Reset**: Token-based flow with email (mocked locally)

### Endpoint Structure

All endpoints under `/api/v1/`:

- `/auth/*` - Authentication endpoints
- `/users/*` - User management
- `/pets/*` - Pet management
- `/nfc/*` - NFC tag management
- `/content/*` - Knowledge hub content
- `/blog/*` - Blog posts
- `/shop/*` - E-commerce
- `/vets/*` - Veterinary services
- `/marketplace/*` - Pet marketplace
- `/admin/*` - Admin endpoints

### RBAC Implementation

- Role-based access control via `core/dependencies.py`
- `require_role()` - Check user role
- `require_permission()` - Check specific permission
- Permissions mapped in `core/permissions.py`

## Frontend Architecture

### Routing (Next.js App Router)

- Public routes: `/`, `/shop`, `/blog`, `/vets`, `/marketplace`, `/scan/[tagUid]`
- Auth routes: `/login`, `/register`, `/forgot-password`, `/reset-password`
- Dashboard routes: `/dashboard/*` (role-based)

### State Management

- Auth state: localStorage + React Context (recommended)
- API client: Centralized in `lib/api.ts`
- Form state: React Hook Form + Zod validation

### SEO Implementation

- Metadata: Next.js Metadata API
- JSON-LD: Generated server-side
- Sitemap: Dynamic generation
- Robots.txt: Static file
- Internal linking: Manual implementation in components

## File Uploads

- Storage: Local filesystem (`backend/uploads/`)
- Serving: FastAPI StaticFiles mount at `/uploads`
- Types: Pet photos, listing photos, product images, medical attachments

## Development Workflow

1. **Backend**: 
   - Create models in `app/models/`
   - Create schemas in `app/schemas/`
   - Create endpoints in `app/api/api_v1/endpoints/`
   - Generate migration: `alembic revision --autogenerate`
   - Apply migration: `alembic upgrade head`

2. **Frontend**:
   - Create pages in `app/`
   - Create components in `components/`
   - Use API client from `lib/api.ts`

3. **Database**:
   - Migrations via Alembic
   - Seed data via scripts in `scripts/`

## Security Considerations

- Passwords: bcrypt hashing
- JWT: Signed tokens with expiration
- CORS: Configured for frontend origin
- Input validation: Pydantic schemas
- SQL injection: SQLAlchemy ORM protection
- File uploads: Size limits, type validation (recommended)

## Performance

- Database indexes on foreign keys and frequently queried fields
- Pagination on list endpoints
- Image optimization (Next.js Image component)
- Server-side rendering for SEO pages
- ISR (Incremental Static Regeneration) for content pages (recommended)

## Deployment Notes

- SQLite suitable for MVP, consider PostgreSQL for production
- File uploads: Consider cloud storage (S3, etc.) for production
- Email: Integrate real SMTP service for production
- Environment variables: Use `.env` files, never commit secrets
- Database backups: Regular backups recommended
