'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'
import OrderTimeline from '@/components/OrderTimeline'

export default function TrackOrderClient() {
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState(searchParams.get('order') || '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<OrderDocOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [txnId, setTxnId] = useState('')

  useEffect(() => {
    const preset = searchParams.get('order')
    const token = searchParams.get('token')
    if (token) {
      setLoading(true)
      api
        .get(`/shop/orders/track?token=${encodeURIComponent(token)}`)
        .then(setOrder)
        .catch(() => setError('Tracking link is invalid or expired.'))
        .finally(() => setLoading(false))
    } else if (preset) {
      setOrderId(preset)
    }
  }, [searchParams])

  const track = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.post('/shop/orders/track', {
        order_id: Number(orderId),
        phone,
      })
      setOrder(data)
      if (data.track_token) {
        localStorage.setItem(`track_token_${data.id}`, data.track_token)
      }
    } catch (err: unknown) {
      setOrder(null)
      setError(err instanceof Error ? err.message : 'Order not found')
    } finally {
      setLoading(false)
    }
  }

  const submitTxn = async () => {
    if (!order || !txnId.trim()) return
    setLoading(true)
    try {
      const token = localStorage.getItem(`track_token_${order.id}`) || order.track_token
      const data = await api.post(`/shop/orders/${order.id}/payment-reference`, {
        wallet_txn_id: txnId.trim(),
        phone,
        token,
      })
      setOrder(data)
      setTxnId('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save Txn ID')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Track your order</h1>
      <p className="text-gray-600 mb-8">
        Enter your order number and the phone used at checkout — same pattern as Daraz / Amazon order status.
      </p>

      <form
        onSubmit={track}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 grid sm:grid-cols-3 gap-3"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order number</label>
          <input
            required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="e.g. 42"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            required
            type="tel"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2.5 rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Looking up…' : 'Track'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {order && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-500">Order</p>
                <p className="text-xl font-bold">{order.public_order_number || `#${order.id}`}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold capitalize">{order.status}</p>
              </div>
            </div>
            {order.timeline && <OrderTimeline steps={order.timeline} />}
          </div>

          {(order.payment?.method === 'BKASH' || order.payment?.method === 'NAGAD') &&
            order.payment?.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-semibold text-amber-900 mb-2">Payment awaiting approval</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="flex-1 border border-amber-200 rounded-xl px-4 py-2.5 text-sm"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Paste wallet Txn ID"
                  />
                  <button
                    type="button"
                    onClick={submitTxn}
                    className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm"
                  >
                    Submit Txn ID
                  </button>
                </div>
              </div>
            )}

          <OrderDocument order={order} mode="receipt" />

          <div className="flex gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="border border-gray-300 px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              Print receipt
            </button>
            <Link href="/dashboard/orders" className="text-primary-600 text-sm font-semibold self-center">
              View in account →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
