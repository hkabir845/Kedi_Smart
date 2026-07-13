'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function VendorEarningsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    api.setToken(token)
    api
      .get('/vendor/earnings')
      .then(setStats)
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="text-gray-500">Loading earnings...</div>
  }

  if (!stats) return null

  const cards = [
    { label: 'Gross sales', value: stats.gross_sales, color: 'text-gray-900' },
    { label: 'Platform fees', value: stats.platform_fees, color: 'text-red-600' },
    { label: 'Net earnings', value: stats.net_earnings, color: 'text-primary-700' },
    { label: 'Pending payout', value: stats.pending_payout, color: 'text-amber-700' },
    { label: 'Paid out', value: stats.paid_out, color: 'text-green-700' },
    { label: 'Ledger balance', value: stats.ledger_balance, color: 'text-gray-900' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h2>
      <p className="text-gray-600 mb-6">Track your shop sales, fees, and payouts.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              BDT {Number(card.value || 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
