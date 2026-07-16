'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { PanelNotice } from '@/components/control-centre/PanelPrimitives'

type SellerAccountPanelProps = {
  basePath: string
  fallbackPath: string
}

export function SellerAccountPanel({ basePath, fallbackPath }: SellerAccountPanelProps) {
  const router = useRouter()
  const [account, setAccount] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [mobileWallet, setMobileWallet] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push(`/login?next=${basePath}/account`)
      return
    }
    api.setToken(token)
    api
      .get('/seller/account')
      .then((data) => {
        setAccount(data)
        setDisplayName(data.display_name || '')
        setPayoutMethod(data.payout_method || 'bank_transfer')
        const details = data.payout_details || {}
        setBankName(details.bank_name || '')
        setAccountNumber(details.account_number || '')
        setAccountName(details.account_name || '')
        setMobileWallet(details.mobile_wallet || '')
      })
      .catch(() => router.push(fallbackPath))
      .finally(() => setLoading(false))
  }, [router, basePath, fallbackPath])

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const data = await api.patch('/seller/account', {
        display_name: displayName,
        payout_method: payoutMethod,
        payout_details: {
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
          mobile_wallet: mobileWallet,
        },
      })
      setAccount(data)
      setMessage('Payout details saved.')
    } catch (err: any) {
      setMessage(err.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-500">Loading seller account...</div>
  if (!account) return null

  const plan = account.commission_plan

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href={`${basePath}/earnings`} className="text-sm font-semibold text-primary-700">
          ← Earnings
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 mt-2">Seller account</h2>
        <p className="text-sm text-gray-600 mt-1">
          Commission plan and payout details — same pattern as Amazon Seller Central.
        </p>
      </div>

      {plan && (
        <PanelNotice tone="info">
          Plan: {plan.name} ({plan.commission_percent}% commission)
          {account.is_approved ? ' · Approved' : ' · Pending approval'}
        </PanelNotice>
      )}

      {message && (
        <PanelNotice tone={message.includes('saved') ? 'success' : 'warning'}>{message}</PanelNotice>
      )}

      <form onSubmit={onSave} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Display name</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Payout method</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={payoutMethod}
            onChange={(e) => setPayoutMethod(e.target.value)}
          >
            <option value="bank_transfer">Bank transfer</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Bank name</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Account name</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Account number</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Mobile wallet</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
            value={mobileWallet}
            onChange={(e) => setMobileWallet(e.target.value)}
            placeholder="01XXXXXXXXX"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save payout details'}
        </button>
      </form>
    </div>
  )
}
