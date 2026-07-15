const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

export type RegisterRole =
  | 'OWNER'
  | 'VENDOR'
  | 'VET'
  | 'BREEDER'
  | 'TRADER'
  | 'SHELTER'

export const REGISTER_ROLES: RegisterRole[] = [
  'OWNER',
  'VENDOR',
  'VET',
  'BREEDER',
  'TRADER',
  'SHELTER',
]

export const REGISTER_ACCOUNT_TYPES: {
  role: RegisterRole
  label: string
  description: string
  query: string
}[] = [
  {
    role: 'OWNER',
    label: 'Shopper',
    description: 'Pet Parent Centre — shop, pets, orders, and vet bookings',
    query: '',
  },
  {
    role: 'VENDOR',
    label: 'Shop vendor',
    description: 'Seller Centre — products, customer orders, and earnings',
    query: 'role=VENDOR',
  },
  {
    role: 'VET',
    label: 'Veterinarian',
    description: 'Clinic Centre — appointments, availability, and verification',
    query: 'role=VET',
  },
  {
    role: 'BREEDER',
    label: 'Breeder / trader / shelter',
    description: 'Listing Centre — sale, adoption, and shelter listings',
    query: 'role=BREEDER',
  },
]

/** Parse ?role= from register URL. */
export function parseRegisterRole(roleParam?: string | null): RegisterRole {
  const normalized = (roleParam || 'OWNER').toUpperCase()
  if (REGISTER_ROLES.includes(normalized as RegisterRole)) {
    return normalized as RegisterRole
  }
  return 'OWNER'
}

/** Django Unfold control panel.
 * Local: hit Django on :8000/admin/ (set NEXT_PUBLIC_DJANGO_ADMIN_URL or absolute API).
 * Production (same-origin nginx): /django-admin/
 */
