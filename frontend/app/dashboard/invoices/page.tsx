'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { downloadOrderPdf } from '@/lib/download-order-pdf'

type InvoiceRow = {
  id: number
  public_order_number?: string
  channel?: string
  status?: string
  total?: number
  currency?: string
  invoice_number?: string
  invoice_status?: string
  issued_at?: string
  editable?: boolean
  customer_name?: string
}

export default function SellerInvoicesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/invoices')
      return
    }
    api.setToken(token)
    api
      .get('/seller/invoices')
      .then(setRows)
      .catch((err) => setError(err.message || 'Could not load invoices'))
      .finally(() => setLoading(false))
  }, [router])

  const handleDownload = async (row: InvoiceRow) => {
    setBusyId(row.id)
    setError('')
    try {
      await downloadOrderPdf(
        row.id,
        'invoice',
        row.invoice_number || row.public_order_number || String(row.id),
      )
    } catch {
      setError('Could not download PDF')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading invoices…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Preview, print, or download invoices shared with the platform owner. Manual walk-in sales
            and online packing invoices use one number series —{' '}
            <span className="font-mono text-xs">KS-INV-YYYY-#####</span>.
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="inline-flex items-center justify-center min-h-[44px] rounded-xl bg-primary-600 px-5 text-sm font-bold text-white hover:bg-primary-700"
        >
          + New invoice
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-gray-800 font-semibold">No invoices yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Create your first offline invoice for a clinic visit, walk-in purchase, or adoption fee.
          </p>
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex mt-4 min-h-[44px] items-center rounded-xl bg-primary-600 px-5 text-sm font-bold text-white"
          >
            Create invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-[48rem] w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {row.invoice_number || row.public_order_number || `#${row.id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 tabular-nums">
                    {row.issued_at
                      ? new Date(row.issued_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                      {row.channel === 'manual' ? 'Manual' : 'Online'}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-700">
                    {(row.invoice_status || row.status || '').replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {row.currency || 'BDT'} {Number(row.total || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm font-semibold">
                      <Link
                        href={`/dashboard/invoices/${row.id}?preview=1`}
                        className="text-primary-700 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/dashboard/invoices/${row.id}?preview=1&print=1`}
                        className="text-slate-700 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Print
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => handleDownload(row)}
                        className="text-slate-700 hover:underline disabled:opacity-50"
                      >
                        {busyId === row.id ? '…' : 'Download'}
                      </button>
                      <Link
                        href={`/dashboard/invoices/${row.id}`}
                        className="text-gray-500 hover:underline"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
