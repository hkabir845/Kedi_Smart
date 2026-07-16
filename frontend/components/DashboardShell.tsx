'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  getControlCentreLabel,
  getDefaultDashboardPath,
  openDjangoAdmin,
  ROLE_LABELS,
  roleAllowedForPath,
  usesDedicatedControlCentre,
} from '@/lib/auth-routes'
import KediSmartLogo from '@/components/KediSmartLogo'
import { api } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'

type NavItem = {
  href: string
  label: string
  roles?: string[]
  match?: (path: string) => boolean
  external?: boolean
}

const petsNavItem: NavItem = {
  href: '/dashboard/pets',
  label: 'My pets',
  match: (path) =>
    path.startsWith('/dashboard/pets') && !path.startsWith('/dashboard/pets/tags'),
}

const tagsLostNavItem: NavItem = {
  href: '/dashboard/pets/tags',
  label: 'Tags & lost/found',
  match: (path) => path.startsWith('/dashboard/pets/tags'),
}

const shopperNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', match: (path) => path === '/dashboard' },
  { href: '/dashboard/orders', label: 'Orders', match: (path) => path.startsWith('/dashboard/orders') },
  petsNavItem,
  tagsLostNavItem,
  {
    href: '/dashboard/appointments',
    label: 'Appointments',
    match: (path) => path.startsWith('/dashboard/appointments'),
  },
  {
    href: '/dashboard/account',
    label: 'Account settings',
    match: (path) => path.startsWith('/dashboard/account'),
  },
]

const invoiceNavItem = {
  href: '/dashboard/invoices',
  label: 'Invoices',
  match: (path: string) => path.startsWith('/dashboard/invoices'),
}

const accountNavItem: NavItem = {
  href: '/dashboard/account',
  label: 'Account settings',
  match: (path) => path.startsWith('/dashboard/account'),
}

const vendorNav: NavItem[] = [
  {
    href: '/dashboard/vendor',
    label: 'Seller home',
    match: (path) => path === '/dashboard/vendor' || path === '/dashboard/vendor/',
  },
  {
    href: '/dashboard/vendor/profile',
    label: 'Shop profile',
    match: (path) => path.startsWith('/dashboard/vendor/profile'),
  },
  {
    href: '/dashboard/vendor/products',
    label: 'My products',
    match: (path) => path.startsWith('/dashboard/vendor/products'),
  },
  {
    href: '/dashboard/vendor/orders',
    label: 'Customer orders',
    match: (path) => path.startsWith('/dashboard/vendor/orders'),
  },
  invoiceNavItem,
  {
    href: '/dashboard/vendor/earnings',
    label: 'Earnings',
    match: (path) => path.startsWith('/dashboard/vendor/earnings'),
  },
  accountNavItem,
]

const vetNav: NavItem[] = [
  {
    href: '/dashboard/vet',
    label: 'Clinic home',
    match: (path) => path === '/dashboard/vet' || path === '/dashboard/vet/',
  },
  {
    href: '/dashboard/vet/appointments',
    label: 'Appointments',
    match: (path) => path.startsWith('/dashboard/vet/appointments'),
  },
  {
    href: '/dashboard/vet/availability',
    label: 'Availability',
    match: (path) => path.startsWith('/dashboard/vet/availability'),
  },
  invoiceNavItem,
  {
    href: '/dashboard/vet/profile',
    label: 'Clinic profile',
    match: (path) => path.startsWith('/dashboard/vet/profile'),
  },
  accountNavItem,
]

const sellerNav: NavItem[] = [
  {
    href: '/dashboard/seller',
    label: 'Listing home',
    match: (path) => path === '/dashboard/seller' || path === '/dashboard/seller/',
  },
  {
    href: '/dashboard/listings',
    label: 'My listings',
    match: (path) => path.startsWith('/dashboard/listings'),
  },
  invoiceNavItem,
  accountNavItem,
]

const adminNav: NavItem[] = [
  {
    href: '#django-admin',
    label: 'Django admin',
    roles: ['ADMIN', 'SUPER_ADMIN'],
    external: true,
  },
]

