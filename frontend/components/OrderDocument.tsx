'use client'

import { LOGO_SRC } from '@/components/KediSmartLogo'

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
    vendor_earnings?: Money
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
  /** When true, items are vendor-scoped; totals use line items only */
  vendor_scope?: boolean
}

function money(v: Money, currency = 'BDT') {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (n == null || Number.isNaN(n)) return '—'
  return `${currency} ${Number(n).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
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

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function lineAmount(item: NonNullable<OrderDocOrder['items']>[number]) {
  if (item.line_subtotal != null) return Number(item.line_subtotal)
  return Number(item.price_snapshot || 0) * Number(item.qty || 0)
}

type Props = {
  order: OrderDocOrder
  /** Shopper → receipt; vendor/admin fulfillment → invoice; both only for rare ops use */
  mode?: 'invoice' | 'receipt' | 'both'
  className?: string
}

export default function OrderDocument({ order, mode = 'receipt', className = '' }: Props) {
  const currency = order.currency || 'BDT'
  const invoice = order.invoice
  const receipt = order.receipt
  const vendorScope = Boolean(order.vendor_scope)

  const brandName =
    invoice?.seller_name || receipt?.seller_name || order.seller?.name || 'Kedi Smart'
  const brandPhone = invoice?.seller_phone || receipt?.seller_phone || order.seller?.phone || ''
  const brandAddress =
    invoice?.seller_address || receipt?.seller_address || order.seller?.address || ''
  const brandEmail = invoice?.seller_email || receipt?.seller_email || order.seller?.email || ''

  // Payment is confirmed when wallet/COD collection is completed, or docs/order marked paid.
  const paymentConfirmed =
    order.payment?.status === 'completed' ||
    receipt?.status === 'paid' ||
    invoice?.status === 'paid' ||
    order.status === 'paid'
  const paymentPending = !paymentConfirmed && (
    order.payment?.status === 'pending' ||
    invoice?.status === 'awaiting_payment' ||
    receipt?.status === 'awaiting_payment'
  )
  const showInvoice = mode === 'invoice' || mode === 'both'
  const showReceipt = mode === 'receipt' || mode === 'both'

  const orderNumber = order.public_order_number || `KS-${String(order.id).padStart(6, '0')}`
  const invoiceNumber = invoice?.number || `KS-INV-${order.id}`
  const receiptNumber = receipt?.number || `KS-RCP-${order.id}`
  const issuedAt = invoice?.issued_at || receipt?.issued_at || order.created_at
  const customer = order.shipping_address
  const customerAddress = [customer?.address, customer?.city, customer?.country]
    .filter(Boolean)
    .join(', ')
  const items = order.items || []
  const discount = Number(order.discount || 0)

  const itemsSubtotal = items.reduce((sum, item) => sum + lineAmount(item), 0)

  return (
    <div className={`space-y-6 ${className}`}>
      {showInvoice && (
        <article className="invoice-sheet mx-auto w-full max-w-[210mm] bg-white text-[13px] text-slate-800 leading-snug border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-[#f26522]" aria-hidden />

          <div className="px-3 py-2 bg-slate-900 text-white text-[11px] sm:text-[12px] flex flex-wrap items-center justify-between gap-2 no-print">
            <span className="font-semibold tracking-wide uppercase">
              Fulfillment invoice
            </span>
            <span className="opacity-90">
              Pack with products · Shared admin &amp; vendor copy
            </span>
          </div>

          <div className="px-4 py-5 sm:px-8 sm:py-7 md:px-10">
            <header className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4 sm:gap-6 pb-5 border-b border-slate-200">
              <div className="flex items-start gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_SRC}
                  alt={brandName}
                  width={112}
                  height={62}
                  className="h-11 sm:h-[52px] w-auto object-contain shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">
                    Marketplace
                  </p>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {brandName}
                  </h1>
                  {brandAddress && (
                    <p className="mt-1 text-[12px] text-slate-600 max-w-[260px]">{brandAddress}</p>
                  )}
                  <p className="mt-1.5 text-[12px] text-slate-600 break-words">
                    {[brandPhone, brandEmail].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right sm:ml-auto shrink-0 w-full sm:w-auto">
                <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-none">
                  INVOICE
                </p>
                <p className="mt-2 text-sm font-semibold text-[#f26522] tabular-nums">
                  {invoiceNumber}
                </p>
                <dl className="mt-3 space-y-1 text-[12px]">
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-medium text-slate-900 sm:w-[7.5rem] text-right tabular-nums">
                      {formatDate(issuedAt)}
                    </dd>
                  </div>
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Order</dt>
                    <dd className="font-medium text-slate-900 sm:w-[7.5rem] text-right">
                      {orderNumber}
                    </dd>
                  </div>
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Payment</dt>
                    <dd
                      className={`font-semibold sm:w-[7.5rem] text-right ${
                        paymentPending ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {paymentPending ? 'Pending' : 'Cleared'}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>

            {vendorScope && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-950">
                Vendor copy — line items below are your SKUs only. The same invoice number is used
                in admin back office for this order.
              </p>
            )}

            <section className="grid sm:grid-cols-2 gap-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                  Ship / bill to
                </p>
                <p className="text-[15px] font-bold text-slate-900">{customer?.name || 'Customer'}</p>
                {customer?.phone && (
                  <p className="mt-1 text-[12px] text-slate-700">{customer.phone}</p>
                )}
                {customerAddress && (
                  <p className="mt-1 text-[12px] text-slate-600 max-w-sm">{customerAddress}</p>
                )}
                {customer?.notes && (
                  <p className="mt-2 text-[11px] text-slate-500">Note: {customer.notes}</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                  Method
                </p>
                <p className="text-[13px] font-semibold text-slate-900">
                  {methodLabel(order.payment?.method)}
                </p>
                <p className="mt-1 text-[12px] text-slate-600">
                  {order.fulfillment_type === 'store_pickup' ? 'Store pickup' : 'Home delivery'}
                </p>
                {order.payment?.wallet_txn_id && (
                  <p className="mt-1 text-[12px] text-slate-600">
                    Txn: <span className="font-mono">{order.payment.wallet_txn_id}</span>
                  </p>
                )}
              </div>
            </section>

            <ItemsTable items={items} currency={currency} />

            <div className="invoice-totals mt-4 flex justify-end">
              <div className="w-full max-w-[260px] space-y-1.5 text-[12px]">
                {vendorScope ? (
                  <>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Your items</span>
                      <span className="tabular-nums text-slate-900">
                        {money(itemsSubtotal, currency)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Shipping &amp; tax settle on the full order invoice in admin.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="tabular-nums text-slate-900">
                        {money(order.subtotal, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">
                        {order.fulfillment_type === 'store_pickup' ? 'Pickup fee' : 'Shipping'}
                      </span>
                      <span className="tabular-nums text-slate-900">
                        {Number(order.shipping_fee || 0) === 0
                          ? 'Free'
                          : money(order.shipping_fee, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-500">Tax (VAT)</span>
                      <span className="tabular-nums text-slate-900">
                        {money(order.tax, currency)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between gap-6">
                        <span className="text-slate-500">Discount</span>
                        <span className="tabular-nums text-emerald-700">
                          −{money(discount, currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-6 pt-2.5 mt-1 border-t-2 border-slate-900 text-[15px] font-bold">
                      <span>Order total</span>
                      <span className="tabular-nums text-[#f26522]">
                        {money(order.total, currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <footer className="invoice-footer mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-3 text-[11px] text-slate-500">
              <div>
                <p className="font-medium text-slate-700">
                  Include this invoice with the parcel for customer verification.
                </p>
                <p className="mt-0.5 max-w-md">
                  Ops contact: {[brandPhone, brandEmail].filter(Boolean).join(' · ') || 'back office'}
                </p>
                {invoice?.notes && <p className="mt-1 italic">{invoice.notes}</p>}
              </div>
              <p className="tabular-nums shrink-0">
                {invoiceNumber} · {formatDate(issuedAt)} · Page 1 of 1
              </p>
            </footer>
          </div>
        </article>
      )}

      {showReceipt && (
        <article className="invoice-sheet mx-auto w-full max-w-[210mm] bg-white text-[13px] text-slate-800 leading-snug border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-1.5 bg-[#f26522]" aria-hidden />

          <div className="px-4 py-5 sm:px-8 sm:py-7 md:px-10">
            <header className="flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-4 sm:gap-6 pb-5 border-b border-slate-200">
              <div className="flex items-start gap-3 min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={LOGO_SRC}
                  alt={brandName}
                  width={112}
                  height={62}
                  className="h-11 sm:h-[52px] w-auto object-contain shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">
                    From
                  </p>
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {brandName}
                  </h1>
                  {brandAddress && (
                    <p className="mt-1 text-[12px] text-slate-600 max-w-[260px]">{brandAddress}</p>
                  )}
                  <p className="mt-1.5 text-[12px] text-slate-600 break-words">
                    {[brandPhone, brandEmail].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right sm:ml-auto shrink-0 w-full sm:w-auto">
                <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 leading-none">
                  RECEIPT
                </p>
                <p className="mt-2 text-sm font-semibold text-[#f26522] tabular-nums">
                  {receiptNumber}
                </p>
                <dl className="mt-3 space-y-1 text-[12px]">
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Date</dt>
                    <dd className="font-medium text-slate-900 sm:w-[7.5rem] text-right tabular-nums">
                      {formatDate(receipt?.issued_at || issuedAt)}
                    </dd>
                  </div>
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Order</dt>
                    <dd className="font-medium text-slate-900 sm:w-[7.5rem] text-right">
                      {orderNumber}
                    </dd>
                  </div>
                  <div className="flex sm:justify-end gap-3">
                    <dt className="text-slate-500">Status</dt>
                    <dd
                      className={`font-semibold sm:w-[7.5rem] text-right ${
                        paymentConfirmed || !paymentPending
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {paymentConfirmed || !paymentPending
                        ? `Paid ${formatDate(receipt?.paid_at)}`
                        : order.payment?.method === 'COD'
                          ? 'Pay on delivery'
                          : 'Awaiting payment'}
                    </dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="grid sm:grid-cols-2 gap-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                  Bill to
                </p>
                <p className="text-[15px] font-bold text-slate-900">{customer?.name || 'Customer'}</p>
                {customer?.phone && (
                  <p className="mt-1 text-[12px] text-slate-700">{customer.phone}</p>
                )}
                {customerAddress && (
                  <p className="mt-1 text-[12px] text-slate-600 max-w-sm">{customerAddress}</p>
                )}
              </div>
              <div className="sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                  Payment
                </p>
                <p className="text-[13px] font-semibold text-slate-900">
                  {methodLabel(order.payment?.method)}
                </p>
                <p className="mt-1 text-[12px] text-slate-600">
                  {order.fulfillment_type === 'store_pickup' ? 'Store pickup' : 'Home delivery'}
                </p>
                {order.payment?.wallet_txn_id && (
                  <p className="mt-1 text-[12px] text-slate-600">
                    Txn: <span className="font-mono">{order.payment.wallet_txn_id}</span>
                  </p>
                )}
              </div>
            </section>

            <ItemsTable items={items} currency={currency} />

            <div className="invoice-totals mt-4 flex justify-end">
              <div className="w-full max-w-[260px] space-y-1.5 text-[12px]">
                <div className="flex justify-between gap-6">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="tabular-nums text-slate-900">
                    {money(order.subtotal, currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-500">
                    {order.fulfillment_type === 'store_pickup' ? 'Pickup fee' : 'Shipping'}
                  </span>
                  <span className="tabular-nums text-slate-900">
                    {Number(order.shipping_fee || 0) === 0
                      ? 'Free'
                      : money(order.shipping_fee, currency)}
                  </span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-slate-500">Tax (VAT)</span>
                  <span className="tabular-nums text-slate-900">{money(order.tax, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between gap-6">
                    <span className="text-slate-500">Discount</span>
                    <span className="tabular-nums text-emerald-700">
                      −{money(discount, currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-6 pt-2.5 mt-1 border-t-2 border-slate-900 text-[15px] font-bold">
                  <span>
                    {paymentConfirmed || !paymentPending ? 'Amount paid' : 'Amount due'}
                  </span>
                  <span className="tabular-nums text-[#f26522]">
                    {money(receipt?.amount ?? order.total, currency)}
                  </span>
                </div>
              </div>
            </div>

            {order.payment_instructions && paymentPending && (
              <section className="mt-5 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] no-print">
                <p className="font-semibold text-slate-900 mb-1">
                  {order.payment_instructions.title}
                </p>
                {order.payment_instructions.wallet_number && (
                  <p className="text-slate-700">
                    Wallet: <strong>{order.payment_instructions.wallet_number}</strong>
                  </p>
                )}
                {order.payment_instructions.pickup_address && (
                  <p className="text-slate-700">
                    Pickup: {order.payment_instructions.pickup_address}
                  </p>
                )}
                <ol className="mt-1 list-decimal pl-4 space-y-0.5 text-slate-600">
                  {(order.payment_instructions.steps || []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </section>
            )}

            <footer className="invoice-footer mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-end justify-between gap-3 text-[11px] text-slate-500">
              <div>
                <p className="font-medium text-slate-700">
                  Thank you for shopping with {brandName}.
                </p>
                <p className="mt-0.5 max-w-md">
                  Keep this receipt as your payment record with Kedi Smart. Support will help if
                  anything needs follow-up on your order.
                </p>
              </div>
              <p className="tabular-nums shrink-0">
                {receiptNumber} · {formatDate(receipt?.issued_at || issuedAt)}
              </p>
            </footer>
          </div>
        </article>
      )}
    </div>
  )
}

function ItemsTable({
  items,
  currency,
}: {
  items: NonNullable<OrderDocOrder['items']>
  currency: string
}) {
  return (
    <section className="pt-5 -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
      <table className="w-full min-w-[28rem] sm:min-w-0 border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-900 border-b border-slate-400">
            <th className="py-2 pl-3 pr-2 text-left text-[10px] font-semibold uppercase tracking-wider w-8">
              #
            </th>
            <th className="py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider">
              Description
            </th>
            <th className="py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-14">
              Qty
            </th>
            <th className="hidden sm:table-cell py-2 px-2 text-right text-[10px] font-semibold uppercase tracking-wider w-28">
              Unit price
            </th>
            <th className="py-2 pr-3 pl-2 text-right text-[10px] font-semibold uppercase tracking-wider w-28">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-slate-500">
                No products listed
              </td>
            </tr>
          ) : (
            items.map((item, i) => (
              <tr key={item.id || i} className="border-b border-slate-100">
                <td className="py-2.5 pl-3 pr-2 text-slate-500 tabular-nums align-top">{i + 1}</td>
                <td className="py-2.5 px-2 font-medium text-slate-900 align-top">
                  {item.title_snapshot || 'Item'}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-700 align-top">
                  {item.qty ?? 0}
                </td>
                <td className="hidden sm:table-cell py-2.5 px-2 text-right tabular-nums text-slate-700 align-top">
                  {money(item.price_snapshot, currency)}
                </td>
                <td className="py-2.5 pr-3 pl-2 text-right tabular-nums font-semibold text-slate-900 align-top">
                  {money(lineAmount(item), currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
