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
  amount: number
  currency: string
  status: string
  issued_at?: string
}

type MonthRow = {
  year: number
  month: number
  label: string
  gross_sales: number
  platform_fees_total: number
  operating_expenses: number
  other_income: number
  estimated_net: number
}

type Summary = {
  gross_sales: number
  platform_fees_total: number
  other_income: number
  operating_expenses: number
  available_balance: number
  estimated_net: number
  year?: number | null
  month?: number | null
  months?: MonthRow[]
}

async function downloadExpensePdf(id: number, number: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const res = await fetch(`/api/v1/seller/expenses/${id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${number || id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SellerExpensesPage() {
  const router = useRouter()
  const now = new Date()
  const [rows, setRows] = useState<Expense[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [period, setPeriod] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })
  const [form, setForm] = useState({
    kind: 'expense',
    category: 'other',
    title: '',
    counterparty: '',
    amount: '',
  })

  const load = async (y = period.year, m = period.month) => {
    const [expenses, finance] = await Promise.all([
      api.get('/seller/expenses'),
      api.get(`/seller/finance-summary?year=${y}&month=${m}`),
    ])
    setRows(expenses)
    setSummary(finance)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/expenses')
      return
    }
    api.setToken(token)
    load()
      .catch((err) => setError(err.message || 'Could not load'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/seller/expenses', { ...form, amount: Number(form.amount) })
      setForm({ kind: 'expense', category: 'other', title: '', counterparty: '', amount: '' })
      await load()
    } catch (err: any) {
      setError(err.message || 'Save failed')
    }
  }

  const markPaid = async (id: number) => {
    setBusyId(id)
    setError('')
    try {
      await api.post(`/seller/expenses/${id}/mark-paid`, {})
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not mark paid')
    } finally {
      setBusyId(null)
    }
  }

  const changePeriod = async (year: number, month: number) => {
    setPeriod({ year, month })
    setError('')
    try {
      await load(year, month)
    } catch (err: any) {
      setError(err.message || 'Could not load period')
    }
  }

  if (loading) return <div className="text-gray-500">Loading books…</div>

  const months = Array.isArray(summary?.months) ? summary!.months! : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Books & expenses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Light books: sales vs fees, your expenses, other income, and monthly P&amp;L.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">
          Month
          <select
            className="ml-2 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
            value={period.month}
            onChange={(e) => changePeriod(period.year, Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-600">
          Year
          <select
            className="ml-2 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
            value={period.year}
            onChange={(e) => changePeriod(Number(e.target.value), period.month)}
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <Link href="/dashboard/invoices" className="text-sm font-semibold text-primary-700 hover:underline">
          Invoices →
        </Link>
      </div>

      {summary && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            ['Gross sales (month)', summary.gross_sales],
            ['Platform fees (month)', summary.platform_fees_total],
            ['Your expenses (month)', summary.operating_expenses],
            ['Other income (month)', summary.other_income],
            ['Available to withdraw', summary.available_balance],
            ['Est. net (month)', summary.estimated_net],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
              <p className="text-xl font-bold tabular-nums mt-1">
                BDT {Number(value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {months.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Simple P&amp;L (last 6 months)</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Fees</th>
                <th className="px-4 py-3 text-right">Expenses</th>
                <th className="px-4 py-3 text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {months.map((row) => (
                <tr
                  key={row.label}
                  className={
                    row.year === period.year && row.month === period.month ? 'bg-primary-50/50' : ''
                  }
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="font-medium text-primary-700 hover:underline"
                      onClick={() => changePeriod(row.year, row.month)}
                    >
                      {row.label}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(row.gross_sales).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-600">
                    {Number(row.platform_fees_total).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(row.operating_expenses).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {Number(row.estimated_net).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold">Add expense / bill / income</h2>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value })}
            className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          >
            <option value="expense">Expense</option>
            <option value="bill">Bill</option>
            <option value="income">Other income</option>
          </select>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          >
            {['supplies', 'shipping', 'rent', 'utilities', 'marketing', 'other'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="sm:col-span-2 min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          />
          <input
            placeholder="Paid to / received from"
            value={form.counterparty}
            onChange={(e) => setForm({ ...form, counterparty: e.target.value })}
            className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          />
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="min-h-[40px] rounded-xl border border-gray-200 px-3 text-sm"
          />
        </div>
        <button type="submit" className="min-h-[44px] rounded-xl bg-primary-600 text-white px-5 text-sm font-bold">
          Save
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs">{r.number}</td>
                <td className="px-4 py-3">{r.title}</td>
                <td className="px-4 py-3 capitalize">
                  {r.kind} · {r.status}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                  {r.currency} {Number(r.amount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    className="text-primary-700 font-semibold hover:underline"
                    onClick={() =>
                      downloadExpensePdf(r.id, r.number).catch((err) =>
                        setError(err.message || 'Download failed'),
                      )
                    }
                  >
                    Voucher
                  </button>
                  {r.status !== 'paid' && (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      className="text-emerald-700 font-semibold hover:underline disabled:opacity-50"
                      onClick={() => markPaid(r.id)}
                    >
                      {busyId === r.id ? '…' : 'Mark paid'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No book entries yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
