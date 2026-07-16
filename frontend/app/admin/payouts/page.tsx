'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type Payout = {
  id: number
  vendor_id?: number
  vendor_email?: string
  amount: number | string
  status: string
  reference?: string | null
  created_at?: string
  paid_at?: string | null
}

export default function AdminPayoutsPage() {
  const router = useRouter()
  const [items, setItems] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = (status = filter) =>
    api.get(`/admin/payouts?status=${encodeURIComponent(status)}`).then((data) => {
      setItems(data.items || [])
    })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/admin/payouts')
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push('/admin'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const markPaid = async (id: number) => {
    const reference = window.prompt('Payment reference (optional bank Txn ID)') || ''
    setBusyId(id)
    setMessage('')
    try {
      await api.post('/admin/payouts', { payout_id: id, reference })
      setMessage(`Payout #${id} marked paid`)
      await load(filter)
    } catch (err: any) {
      setMessage(err.message || 'Could not mark paid')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading payouts…</div>

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-primary-700">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Vendor payouts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Disburse vendor balances after commission. Marks ledger as paid.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {['pending', 'paid', ''].map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => {
                setFilter(s)
                load(s).catch(() => undefined)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                filter === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message}
          </div>
        )}

        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-xl border p-6">No payouts in this filter.</p>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    #{p.id} · {p.vendor_email || `Vendor ${p.vendor_id}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    BDT {Number(p.amount).toFixed(2)} · {p.status}
                    {p.created_at ? ` · ${new Date(p.created_at).toLocaleString()}` : ''}
                  </p>
                </div>
                {p.status === 'pending' && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => markPaid(p.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {busyId === p.id ? '…' : 'Mark paid'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
