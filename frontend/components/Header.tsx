'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import KediSmartLogo from './KediSmartLogo'
import AccountMenu from './AccountMenu'
import CartDrawer from './CartDrawer'
import LanguageSelector from './LanguageSelector'
import { api } from '@/lib/api'
import { useCart } from '@/lib/cart-context'

interface Category {
  id: number
  name: string
  slug: string
}

type Catalog = 'pet_animal' | 'general'

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { itemCount, openDrawer } = useCart()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [allMenuOpen, setAllMenuOpen] = useState(false)
  const [menuCatalog, setMenuCatalog] = useState<Catalog>('pet_animal')
  const [categories, setCategories] = useState<Category[]>([])
  const [menuTop, setMenuTop] = useState(0)
  const headerRef = useRef<HTMLElement>(null)

  const catalogParam = searchParams.get('catalog')
  const activeCatalog: Catalog =
    pathname === '/shop' && catalogParam === 'general' ? 'general' : 'pet_animal'
  const shopAllActive = pathname === '/shop' && !catalogParam
  const petAnimalActive =
    (pathname === '/shop' && catalogParam === 'pet_animal') ||
    (!!pathname?.startsWith('/product') && catalogParam !== 'general')
  const generalActive =
    (pathname === '/shop' && catalogParam === 'general') ||
    (!!pathname?.startsWith('/product') && catalogParam === 'general')

  const loadUser = () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    api.setToken(token)
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('access_token')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    loadUser()
  }, [pathname])

  useEffect(() => {
    if (allMenuOpen) setMenuCatalog(activeCatalog)
  }, [allMenuOpen, activeCatalog])

  useEffect(() => {
    if (!allMenuOpen) return
    api
      .get(`/shop/categories?catalog=${menuCatalog}`)
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [allMenuOpen, menuCatalog])

  useEffect(() => {
    if (!allMenuOpen) return
    const syncTop = () => {
      if (headerRef.current) {
        setMenuTop(headerRef.current.getBoundingClientRect().bottom)
      }
    }
    syncTop()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAllMenuOpen(false)
    }
    window.addEventListener('resize', syncTop)
    window.addEventListener('scroll', syncTop, true)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', syncTop)
      window.removeEventListener('scroll', syncTop, true)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [allMenuOpen])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/shop?q=${encodeURIComponent(search.trim())}`)
    } else {
      router.push('/shop')
    }
    setMobileOpen(false)
  }

  const shopHref = (catalog: Catalog, categoryId?: number) => {
    const params = new URLSearchParams()
    params.set('catalog', catalog)
    if (categoryId) params.set('category_id', String(categoryId))
    return `/shop?${params}`
  }

  const closeAllMenu = () => setAllMenuOpen(false)

  const barLink = (href: string, label: string, active?: boolean) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-sm whitespace-nowrap transition-colors border ${
        active
          ? 'border-white/40 font-semibold bg-white/10'
          : 'border-transparent hover:border-white/40'
      }`}
    >
      {label}
    </Link>
  )

  const displayName = user?.profile?.full_name || user?.email?.split('@')[0]

  return (
    <>
      <div className="bg-primary-600 text-white text-center text-xs sm:text-sm py-2 px-4">
        <span className="font-medium">Trusted by Pets, Loved by Owners</span>
        <span className="hidden sm:inline"> · Free delivery on orders over </span>
        <strong className="hidden sm:inline">BDT 1,500</strong>
        <span className="hidden sm:inline"> · </span>
        <Link href="/shop?catalog=pet_animal" className="underline font-semibold ml-1 sm:ml-0">
          Shop Pet &amp; Animal
        </Link>
      </div>

      <header
        ref={headerRef}
        className="bg-white border-b border-gray-200 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 md:gap-5 py-3 md:py-3.5">
            <KediSmartLogo
              variant="full"
              size="md"
              priority
              className="shrink-0 md:hidden"
            />
            <KediSmartLogo
              variant="full"
              size="lg"
              priority
              className="shrink-0 hidden md:block"
            />

            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-2xl lg:max-w-3xl mx-2 lg:mx-4 rounded-xl overflow-hidden border-2 border-primary-500 focus-within:border-primary-600 shadow-sm"
            >
              <select
                aria-label="Search department"
                defaultValue=""
                onChange={(e) => {
                  const catalog = e.target.value
                  if (catalog) router.push(`/shop?catalog=${catalog}`)
                  else router.push('/shop')
                }}
                className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 border-r border-gray-300 focus:outline-none max-w-[7.5rem]"
              >
                <option value="">All</option>
                <option value="pet_animal">Pet &amp; Animal</option>
                <option value="general">General</option>
              </select>
              <input
                type="search"
                placeholder="Search KediSmart — food, toys, electronics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2.5 text-sm focus:outline-none bg-white min-w-0"
              />
              <button
                type="submit"
                className="bg-primary-600 text-white px-5 hover:bg-primary-700 font-semibold text-sm shrink-0"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-1 sm:gap-3 ml-auto">
              <LanguageSelector />

              {!loading && !user && (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex text-sm font-medium text-gray-700 hover:text-primary-600 px-3 py-2"
                >
                  Sign in
                </Link>
              )}

              <button
                type="button"
                onClick={openDrawer}
                className="relative flex flex-col items-center px-2 py-1 rounded-lg hover:bg-gray-50"
                aria-label="Open cart"
              >
                <span className="text-2xl leading-none">🛒</span>
                <span className="text-[10px] font-medium text-gray-600 hidden sm:block">Cart</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-700 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {!loading && user && <AccountMenu user={user} onLogout={handleLogout} />}

              {!loading && !user && (
                <Link
                  href="/register"
                  className="hidden sm:inline-flex text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                >
                  Sign up
                </Link>
              )}

              <button
                type="button"
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-primary-900 text-white">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 flex items-center gap-0.5 overflow-x-auto py-1.5 text-sm">
            <button
              type="button"
              onClick={() => setAllMenuOpen((open) => !open)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-bold whitespace-nowrap border shrink-0 ${
                allMenuOpen ? 'border-white bg-white/10' : 'border-transparent hover:border-white/40'
              }`}
              aria-expanded={allMenuOpen}
              aria-label="Open all categories"
            >
              <span className="flex flex-col gap-[3px]" aria-hidden>
                <span className="block w-3.5 h-0.5 bg-white rounded-full" />
                <span className="block w-3.5 h-0.5 bg-white rounded-full" />
                <span className="block w-3.5 h-0.5 bg-white rounded-full" />
              </span>
              All
            </button>

            {barLink('/shop', 'Shop', shopAllActive)}
            {barLink('/shop?catalog=pet_animal', 'Pet & Animal', petAnimalActive)}
            {barLink('/shop?catalog=general', 'General Products', generalActive)}

            <span className="w-px h-5 bg-white/25 mx-1 shrink-0" aria-hidden />

            {barLink('/marketplace', 'Live Animals', !!pathname?.startsWith('/marketplace'))}
            {barLink('/vets', 'Vets', !!pathname?.startsWith('/vets'))}
            {barLink('/pets', 'Knowledge', !!pathname?.startsWith('/pets'))}
            {barLink('/blog', 'Blog', !!pathname?.startsWith('/blog'))}
            {user?.role === 'VENDOR' &&
              barLink('/dashboard/vendor/products', 'Sell', !!pathname?.startsWith('/dashboard/vendor'))}
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="bg-primary-600 text-white px-4 rounded-lg text-sm">
                Go
              </button>
            </form>

            {user && (
              <div className="rounded-xl bg-primary-50 border border-primary-100 p-4">
                <p className="text-xs text-primary-700 font-medium mb-1">Signed in as</p>
                <p className="font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="text-center text-sm font-semibold bg-white border border-primary-200 rounded-lg py-2 text-primary-700"
                  >
                    My account
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    onClick={() => setMobileOpen(false)}
                    className="text-center text-sm font-semibold bg-white border border-primary-200 rounded-lg py-2 text-primary-700"
                  >
                    Orders
                  </Link>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-3">
              <Link href="/shop" onClick={() => setMobileOpen(false)} className="font-medium">
                Shop
              </Link>
              <Link
                href="/shop?catalog=pet_animal"
                onClick={() => setMobileOpen(false)}
                className="font-medium"
              >
                Pet &amp; Animal
              </Link>
              <Link
                href="/shop?catalog=general"
                onClick={() => setMobileOpen(false)}
                className="font-medium"
              >
                General Products
              </Link>
              <Link href="/cart" onClick={() => setMobileOpen(false)} className="font-medium">
                Cart ({itemCount})
              </Link>
              <Link href="/marketplace" onClick={() => setMobileOpen(false)}>
                Live Listings
              </Link>
              <Link href="/vets" onClick={() => setMobileOpen(false)}>
                Vets
              </Link>
              <Link href="/pets" onClick={() => setMobileOpen(false)}>
                Knowledge
              </Link>
              <Link href="/blog" onClick={() => setMobileOpen(false)}>
                Blog
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard/pets" onClick={() => setMobileOpen(false)}>
                    My pets
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-left text-red-600 font-medium"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-primary-600 font-medium"
                  >
                    Create account
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {allMenuOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-[40]"
          style={{ top: menuTop }}
          role="dialog"
          aria-modal="true"
          aria-label="Categories"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close categories"
            onClick={closeAllMenu}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white text-gray-900 shadow-2xl flex flex-col">
            <div className="bg-primary-900 text-white px-5 py-4 flex items-center gap-3">
              <h2 className="text-lg font-bold flex-1">Browse categories</h2>
              <button
                type="button"
                onClick={closeAllMenu}
                className="shrink-0 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-lg font-bold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Categories
              </p>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setMenuCatalog('pet_animal')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    menuCatalog === 'pet_animal'
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pet &amp; Animal
                </button>
                <button
                  type="button"
                  onClick={() => setMenuCatalog('general')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    menuCatalog === 'general'
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  General
                </button>
              </div>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href={shopHref(menuCatalog)}
                    onClick={closeAllMenu}
                    className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50 font-semibold"
                  >
                    All categories
                  </Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={shopHref(menuCatalog, cat.id)}
                      onClick={closeAllMenu}
                      className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="border-t border-gray-100 mt-5 pt-4 space-y-1">
                <Link
                  href="/marketplace"
                  onClick={closeAllMenu}
                  className="block px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                >
                  Live Animals
                </Link>
                <Link
                  href="/vets"
                  onClick={closeAllMenu}
                  className="block px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                >
                  Find a Vet
                </Link>
                <Link
                  href="/pets"
                  onClick={closeAllMenu}
                  className="block px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                >
                  Knowledge
                </Link>
                <Link
                  href="/blog"
                  onClick={closeAllMenu}
                  className="block px-3 py-2.5 rounded-lg text-sm text-gray-800 hover:bg-gray-50"
                >
                  Blog
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <CartDrawer />
    </>
  )
}
