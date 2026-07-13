'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { openDjangoAdmin, roleAllowedForPath } from '@/lib/auth-routes'
import KediSmartLogo from '@/components/KediSmartLogo'
import { api } from '@/lib/api'

type NavItem = {
  href: string
  label: string
  roles?: string[]
  match?: (path: string) => boolean
  external?: boolean
}

const customerNav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', match: (path) => path === '/dashboard' },
  { href: '/dashboard/orders', label: 'Orders', match: (path) => path.startsWith('/dashboard/orders') },
  { href: '/dashboard/pets', label: 'My pets', roles: ['OWNER'], match: (path) => path.startsWith('/dashboard/pets') },
]

const vendorNav: NavItem[] = [
  { href: '/dashboard/vendor/profile', label: 'Shop profile', roles: ['VENDOR'], match: (path) => path.startsWith('/dashboard/vendor/profile') },
  { href: '/dashboard/vendor/products', label: 'My products', roles: ['VENDOR'], match: (path) => path.startsWith('/dashboard/vendor/products') },
  { href: '/dashboard/vendor/orders', label: 'Customer orders', roles: ['VENDOR'], match: (path) => path.startsWith('/dashboard/vendor/orders') },
  { href: '/dashboard/vendor/earnings', label: 'Earnings', roles: ['VENDOR'], match: (path) => path.startsWith('/dashboard/vendor/earnings') },
]

const vetNav: NavItem[] = [
  { href: '/dashboard/vet/profile', label: 'Vet profile', roles: ['VET'], match: (path) => path.startsWith('/dashboard/vet/profile') },
  { href: '/dashboard/vet/appointments', label: 'Appointments', roles: ['VET'], match: (path) => path.startsWith('/dashboard/vet/appointments') },
]

const sellerNav: NavItem[] = [
  { href: '/dashboard/listings', label: 'My listings', roles: ['BREEDER', 'TRADER', 'SHELTER'], match: (path) => path.startsWith('/dashboard/listings') },
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
  const all = [...customerNav, ...vendorNav, ...vetNav, ...sellerNav, ...adminNav]
  return all.filter((item) => !item.roles || item.roles.includes(role))
}

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname)
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/dashboard'
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
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
      .then(setUser)
      .catch(() => router.replace('/login?next=' + encodeURIComponent(pathname)))
      .finally(() => setLoading(false))
  }, [pathname, router])

  useEffect(() => {
    if (!user) return
    if (!roleAllowedForPath(user.role, pathname)) {
      router.replace('/dashboard')
    }
  }, [user, pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <KediSmartLogo variant="compact" size="sm" link={false} className="mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">My account</p>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
                Hello, {displayName}
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Continue shopping
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
            className="-mb-px flex gap-1 overflow-x-auto scrollbar-none border-b border-transparent"
            aria-label="Account sections"
          >
            {navItems.map((item) => {
              const active = !item.external && isActive(item, pathname)
              const className = `shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