export function getDjangoAdminUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_DJANGO_ADMIN_URL
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`

  const base = API_URL.replace(/\/api\/v1\/?$/, '')
  if (!base || base.startsWith('/')) {
    return '/django-admin/'
  }
  // Absolute API (local pc): Unfold mounts at /admin/ when DEBUG=True
  return `${base.replace(/\/$/, '')}/admin/`
}

/** API origin without /api/v1 suffix ('' means same-origin). */
export function getApiOrigin(): string {
  return API_URL.replace(/\/api\/v1\/?$/, '')
}

/** POST bridge used by frontend login for Django admin session cookies. */
export function getStaffLoginUrl(): string {
  return `${API_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/auth/staff-login`
}

/** POST bridge for staff already signed in on the frontend (JWT → Django session). */
export function getStaffBridgeUrl(): string {
  return `${API_URL.replace(/\/api\/v1\/?$/, '')}/api/v1/auth/staff-bridge`
}

export function submitStaffLoginForm(email: string, password: string): void {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = getStaffLoginUrl()

  for (const [name, value] of Object.entries({ email, password })) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}

/** Reliable staff redirect: full browser navigation sets Django session cookie. */
export function redirectStaffToDjangoAdmin(staffBridgeToken: string): void {
  const url = `${getApiOrigin()}/api/v1/auth/staff-login/start?token=${encodeURIComponent(staffBridgeToken)}`
  window.location.href = url
}

/** Open Django Unfold admin. Unauthenticated users land on Django login (not the storefront). */
export function openDjangoAdmin(accessToken?: string | null): void {
  const adminUrl = getDjangoAdminUrl()

  // Already signed in on the storefront as staff → silent session bridge into admin.
  if (accessToken) {
    fetch(`${getApiOrigin()}/api/v1/auth/staff-bridge-token`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (data.staff_bridge_token) {
          redirectStaffToDjangoAdmin(data.staff_bridge_token)
          return
        }
        throw new Error('missing token')
      })
      .catch(() => {
        window.location.href = adminUrl
      })
    return
  }

  if (typeof window !== 'undefined') {
    window.location.href = adminUrl
  }
}

export function isStaffUser(role?: string, isStaff?: boolean): boolean {
  return Boolean(isStaff || (role && isStaffRole(role)))
}

/** ?next=admin from Django admin redirect */
export function wantsDjangoAdmin(next?: string | null): boolean {
  return next === 'admin' || next === '/admin' || next === '/admin/'
}

function isStaffRole(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN'
}

function isLiveSellerRole(role: string): boolean {
  return role === 'BREEDER' || role === 'TRADER' || role === 'SHELTER'
}

/** Centre labels shown in shell / account menu. */
export function getControlCentreLabel(role: string): string {
  switch (role) {
    case 'VENDOR':
      return 'Seller Centre'
    case 'VET':
      return 'Clinic Centre'
    case 'BREEDER':
    case 'TRADER':
    case 'SHELTER':
      return 'Listing Centre'
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return 'Admin'
    default:
      return 'Pet Parent Centre'
  }
}

/** First destination after creating a new account (onboarding). */
export function resolvePostRegisterPath(role: string): string {
  switch (role) {
    case 'VENDOR':
      return '/dashboard/vendor/profile'
    case 'VET':
      return '/dashboard/vet/profile'
    case 'BREEDER':
    case 'TRADER':
    case 'SHELTER':
      return '/dashboard/seller'
    default:
      return '/dashboard'
  }
}

/** Role home — each registration type lands in its own control centre. */
export function getDefaultDashboardPath(role: string, djangoAdminUrl?: string): string {
  if (isStaffRole(role)) {
    return djangoAdminUrl || getDjangoAdminUrl()
  }
  switch (role) {
    case 'VENDOR':
      return '/dashboard/vendor'
    case 'VET':
      return '/dashboard/vet'
    case 'BREEDER':
    case 'TRADER':
    case 'SHELTER':
      return '/dashboard/seller'
    default:
      return '/dashboard'
  }
}

/** Shopper-facing "my account" paths that should not trap sellers after login. */
function isGenericShopperAccountPath(path: string): boolean {
  return path === '/dashboard' || path === '/dashboard/'
}

/** Roles that should skip the generic shopper overview home. */
export function usesDedicatedControlCentre(role: string): boolean {
  return role === 'VENDOR' || role === 'VET' || isLiveSellerRole(role)
}

/** Honor safe ?next= paths; otherwise route by role. Staff → Django admin. */
export function resolvePostLoginPath(
  role: string,
  next?: string | null,
  djangoAdminUrl?: string
): string {
  const home = getDefaultDashboardPath(role, djangoAdminUrl)
  if (next && next.startsWith('/') && !next.startsWith('//') && !isStaffRole(role)) {
    // Dedicated centres: generic "Account" links should not land on shopper overview.
    if (usesDedicatedControlCentre(role) && isGenericShopperAccountPath(next)) {
      return home
    }
    return next
  }
  return home
}

export function isExternalAuthRedirect(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

/** Dashboard sections restricted by role prefix. */
export function roleAllowedForPath(role: string, pathname: string): boolean {
  if (pathname.startsWith('/dashboard/vendor') && role !== 'VENDOR') return false
  if (pathname.startsWith('/dashboard/vet') && role !== 'VET') return false
  if (pathname.startsWith('/dashboard/seller') && !isLiveSellerRole(role)) return false
  if (pathname.startsWith('/dashboard/listings') && !isLiveSellerRole(role)) return false
  if (pathname.startsWith('/dashboard/invoices') && !usesDedicatedControlCentre(role)) return false
  if (pathname.startsWith('/dashboard/pets') && role !== 'OWNER') return false
  if (pathname.startsWith('/dashboard/appointments') && role !== 'OWNER') return false
  return true
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Shopper',
  VET: 'Veterinarian',
  VENDOR: 'Shop vendor',
  BREEDER: 'Breeder',
  TRADER: 'Trader',
  SHELTER: 'Shelter',
  ADMIN: 'Platform admin',
  SUPER_ADMIN: 'Super admin',
}
