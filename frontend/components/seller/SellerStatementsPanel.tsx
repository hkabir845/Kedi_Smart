'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type Statement = {
  id?: number
  period_start: string
  period_end: string
  year?: number
  month?: number
  gross_sales: number
  platform_fees: number
  listing_fees: number
  refunds: number
  payouts: number
  net: number
  status?: string
}

type SellerStatementsPanelProps = {
  basePath: string
  fallbackPath: string
}

export function SellerStatementsPanel({ basePath, fallbackPath }: SellerStatementsPanelProps) {
  const router = useRouter()
  const [items, setItems] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Statement | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=${basePath}/statements`)
      return
    }
    api.setToken(token)
    api
      .get('/vendor/statements')
      .then((data) => setItems(data.items || []))
      .catch((err) => {
        setError(err.message || 'Failed to load statements')
        router.push(fallbackPath)
      })
      .finally(() => setLoading(false))
  }, [router, basePath, fallbackPath])

  const openMonth = async (year: number, month: number) => {
    setError('')
    try {
      const data = await api.get(`/vendor/statements?year=${year}&month=${month}`)
      setSelected(data)
    } catch (err: any) {
      setError(err.message || 'Could not load month')
    }
  }

  if (loading) return <div className="text-gray-500">Loading statements…</div>

  return (
    <div className="space-y-6 print:p-0">
      <div className="no-print flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link href={`${basePath}/earnings`} className="text-sm font-semibold text-primary-700">
            ← Earnings
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Monthly statements</h1>
          <p className="text-sm text-gray-600 mt-1">
            Amazon-style settlement summary — gross sales, platform fees, refunds, and net.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white"
        >
          Print / save PDF
        </button>
      </div>

      {error && (
        <div className="no-print rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="no-print grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No statements yet. Earnings will appear after sales clear.</p>
        ) : (
          items.map((s) => {
            const y = s.year || Number(s.period_start?.slice(0, 4))
            const m = s.month || Number(s.period_start?.slice(5, 7))
            return (
              <button
                key={`${s.period_start}-${s.period_end}`}
                type="button"
                onClick={() => openMonth(y, m)}
                className="text-left bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 hover:border-primary-200"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {s.period_start} → {s.period_end}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Status: {s.status || 'draft'}</p>
                  </div>
                  <p className="font-bold text-primary-700">BDT {Number(s.net || 0).toFixed(0)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {selected && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 invoice-sheet">
          <h2 className="text-xl font-bold text-gray-900">
            Statement {selected.period_start} – {selected.period_end}
          </h2>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm">
            {(
              [
                ['Gross sales', selected.gross_sales],
                ['Platform fees', selected.platform_fees],
                ['Listing fees', selected.listing_fees],
                ['Refunds', selected.refunds],
                ['Payouts', selected.payouts],
                ['Net', selected.net],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-gray-50 py-2">
                <dt className="text-gray-600">{label}</dt>
                <dd className="font-semibold text-gray-900">BDT {Number(value || 0).toFixed(2)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  )
}
