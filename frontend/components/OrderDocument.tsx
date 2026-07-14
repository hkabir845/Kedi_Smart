'use client'

type Money = number | string | null | undefined

export type OrderDocOrder = {
  id: number
  public_order_number?: string
  status?: string
  fulfillment_type?: string
  subtotal?: Money
  shipping_fee?: Money
  tax?: Money
  discount?: Money
  total?: Money
  currency?: string
  created_at?: string
  items?: Array<{
    id?: number
    title_snapshot?: string
    qty?: number
    price_snapshot?: Money
    line_subtotal?: Money
  }>
  shipping_address?: {
    name?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    notes?: string
  } | null
  payment?: {
    method?: string
    status?: string
    wallet_txn_id?: string | null
    reference?: string | null
  } | null
  invoice?: {
    number?: string
    status?: string
    issued_at?: string
    seller_name?: string
    seller_phone?: string
    seller_email?: string
    seller_address?: string
    notes?: string
  } | null
  receipt?: {
    number?: string
    status?: string
    issued_at?: string
    paid_at?: string | null
    amount?: Money
    seller_name?: string
    seller_phone?: string
    seller_email?: string
    seller_address?: string
  } | null
  seller?: {
    name?: string
    phone?: string
    email?: string
    address?: string
  } | null
  payment_instructions?: {
    title?: string
    wallet_number?: string
    pickup_address?: string
    steps?: string[]
  } | null
  timeline?: Array<{
    key: string
    label: string
    done?: boolean
    active?: boolean
    detail?: string
  }>
  track_token?: string
}

function fmt(v: Money, currency = 'BDT') {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (n == null || Number.isNaN(n)) return '—'
  return `${currency} ${Number(n).toFixed(0)}`
}

function methodLabel(method?: string) {
  switch (method) {
    case 'COD':
      return 'Cash on Delivery'
    case 'BKASH':
      return 'bKash'
    case 'NAGAD':
      return 'Nagad'
    case 'STORE_PICKUP':
      return 'Store pickup'
    case 'Manual':
      return 'Manual payment'
    default:
      return method || '—'
  }
}

type Props = {
  order: OrderDocOrder
  mode?: 'invoice' | 'receipt' | 'both'
  className?: string
}

export default function OrderDocument({ order, mode = 'both', className = '' }: Props) {
  const currency = order.currency || 'BDT'
  const seller = order.invoice || order.receipt || order.seller || {}
  const invoice = order.invoice
  const receipt = order.receipt
  const paymentPending = order.payment?.status === 'pending' || invoice?.status === 'awaiting_payment'
  const showInvoice = mode === 'invoice' || mode === 'both'
  const showReceipt = mode === 'receipt' || mode === 'both'

  return (
    <div className={`space-y-6 ${className}`}>
      {showInvoice && invoice && (
        <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden print:border-black print:rounded-none">
          <div className="bg-primary-600 text-white px-6 py-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">Tax invoice</p>
              <h2 className="text-xl font-bold">{invoice.number}</h2>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{seller.seller_name || order.seller?.name || 'Kedi Smart'}</p>
              <p className="opacity-90">{seller.seller_phone || order.seller?.phone}</p>
              <p className="opacity-90 max-w-xs">{seller.seller_address || order.seller?.address}</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex flex-wrap justify-between gap-4 text-sm">
              <div>
                <p className="text-gray-500">Bill to</p>
                <p className="font-semibold text-gray-900">{order.shipping_address?.name}</p>
                <p className="text-gray-600">{order.shipping_address?.phone}</p>
                <p className="text-gray-600">
                  {order.shipping_address?.address}
                  {order.shipping_address?.city ? `, ${order.shipping_address.city}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Order</p>
                <p className="font-semibold">{order.public_order_number || `KS-${String(order.id).padStart(6, '0')}`}</p>
                <p className="text-gray-600">
                  {order.created_at ? new Date(order.created_at).toLocaleString() : ''}
                </p>
                <p
                  className={`mt-2 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                    paymentPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {paymentPending ? 'Awaiting payment approval' : 'Payment approved'}
                </p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium text-right">Qty</th>
                  <th className="py-2 font-medium text-right">Price</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, i) => (
                  <tr key={item.id || i} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-900">{item.title_snapshot}</td>
                    <td className="py-2.5 text-right">{item.qty}</td>
                    <td className="py-2.5 text-right">{fmt(item.price_snapshot, currency)}</td>
                    <td className="py-2.5 text-right font-medium">
                      {fmt(
                        item.line_subtotal ??
                          (Number(item.price_snapshot || 0) * Number(item.qty || 0)),
                        currency,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{fmt(order.subtotal, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {order.fulfillment_type === 'store_pickup' ? 'Pickup' : 'Shipping'}
                </span>
                <span>
                  {Number(order.shipping_fee || 0) === 0 ? 'Free' : fmt(order.shipping_fee, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{fmt(order.tax, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total due</span>
                <span className="text-primary-700">{fmt(order.total, currency)}</span>
              </div>
              <p className="text-xs text-gray-500 pt-1">Method: {methodLabel(order.payment?.method)}</p>
            </div>

            {order.payment_instructions && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm">
                <p className="font-semibold text-gray-900 mb-2">{order.payment_instructions.title}</p>
                {order.payment_instructions.wallet_number && (
                  <p className="mb-2">
                    Wallet:{' '}
                    <strong className="text-primary-700">{order.payment_instructions.wallet_number}</strong>
                  </p>
                )}
                {order.payment_instructions.pickup_address && (
                  <p className="mb-2">Pickup: {order.payment_instructions.pickup_address}</p>
                )}
                <ol className="list-decimal pl-5 space-y-1 text-gray-600">
                  {(order.payment_instructions.steps || []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </article>
      )}

      {showReceipt && receipt && (
        <article className="bg-white border border-gray-200 rounded-2xl overflow-hidden print:border-black print:rounded-none">
          <div
            className={`px-6 py-4 flex flex-wrap items-start justify-between gap-3 ${
              receipt.status === 'paid' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-white'
            }`}
          >
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">
                {receipt.status === 'paid' ? 'Official receipt' : 'Customer receipt (pending payment)'}
              </p>
              <h2 className="text-xl font-bold">{receipt.number}</h2>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">{receipt.seller_name || 'Kedi Smart'}</p>
              <p className="opacity-90">{receipt.seller_phone}</p>
              <p className="opacity-90">{receipt.seller_email}</p>
            </div>
          </div>
          <div className="p-6 text-sm space-y-3">
            <div className="flex justify-between gap-4">
              <div>
                <p className="text-gray-500">Customer</p>
                <p className="font-semibold">{order.shipping_address?.name}</p>
                <p>{order.shipping_address?.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Linked invoice</p>
                <p className="font-semibold">{invoice?.number || '—'}</p>
                <p>
                  {receipt.status === 'paid'
                    ? `Paid ${receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : ''}`
                    : 'Waiting for payment approval'}
                </p>
              </div>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>{receipt.status === 'paid' ? 'Amount paid' : 'Amount due'}</span>
              <span>{fmt(receipt.amount ?? order.total, currency)}</span>
            </div>
            {order.payment?.wallet_txn_id && (
              <p className="text-gray-600">Txn ID: {order.payment.wallet_txn_id}</p>
            )}
            <p className="text-xs text-gray-500">
              Seller address: {receipt.seller_address || order.seller?.address}
            </p>
          </div>
        </article>
      )}
    </div>
  )
}
