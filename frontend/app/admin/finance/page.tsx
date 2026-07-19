'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type FinanceReport = {
  period?: { year: number; month: number; start: string; end: string }
  gmv?: number
  delivered_gmv?: number
  income?: Record<string, number>
  costs?: Record<string, number>
  profit?: { gross_platform_sku?: number; net?: number; take_rate_pct?: number }
  payables?: Record<string, number>
}

function money(v?: number) {
  return `BDT ${Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`
}

export default function AdminFinancePage() {
  const router = useRouter()
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [charging, setCharging] = useState(false)
  const [message, setMessage] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const load = () =>
    api.get(`/admin/finance?year=${year}&month=${month}`).then(setReport)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/admin/finance')
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router, year, month])

  const chargeSubs = async () => {
    setCharging(true)
    setMessage('')
    try {
      const data = await api.post('/admin/finance/charge-subscriptions', {})
      setMessage(`Subscriptions charged: ${data.charged} (skipped ${data.skipped})`)
      await load()
    } catch (err: any) {
      setMessage(err.message || 'Charge failed')
    } finally {
      setCharging(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading finance…</div>
  }
  if (!report) return null

  const cards = [
    { label: 'GMV (period)', value: money(report.gmv) },
    { label: 'Marketplace income', value: money(report.income?.marketplace_income) },
    { label: 'Platform product sales', value: money(report.income?.platform_product_sales) },
    { label: 'Net profit (est.)', value: money(report.profit?.net) },
    { label: 'Take rate', value: `${Number(report.profit?.take_rate_pct || 0).toFixed(2)}%` },
    { label: 'Pending seller payouts', value: money(report.payables?.pending_payouts) },
  ]

  return (
    <div className="min-h-screen p-6 sm:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/admin" className="text-sm font-semibold text-primary-700">
              ← Admin
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Finance & P&L</h1>
            <p className="text-sm text-gray-500 mt-1">
              Platform owner view — sales, commissions, fees, COGS, expenses, and seller payables.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Year</span>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="min-h-[40px] w-24 rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-500 mb-1">Month</span>
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="min-h-[40px] w-20 rounded-xl border border-gray-200 px-3"
              />
            </label>
            <button
              type="button"
              disabled={charging}
              onClick={chargeSubs}
              className="min-h-[40px] rounded-xl bg-slate-900 text-white px-4 text-sm font-semibold disabled:opacity-50"
            >
              {charging ? 'Charging…' : 'Run subscriptions'}
            </button>
            <Link
              href="/admin/expenses"
              className="min-h-[40px] inline-flex items-center rounded-xl bg-primary-600 text-white px-4 text-sm font-semibold"
            >
              Expenses & bills
            </Link>
          </div>
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Income</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['Commission', report.income?.commission],
                ['Listing fees', report.income?.listing_fees],
                ['Subscriptions', report.income?.subscriptions],
                ['Setup fees', report.income?.setup_fees],
                ['Other income', report.income?.other_income],
                ['Total income', report.income?.total],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold tabular-nums">{money(value as number)}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Costs & profit</h2>
            <dl className="space-y-2 text-sm">
              {[
                ['COGS (own stock)', report.costs?.cogs],
                ['Processing (est.)', report.costs?.processing_est],
                ['Operating expenses', report.costs?.operating_expenses],
                ['Total costs', report.costs?.total],
                ['Gross (own SKUs)', report.profit?.gross_platform_sku],
                ['Net profit', report.profit?.net],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-4">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold tabular-nums">{money(value as number)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <p className="text-xs text-gray-400">
          Period {report.period?.start} → {report.period?.end}. Set variant <strong>cost price</strong> in
          Django admin for accurate COGS. Run subscriptions monthly via cron:{' '}
          <code className="bg-gray-100 px-1 rounded">python manage.py charge_seller_subscriptions</code>
        </p>
      </div>
    </div>
  )
}
