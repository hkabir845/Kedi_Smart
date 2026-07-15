'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function VendorOrdersPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vendor/orders')
      return
    }

    api.setToken(token)
    api
      .get('/vendor/orders')
      .then(setItems)
      .catch(() => router.push('/dashboard/vendor'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="text-gray-500">Loading customer orders...</div>
  }

  const orderIds = Array.from(
    new Set(items.map((item) => item.order?.id).filter(Boolean))
  ) as number[]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer orders</h2>
      <p className="text-gray-600 mb-6 max-w-2xl">
        Shoppers always buy from <strong>Kedi Smart</strong> — they never see your shop name.
        Internally, lines with your products land here so you can pack and ship. Print the packing
        invoice to include with the parcel (Amazon FBM-style).
      </p>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-600">No sales yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderIds.map((orderId) => {
            const lines = items.filter((item) => item.order?.id === orderId)
            const order = lines[0]?.order
            const invoiceNumber = lines[0]?.invoice_number
            const earnings = lines.reduce(
              (sum: number, item: any) => sum + Number(item.vendor_earnings || 0),
              0
            )
            return (
              <div
                key={orderId}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Order #{orderId}
                      {invoiceNumber ? (
                        <span className="ml-2 text-xs font-medium text-primary-700">
                          {invoiceNumber}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {order?.status || '—'} · {lines.length} SKU{lines.length === 1 ? '' : 's'} ·
                      Your earnings BDT {earnings.toLocaleString()}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/vendor/orders/${orderId}`}
                    className="inline-flex items-center justify-center min-h-[40px] rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Open invoice
                  </Link>
                </div>
                <ul className="mt-3 divide-y divide-gray-50 text-sm">
                  {lines.map((item) => (
                    <li key={item.id} className="py-2 flex justify-between gap-3">
                      <span className="text-gray-800 min-w-0">
                        {item.title_snapshot}{' '}
                        <span className="text-gray-400">×{item.qty}</span>
                      </span>
                      <span className="text-green-700 font-medium shrink-0">
                        BDT {item.vendor_earnings}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
