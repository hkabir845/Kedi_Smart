'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import {
  PanelNotice,
  SectionHeading,
  StatCard,
  StatusPill,
} from '@/components/control-centre/PanelPrimitives'

export default function VendorSellerHomePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vendor')
      return
    }
    api.setToken(token)
    Promise.all([
      api.get('/vendor/profile').catch(() => null),
      api.get('/vendor/earnings').catch(() => null),
      api.get('/vendor/products').catch(() => []),
      api.get('/vendor/orders').catch(() => []),
    ])
      .then(([profileData, earningsData, productData, orderData]) => {
        setProfile(profileData)
        setStats(earningsData)
        setProducts(Array.isArray(productData) ? productData : productData?.items || [])
        setOrders(Array.isArray(orderData) ? orderData : orderData?.items || [])
      })
      .finally(() => setLoading(false))
  }, [router])

  const openOrders = useMemo(
    () =>
      orders.filter(
        (o) => !['delivered', 'cancelled', 'refunded'].includes(o.status || o.order_status || '')
      ).length,
    [orders]
  )

  const pendingProducts = useMemo(
    () => products.filter((p) => p.approval_status === 'pending' || p.status === 'draft').length,
    [products]
  )

  const liveProducts = useMemo(
    () =>
      products.filter(
        (p) => p.approval_status === 'approved' && (p.status === 'published' || p.status === 'active')
      ).length,
    [products]
  )

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 rounded-2xl bg-gray-200" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  const approved = Boolean(profile?.is_approved)
  const checklist = [
    {
      done: Boolean(profile),
      title: 'Create shop profile',
      hint: 'Shop name, payout method, and contact details',
      href: '/dashboard/vendor/profile',
    },
    {
      done: Boolean(profile?.logo_url),
      title: 'Add shop logo',
      hint: 'Builds trust on product pages and orders',
      href: '/dashboard/vendor/profile',
    },
    {
      done: products.length > 0,
      title: 'List your first product',
      hint: 'Title, photos, price, and stock — like Amazon & Shopify sellers',
      href: '/dashboard/vendor/products/new',
    },
    {
      done: approved,
      title: 'Get shop approved',
      hint: 'KediSmart reviews your shop before it goes fully live',
      href: '/dashboard/vendor/profile',
    },
  ]
  const nextStep = checklist.find((c) => !c.done)

  return (
    <div className="space-y-8">
      {/* Hero — Seller Central style */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="min-w-0">
            <p className="text-primary-100 text-sm font-medium mb-1">Seller Centre</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {profile?.shop_name ? `Welcome, ${profile.shop_name}` : 'Grow your shop on KediSmart'}
            </h1>
            <p className="mt-2 text-primary-100/90 text-sm max-w-xl leading-relaxed">
              Add products, fulfill orders, and track earnings — the same way top marketplaces guide
              sellers worldwide.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPill tone={approved ? 'success' : 'warning'}>
                {approved ? 'Shop approved' : 'Pending shop approval'}
              </StatusPill>
              <StatusPill tone="neutral">{products.length} in catalogue</StatusPill>
              {profile?.shop_slug && <StatusPill tone="neutral">/{profile.shop_slug}</StatusPill>}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/dashboard/vendor/products/new"
              className="inline-flex items-center justify-center min-h-[48px] rounded-xl bg-white text-primary-800 px-6 py-3 text-sm font-bold shadow-md hover:bg-primary-50 transition"
            >
              + Add a product
            </Link>
            <Link
              href="/dashboard/vendor/products"
              className="inline-flex items-center justify-center min-h-[48px] rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold hover:bg-white/20 transition"
            >
              Manage catalogue
            </Link>
          </div>
        </div>
      </section>

      {!profile && (
        <PanelNotice tone="warning">
          Finish your shop profile before listing.{' '}
          <Link href="/dashboard/vendor/profile" className="font-semibold underline">
            Open shop profile
          </Link>
        </PanelNotice>
      )}

      {!approved && profile && (
        <PanelNotice tone="info">
          Your shop is in review. You can still add products now — they stay in moderation until your
          shop is approved (same flow as Walmart Seller Center / Amazon).
        </PanelNotice>
      )}

      {/* Setup checklist */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <SectionHeading
          title="Get ready to sell"
          action={
            nextStep ? (
              <Link
                href={nextStep.href}
                className="text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                Continue →
              </Link>
            ) : (
              <span className="text-sm font-semibold text-green-700">You&apos;re all set ✓</span>
            )
          }
        />
        <ol className="space-y-3">
          {checklist.map((item, i) => (
            <li key={item.title}>
              <Link
                href={item.href}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                  item.done
                    ? 'border-green-100 bg-green-50/60'
                    : 'border-gray-100 hover:border-primary-200 hover:bg-primary-50/40'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    item.done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {item.done ? '✓' : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-900 text-sm">{item.title}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{item.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Gross sales"
          value={`BDT ${Number(stats?.gross_sales || 0).toFixed(0)}`}
        />
        <StatCard
          label="Net earnings"
          value={`BDT ${Number(stats?.net_earnings || 0).toFixed(0)}`}
        />
        <StatCard label="Open orders" value={openOrders} hint={`${orders.length} total`} />
        <StatCard
          label="Live products"
          value={liveProducts}
          hint={pendingProducts ? `${pendingProducts} in review` : 'All clear'}
        />
      </section>

      {/* Quick actions */}
      <section>
        <SectionHeading title="Seller operations" />
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              href: '/dashboard/vendor/products/new',
              icon: '📦',
              title: 'Add product',
              description: 'Guided listing: category, price, stock & details',
              primary: true,
            },
            {
              href: '/dashboard/vendor/products',
              icon: '🗂️',
              title: 'My products',
              description: 'Edit catalogue, check approval status',
            },
            {
              href: '/dashboard/vendor/orders',
              icon: '🚚',
              title: 'Customer orders',
              description: 'Fulfill and track orders for your items',
            },
            {
              href: '/dashboard/vendor/earnings',
              icon: '৳',
              title: 'Earnings & payouts',
              description: 'Sales, fees, and settlement totals',
            },
            {
              href: '/dashboard/vendor/statements',
              icon: '📑',
              title: 'Monthly statements',
              description: 'Gross, fees, refunds, and net by month',
            },
            {
              href: '/dashboard/vendor/profile',
              icon: '🏪',
              title: 'Shop profile',
              description: 'Logo, payout bank / bKash, shop story',
            },
            {
              href: '/shop',
              icon: '👀',
              title: 'Preview storefront',
              description: 'See how shoppers browse KediSmart',
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex gap-4 rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
                item.primary
                  ? 'border-primary-200 bg-primary-50/50 hover:border-primary-300'
                  : 'border-gray-100 bg-white hover:border-primary-100'
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm border border-gray-100">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-gray-900 group-hover:text-primary-800">
                  {item.title}
                </span>
                <span className="block text-sm text-gray-500 mt-0.5">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent products teaser */}
      {products.length > 0 && (
        <section>
          <SectionHeading
            title="Recent listings"
            action={
              <Link
                href="/dashboard/vendor/products"
                className="text-sm font-semibold text-primary-700 hover:text-primary-800"
              >
                View all
              </Link>
            }
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-gray-900 line-clamp-1">{p.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {p.variants?.[0] ? `BDT ${p.variants[0].price}` : 'No price'} ·{' '}
                  {p.approval_status || p.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
