'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

type Expense = {
  id: number
  number: string
  kind: string
  category: string
  title: string
  counterparty?: string
  amount: number
  currency: string
  status: string
  issued_at?: string
}

const KINDS = [
  { value: 'expense', label: 'Expense' },
  { value: 'bill', label: 'Bill' },
  { value: 'income', label: 'Other income' },
]

const CATEGORIES = [
  'rent',
  'utilities',
  'supplies',
  'shipping',
  'marketing',
  'payroll',
  'tax',
  'cogs',
  'software',
  'other',
]

export default function AdminExpensesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    kind: 'expense',
    category: 'other',
    title: '',
    counterparty: '',
    amount: '',
    notes: '',
  })

  const load = () => api.get('/admin/expenses').then(setRows)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/admin/expenses')
      return
    }
    api.setToken(token)
    load()
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false))
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/admin/expenses', {
        ...form,
        amount: Number(form.amount),
      })
      setForm({ kind: 'expense', category: 'other', title: '', counterparty: '', amount: '', notes: '' })
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not save')
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="min-h-screen p-6 sm:p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/admin/finance" className="text-sm font-semibold text-primary-700">
            ← Finance
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Platform expenses & bills</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter operating costs and other income for the company P&L.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New entry</h2>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm block">
              Kind
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 px-3"
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 px-3"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block sm:col-span-2">
              Title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm block">
              Counterparty
              <input
                value={form.counterparty}
                onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 px-3"
              />
            </label>
            <label className="text-sm block">
              Amount (BDT)
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-xl border border-gray-200 px-3"
              />
            </label>
          </div>
          <button
            type="submit"
            className="min-h-[44px] rounded-xl bg-primary-600 text-white px-5 text-sm font-bold"
          >
            Save entry
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3 capitalize">
                    {r.kind} · {r.category}
                  </td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {r.currency} {Number(r.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No expenses yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
