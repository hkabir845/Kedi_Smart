const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
    label: 'Pet owner',
    description: 'Shop, track orders, and manage your pets',
    query: '',
  },
  {
    role: 'VENDOR',
    label: 'Shop vendor',
    description: 'Open a shop and sell products on our marketplace',
    query: 'role=VENDOR',
  },
  {
    role: 'VET',
    label: 'Veterinarian',
    description: 'Offer appointments and online consultations',
    query: 'role=VET',
  },
  {
    role: 'BREEDER',
    label: 'Breeder / trader / shelter',
    description: 'List live animals for sale or adoption',
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

/** Django control panel — full application backend admin. */
export function getDjangoAdminUrl(): string {
  const base = API_URL.replace(/\/api\/v1\/?$/, '')
  return `${base}/admin/`
}

/** API origin without /api/v1 suffix. */
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

export function openDjangoAdmin(accessToken?: string | null): void {
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
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = getStaffBridgeUrl()

        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = 'access_token'
        input.value = accessToken
        form.appendChild(input)

        document.body.appendChild(form)
        form.submit()
      })
    return
  }

  if (typeof window !== 'undefined') {
    window.location.href = '/login?next=admin'
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
      return '/dashboard/listings/new'
    default:
      return '/dashboard'
  }
}

/** Default landing page after sign-in, by account role. */
export function getDefaultDashboardPath(role: string, djangoAdminUrl?: string): string {
  if (isStaffRole(role)) {
    return djangoAdminUrl || getDjangoAdminUrl()
  }
  switch (role) {
    case 'VENDOR':
      return '/dashboard/vendor/products'
    case 'VET':
      return '/dashboard/vet/appointments'
    case 'BREEDER':
    case 'TRADER':
    case 'SHELTER':
      return '/dashboard/listings'
    default:
      return '/dashboard'
  }
}

/** Honor safe ?next= paths; otherwise route by role. Staff → Django admin. */
export function resolvePostLoginPath(
  role: string,
  next?: string | null,
  djangoAdminUrl?: string
): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && !isStaffRole(role)) {
    return next
  }
  return getDefaultDashboardPath(role, djangoAdminUrl)
}

export function isExternalAuthRedirect(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://')
}

/** Dashboard sections restricted by role prefix. */
export function roleAllowedForPath(role: string, pathname: string): boolean {
  if (pathname.startsWith('/dashboard/vendor') && role !== 'VENDOR') return false
  if (pathname.startsWith('/dashboard/vet') && role !== 'VET') return false
  if (pathname.startsWith('/dashboard/listings') && !isLiveSellerRole(role)) return false
  if (pathname.startsWith('/dashboard/pets') && role !== 'OWNER') return false
  return true
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Pet owner',
  VET: 'Veterinarian',
  VENDOR: 'Shop vendor',
  BREEDER: 'Breeder',
  TRADER: 'Trader',
  SHELTER: 'Shelter',
  ADMIN: 'Platform admin',
  SUPER_ADMIN: 'Super admin',
}
