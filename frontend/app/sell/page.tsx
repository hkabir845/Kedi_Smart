'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

type Plan = {
  slug: string
  name: string
  description?: string
  commission_percent: number | string
  listing_fee: number | string
  setup_fee: number | string
  subscription_monthly_fee: number | string
  is_default?: boolean
}

type CategoryRate = {
  name: string
  slug: string
  commission_percent: number
}

type FeeGuide = {
  hold_days: number
  highlights: string[]
  plans: Plan[]
  category_rates: CategoryRate[]
}

export default function SellOnKediPage() {
  const [guide, setGuide] = useState<FeeGuide | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/shop/seller-fees')
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load fee guide')
        return res.json()
      })
      .then(setGuide)
      .catch((err) => setError(err.message || 'Could not load fees'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-emerald-50/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs
          items={[
            { name: 'Home', path: '/' },
            { name: 'Sell on Kedi Smart', path: '/sell' },
          ]}
        />

        <header className="mt-4 mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700 mb-2">
            For sellers
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-3">
            Sell on Kedi Smart
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
            List pet products, clinic services, or live animals. Free to start on Standard — clear
            category commissions and payouts after delivery.
          </p>
        </header>

        {error && (
          <p className="mb-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {guide && (
          <ul className="grid sm:grid-cols-2 gap-3 mb-10">
            {guide.highlights.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-emerald-100 bg-white/90 px-4 py-3 text-sm text-gray-800 shadow-sm"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-3 mb-12">
          <Link
            href="/register?role=VENDOR"
            className="inline-flex min-h-[48px] items-center rounded-xl bg-primary-600 px-6 text-sm font-bold text-white hover:bg-primary-700"
          >
            Open a shop
          </Link>
          <Link
            href="/register?role=VET"
            className="inline-flex min-h-[48px] items-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-800 hover:border-primary-300"
          >
            Join as a vet
          </Link>
          <Link
            href="/register?role=BREEDER"
            className="inline-flex min-h-[48px] items-center rounded-xl border border-gray-200 bg-white px-6 text-sm font-bold text-gray-800 hover:border-primary-300"
          >
            List live animals
          </Link>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller plans</h2>
          <p className="text-sm text-gray-600 mb-4">
            Most sellers start on Standard. Upgrade later if you want lower rates with a monthly plan.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Commission</th>
                  <th className="px-4 py-3 text-right">Listing fee</th>
                  <th className="px-4 py-3 text-right">Setup</th>
                  <th className="px-4 py-3 text-right">Monthly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(guide?.plans || []).map((plan) => (
                  <tr key={plan.slug} className={plan.is_default ? 'bg-primary-50/40' : undefined}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">
                        {plan.name}
                        {plan.is_default ? ' · Default' : ''}
                      </p>
                      {plan.description && (
                        <p className="text-xs text-gray-500 mt-0.5 max-w-sm">{plan.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {Number(plan.commission_percent).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(plan.listing_fee) === 0
                        ? 'Free'
                        : `BDT ${Number(plan.listing_fee).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(plan.setup_fee) === 0
                        ? '—'
                        : `BDT ${Number(plan.setup_fee).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(plan.subscription_monthly_fee) === 0
                        ? '—'
                        : `BDT ${Number(plan.subscription_monthly_fee).toLocaleString()}`}
                    </td>
                  </tr>
                ))}
                {!guide && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Loading plans…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {guide && (
            <p className="text-xs text-gray-500 mt-3">
              Shop product commission often uses the category rate below when set; otherwise the plan
              default applies. Payouts clear {guide.hold_days} days after delivery.
            </p>
          )}
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Category commission examples</h2>
          <p className="text-sm text-gray-600 mb-4">
            Like Daraz: food is usually lower; toys and accessories a bit higher.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Take rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(guide?.category_rates || []).slice(0, 20).map((cat) => (
                  <tr key={cat.slug}>
                    <td className="px-4 py-3">{cat.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {Number(cat.commission_percent).toFixed(0)}%
                    </td>
                  </tr>
                ))}
                {guide && guide.category_rates.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-gray-500">
                      Category rates will appear after catalog seeding.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-primary-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready when you are</h2>
          <p className="text-sm text-gray-600 mb-4">
            Create your seller account, add bank or mobile wallet details, and start listing. Earnings
            and light books live in your dashboard.
          </p>
          <Link
            href="/register?role=VENDOR"
            className="inline-flex min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700"
          >
            Start selling
          </Link>
        </section>
      </div>
    </div>
  )
}