function navForRole(role: string): NavItem[] {
  const personalPetNav = [petsNavItem, tagsLostNavItem]
  if (role === 'VENDOR') {
    return [
      ...vendorNav,
      ...personalPetNav,
      {
        href: '/dashboard/orders',
        label: 'My purchases',
        match: (path) => path.startsWith('/dashboard/orders'),
      },
    ]
  }
  if (role === 'VET') {
    return [
      ...vetNav,
      ...personalPetNav,
      {
        href: '/dashboard/orders',
        label: 'My purchases',
        match: (path) => path.startsWith('/dashboard/orders'),
      },
    ]
  }
  if (role === 'BREEDER' || role === 'TRADER' || role === 'SHELTER') {
    return [
      ...sellerNav,
      ...personalPetNav,
      {
        href: '/dashboard/orders',
        label: 'My purchases',
        match: (path) => path.startsWith('/dashboard/orders'),
      },
    ]
  }
  if (role === 'OWNER') return shopperNav
  return [
    { href: '/dashboard', label: 'Overview', match: (path) => path === '/dashboard' },
    { href: '/dashboard/orders', label: 'Orders', match: (path) => path.startsWith('/dashboard/orders') },
    ...personalPetNav,
    ...adminNav.filter((item) => !item.roles || item.roles.includes(role)),
  ]
}

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname)
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function storefrontCta(role: string): { href: string; label: string } {
  if (role === 'VENDOR') return { href: '/shop', label: 'View storefront' }
  if (role === 'VET') return { href: '/vets', label: 'Public directory' }
  if (role === 'BREEDER' || role === 'TRADER' || role === 'SHELTER') {
    return { href: '/marketplace', label: 'View marketplace' }
  }
  return { href: '/shop', label: 'Continue shopping' }
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/dashboard'
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [shopName, setShopName] = useState<string | null>(null)
  const [shopLogo, setShopLogo] = useState<string | null>(null)
  const [clinicName, setClinicName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login?next=' + encodeURIComponent(pathname))
      return
    }
    api.setToken(token)
    api
      .get('/auth/me')
      .then(async (me) => {
        setUser(me)
        if (me.role === 'VENDOR') {
          try {
            const profile = await api.get('/vendor/profile')
            setShopName(profile?.shop_name || null)
            setShopLogo(profile?.logo_url || null)
          } catch {
            setShopName(null)
            setShopLogo(null)
          }
        }
        if (me.role === 'VET') {
          try {
            const profile = await api.get(`/vets/${me.id}`)
            setClinicName(profile?.clinic_name || null)
          } catch {
            setClinicName(null)
          }
        }
      })
      .catch(() => router.replace('/login?next=' + encodeURIComponent(pathname)))
      .finally(() => setLoading(false))
  }, [pathname, router])

  useEffect(() => {
    if (!user) return
    if (usesDedicatedControlCentre(user.role) && (pathname === '/dashboard' || pathname === '/dashboard/')) {
      router.replace(getDefaultDashboardPath(user.role))
      return
    }
    if (!roleAllowedForPath(user.role, pathname)) {
      router.replace(getDefaultDashboardPath(user.role))
    }
  }, [user, pathname, router])

  const handleLogout = async () => {
    await api.logout()
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-500">
        Loading your account...
      </div>
    )
  }

  if (!user) return null

  const navItems = navForRole(user.role)
  const displayName = user.profile?.full_name || user.email?.split('@')[0]
  const roleLabel = ROLE_LABELS[user.role] || user.role
  const centreLabel = getControlCentreLabel(user.role)
  const isVendor = user.role === 'VENDOR'
  const isVet = user.role === 'VET'
  const isLiveSeller = user.role === 'BREEDER' || user.role === 'TRADER' || user.role === 'SHELTER'
  const dedicated = usesDedicatedControlCentre(user.role)
  const cta = storefrontCta(user.role)

  let title = `Hello, ${displayName}`
  if (isVendor) title = shopName || 'Your shop'
  else if (isVet) title = clinicName || 'Your clinic'
  else if (isLiveSeller) title = `${roleLabel} control centre`

  const monogram = (isVendor ? shopName : isVet ? clinicName : displayName) || displayName || 'K'
  const avatarLetter = monogram.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white print:min-h-0">
      <div className="bg-white border-b border-gray-200 no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div className="flex items-start gap-4 min-w-0">
              {dedicated && (
                <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {isVendor && shopLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(shopLogo)}
                      alt={`${shopName || 'Shop'} logo`}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary-600">{avatarLetter}</span>
                  )}
                </div>
              )}
              <div className="min-w-0">
                {!dedicated && <KediSmartLogo variant="compact" size="sm" link={false} className="mb-3" />}
                <p className="text-sm font-medium text-gray-500 mb-1">{centreLabel}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight truncate">
                  {title}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {dedicated ? (
                    <>
                      Signed in as {displayName} · {roleLabel}
                      {isVendor && !shopLogo && (
                        <>
                          {' · '}
                          <Link href="/dashboard/vendor/profile" className="text-primary-600 hover:underline">
                            Add logo
                          </Link>
                        </>
                      )}
                      {isVet && !clinicName && (
                        <>
                          {' · '}
                          <Link href="/dashboard/vet/profile" className="text-primary-600 hover:underline">
                            Set clinic name
                          </Link>
                        </>
                      )}
                    </>
                  ) : (
                    roleLabel
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={cta.href}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {cta.label}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>

          <nav
            className="-mb-px flex gap-1 overflow-x-auto scrollbar-none border-b border-transparent touch-pan-x"
            aria-label={`${centreLabel} sections`}
          >
            {navItems.map((item) => {
              const active = !item.external && isActive(item, pathname)
              const className = [
                'shrink-0 inline-flex items-center min-h-[48px] px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
              ].join(' ')

              if (item.external) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => openDjangoAdmin(localStorage.getItem('access_token'))}
                    className={className}
                  >
                    {item.label}
                  </button>
                )
              }

              return (
                <Link key={item.href} href={item.href} className={className}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:max-w-none print:px-0 print:py-0">
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
