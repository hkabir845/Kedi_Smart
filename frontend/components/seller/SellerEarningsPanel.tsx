'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PanelNotice } from '@/components/control-centre/PanelPrimitives'

type SellerEarningsPanelProps = {
  /** Base path for statements link, e.g. /dashboard/vendor */
  basePath: string
  /** Where to send the user if earnings fail to load */
  fallbackPath: string
}

export function SellerEarningsPanel({ basePath, fallbackPath }: SellerEarningsPanelProps) {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => api.get('/vendor/earnings').then(setStats)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=${basePath}/earnings`)
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push(fallbackPath))
      .finally(() => setLoading(false))
  }, [router, basePath, fallbackPath])

  const requestPayout = async () => {
    setRequesting(true)
    setMessage('')
    try {
      await api.post('/vendor/payouts', {})
      setMessage('Payout request submitted. Platform staff will process it.')
      await load()
    } catch (err: any) {
      setMessage(err.message || 'Could not request payout')
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading earnings...</div>
  }

  if (!stats) return null

  const holdDays = Number(stats.hold_days || 3)
  const cards = [
    { label: 'You earned (net)', value: stats.net_earnings, color: 'text-primary-700' },
    { label: 'Kedi Smart took', value: stats.platform_took ?? (Number(stats.platform_fees || 0) + Number(stats.processing_fees || 0)), color: 'text-red-600' },
    { label: 'Clearing hold', value: stats.held_for_clearance, color: 'text-amber-700' },
    { label: 'Available to withdraw', value: stats.available_for_payout, color: 'text-emerald-700' },
    { label: 'Gross sales', value: stats.gross_sales, color: 'text-gray-900' },
    { label: 'Pending payout', value: stats.pending_payout, color: 'text-amber-700' },
    { label: 'Paid out', value: stats.paid_out, color: 'text-green-700' },
    { label: 'Ledger balance', value: stats.ledger_balance, color: 'text-gray-900' },
  ]

  const ledger = Array.isArray(stats.ledger) ? stats.ledger : []
  const payouts = Array.isArray(stats.payouts) ? stats.payouts : []
  const canRequest = Number(stats.available_for_payout || 0) > 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h2>
          <p className="text-gray-600">
            See what you keep, what Kedi Smart takes, and when you can withdraw.
          </p>
          <Link
            href={`${basePath}/statements`}
            className="inline-block mt-2 text-sm font-semibold text-primary-700 hover:underline"
          >
            View monthly statements →
          </Link>
        </div>
        <button
          type="button"
          disabled={!canRequest || requesting}
          onClick={requestPayout}
          className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
        >
          {requesting ? 'Requesting…' : 'Request payout'}
        </button>
      </div>

      {stats.fee_explainer && <PanelNotice tone="info">{stats.fee_explainer}</PanelNotice>}
      {stats.payout_note && <PanelNotice tone="info">{stats.payout_note}</PanelNotice>}
      {Number(stats.held_for_clearance || 0) > 0 && (
        <PanelNotice tone="warning">
          BDT {Number(stats.held_for_clearance).toLocaleString()} is clearing — withdrawable {holdDays}{' '}
          days after the order is marked delivered (buyer protection, like Daraz).
        </PanelNotice>
      )}
      {message && (
        <PanelNotice tone={message.includes('submitted') ? 'success' : 'warning'}>{message}</PanelNotice>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              BDT {Number(card.value || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Payout history</h3>
        {payouts.length === 0 ? (
          <p className="text-sm text-gray-500">No payout requests yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((row: any) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">#{row.id}</td>
                    <td className="px-4 py-3 font-semibold">
                      BDT {Number(row.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent ledger</h3>
        {ledger.length === 0 ? (
          <p className="text-sm text-gray-500">
            No ledger entries yet. Balance updates when platform staff approve customer payments.
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row: any) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-800">{row.entry_type}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.title || row.note || '—'}
                      {row.order_id ? ` · Order #${row.order_id}` : ''}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        Number(row.amount) < 0 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {Number(row.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
