'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type OrderSnapshot = {
  id: number
  subtotal?: number | string
  shipping_fee?: number | string
  tax?: number | string
  total?: number | string
  currency?: string
  status?: string
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.id as string
  const [order, setOrder] = useState<OrderSnapshot | null>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem(`order_${orderId}`)
    if (raw) {
      try {
        setOrder(JSON.parse(raw))
      } catch {
        setOrder({ id: Number(orderId) })
      }
    } else {
      setOrder({ id: Number(orderId) })
    }
  }, [orderId])

  const fmt = (v?: number | string) => {
    const n = typeof v === 'string' ? parseFloat(v) : v
    return n != null && !Number.isNaN(n) ? n.toFixed(0) : '—'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-10 md:p-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for shopping with Kedi Smart. Your order <strong>#{orderId}</strong> has been received.
        </p>

        {order && (
          <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-2 text-sm mb-8">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>BDT {fmt(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>BDT {fmt(order.shipping_fee ?? 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (5%)</span>
              <span>BDT {fmt(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary-600">BDT {fmt(order.total)}</span>
            </div>
            <p className="text-xs text-gray-500 pt-2">Payment: Cash on Delivery</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/shop"
            className="bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-700"
          >
            Continue Shopping
          </Link>
          <Link
            href="/login"
            className="border-2 border-primary-600 text-primary-600 px-8 py-3.5 rounded-xl font-semibold hover:bg-primary-50"
          >
            Track in Account
          </Link>
        </div>
      </div>
    </div>
  )
}
