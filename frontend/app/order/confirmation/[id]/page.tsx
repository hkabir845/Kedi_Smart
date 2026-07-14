'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import OrderDocument, { type OrderDocOrder } from '@/components/OrderDocument'
import OrderTimeline from '@/components/OrderTimeline'

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<OrderDocOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [txnId, setTxnId] = useState('')
  const [savingTxn, setSavingTxn] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const raw = sessionStorage.getItem(`order_${orderId}`)
      let snapshot: OrderDocOrder | null = null
      if (raw) {
        try {
          snapshot = JSON.parse(raw)
        } catch {
          snapshot = null
        }
      }

      const token = localStorage.getItem('access_token')
      const trackToken = localStorage.getItem(`track_token_${orderId}`) || snapshot?.track_token

      try {
        if (token) {
          api.setToken(token)
          const data = await api.get(`/shop/orders/${orderId}`)
          setOrder(data)
          return
        }
        if (trackToken) {
          const data = await api.get(
            `/shop/orders/track?token=${encodeURIComponent(String(trackToken))}`,
          )
          setOrder(data)
          return
        }
      } catch {
        /* fall through to snapshot */
      }

      setOrder(snapshot || { id: Number(orderId) })
    }

    load().finally(() => setLoading(false))
  }, [orderId])

  const submitTxn = async () => {
    if (!txnId.trim() || !order) return
    setSavingTxn(true)
    setMessage('')
    try {
      const trackToken =
        localStorage.getItem(`track_token_${orderId}`) || (order as OrderDocOrder & { track_token?: string }).track_token
      const body: Record<string, string> = { wallet_txn_id: txnId.trim() }
      if (trackToken) body.token = String(trackToken)
      if (order.shipping_address?.phone) body.phone = order.shipping_address.phone
      const data = await api.post(`/shop/orders/${order.id}/payment-reference`, body)
      setOrder(data)
      setMessage('Txn ID submitted — waiting for payment approval.')
      setTxnId('')
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Could not save Txn ID')
    } finally {
      setSavingTxn(false)
    }
  }

  if (loading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-gray-500">Loading invoice…</div>
  }

  const isWallet = order?.payment?.method === 'BKASH' || order?.payment?.method === 'NAGAD'
  const paymentPending = order?.payment?.status === 'pending'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl text-green-700">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order confirmed</h1>
        <p className="text-gray-600">
          Invoice{' '}
          <strong>{order?.invoice?.number || '—'}</strong> and receipt{' '}
          <strong>{order?.receipt?.number || '—'}</strong> were created for{' '}
          <strong>{order?.public_order_number || `#${orderId}`}</strong>.
        </p>
      </div>

      {order?.timeline && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Order tracker</h2>
          <OrderTimeline steps={order.timeline} />
        </div>
      )}

      {order && <OrderDocument order={order} mode="both" />}

      {isWallet && paymentPending && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2">Submit wallet Txn ID</h3>
          <p className="text-sm text-amber-800 mb-3">
            After you send money, paste the transaction ID so we can approve payment and unlock your paid receipt.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 border border-amber-200 rounded-xl px-4 py-2.5 text-sm"
              value={txnId}
              onChange={(e) => setTxnId(e.target.value)}
              placeholder="Txn ID"
            />
            <button
              type="button"
              onClick={submitTxn}
              disabled={savingTxn || !txnId.trim()}
              className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            >
              {savingTxn ? 'Saving…' : 'Submit'}
            </button>
          </div>
          {message && <p className="text-sm mt-2 text-amber-900">{message}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="border-2 border-gray-300 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50"
        >
          Print invoice / receipt
        </button>
        <Link
          href={`/track?order=${orderId}`}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-center hover:bg-primary-700"
        >
          Track this order
        </Link>
        <Link
          href="/shop"
          className="border-2 border-primary-600 text-primary-600 px-6 py-3 rounded-xl font-semibold text-center hover:bg-primary-50"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  )
}
