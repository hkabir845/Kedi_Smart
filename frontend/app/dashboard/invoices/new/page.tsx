'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type Line = { title: string; qty: string; price: string }

const emptyLine = (): Line => ({ title: '', qty: '1', price: '' })

function todayInput() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function NewSellerInvoicePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [issuedAt, setIssuedAt] = useState(todayInput())
  const [markPaid, setMarkPaid] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Manual')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState('0')
  const [shipping, setShipping] = useState('0')
  const [tax, setTax] = useState('0')
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Bangladesh',
    notes: '',
  })
  const [seller, setSeller] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })
  const [items, setItems] = useState<Line[]>([emptyLine()])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/invoices/new')
      return
    }
    api.setToken(token)
    api
      .get('/seller/invoices/defaults')
      .then((data) => {
        if (data?.seller) setSeller((prev) => ({ ...prev, ...data.seller }))
      })
      .catch(() => null)
  }, [router])

  const subtotal = items.reduce((sum, line) => {
    const qty = Number(line.qty) || 0
    const price = Number(line.price) || 0
    return sum + qty * price
  }, 0)
  const total =
    subtotal + (Number(shipping) || 0) + (Number(tax) || 0) - (Number(discount) || 0)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const payloadItems = items
      .filter((l) => l.title.trim())
      .map((l) => ({
        title: l.title.trim(),
        qty: Number(l.qty) || 1,
        price: Number(l.price) || 0,
      }))
    if (!payloadItems.length) {
      setError('Add at least one line item.')
      return
    }
    if (!customer.name.trim()) {
      setError('Customer name is required.')
      return
    }
    setSaving(true)
    try {
      const order = await api.post('/seller/invoices', {
        issued_at: issuedAt,
        mark_paid: markPaid,
        payment_method: paymentMethod,
        notes: notes || undefined,
        discount: Number(discount) || 0,
        shipping_fee: Number(shipping) || 0,
        tax: Number(tax) || 0,
        customer,
        seller,
        items: payloadItems,
      })
      router.push(`/dashboard/invoices/${order.id}`)
    } catch (err: any) {
      setError(err.message || 'Could not create invoice')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <Link href="/dashboard/invoices" className="text-sm font-semibold text-primary-700">
          ← Invoices
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">New invoice</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manual internal sale — number auto-assigned in the same pool as online website orders.
          Set any invoice date; edit anytime before printing.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Invoice details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Invoice date</span>
              <input
                type="date"
                required
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Payment method</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3 bg-white"
              >
                <option value="Manual">Cash / manual</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
                <option value="COD">Collect later (COD)</option>
                <option value="STORE_PICKUP">Pay at pickup</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={markPaid}
              onChange={(e) => setMarkPaid(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mark as paid now (unlocks paid receipt)
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Internal notes</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
              placeholder="Shown on packing invoice footer"
            />
          </label>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Bill to (customer)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ['name', 'Name *'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['city', 'City'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <input
                  value={(customer as any)[key]}
                  onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                  required={key === 'name'}
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Address</span>
            <textarea
              rows={2}
              value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            />
          </label>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">From (your business)</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(
              [
                ['name', 'Business name'],
                ['phone', 'Phone'],
                ['email', 'Email'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-sm">
                <span className="font-medium text-gray-700">{label}</span>
                <input
                  value={(seller as any)[key]}
                  onChange={(e) => setSeller({ ...seller, [key]: e.target.value })}
                  className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                />
              </label>
            ))}
          </div>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Address</span>
            <textarea
              rows={2}
              value={seller.address}
              onChange={(e) => setSeller({ ...seller, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
            />
          </label>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">Line items</h2>
            <button
              type="button"
              onClick={() => setItems([...items, emptyLine()])}
              className="text-sm font-semibold text-primary-700"
            >
              + Add line
            </button>
          </div>
          <div className="space-y-3">
            {items.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <label className="col-span-12 sm:col-span-6 text-sm">
                  <span className="text-gray-600">Description</span>
                  <input
                    value={line.title}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...line, title: e.target.value }
                      setItems(next)
                    }}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                    placeholder="Product or service"
                  />
                </label>
                <label className="col-span-4 sm:col-span-2 text-sm">
                  <span className="text-gray-600">Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...line, qty: e.target.value }
                      setItems(next)
                    }}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                  />
                </label>
                <label className="col-span-5 sm:col-span-3 text-sm">
                  <span className="text-gray-600">Unit price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => {
                      const next = [...items]
                      next[idx] = { ...line, price: e.target.value }
                      setItems(next)
                    }}
                    className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
                  />
                </label>
                <button
                  type="button"
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="col-span-3 sm:col-span-1 min-h-[44px] text-sm text-gray-500 hover:text-red-600 disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <label className="text-sm">
              <span className="text-gray-600">Discount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Shipping</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shipping}
                onChange={(e) => setShipping(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-600">Tax</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                className="mt-1 w-full min-h-[44px] rounded-xl border border-gray-200 px-3"
              />
            </label>
          </div>
          <p className="text-right text-lg font-bold text-gray-900 tabular-nums">
            Total BDT {Math.max(0, total).toLocaleString()}
          </p>
        </section>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center justify-center min-h-[48px] rounded-xl border border-gray-200 px-5 text-sm font-semibold"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 min-h-[48px] rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create & open printable invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
