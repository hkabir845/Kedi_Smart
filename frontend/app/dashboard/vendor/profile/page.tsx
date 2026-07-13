'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function VendorProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState({
    shop_name: '',
    shop_slug: '',
    description: '',
    payout_method: 'bank_transfer',
    bank_name: '',
    account_name: '',
    account_number: '',
    docs_note: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vendor/profile')
      return
    }
    api.setToken(token)
    api
      .get('/vendor/profile')
      .then((data) => {
        setProfile(data)
        setForm({
          shop_name: data.shop_name || '',
          shop_slug: data.shop_slug || '',
          description: data.description || '',
          payout_method: data.payout_method || 'bank_transfer',
          bank_name: data.payout_details?.bank_name || '',
          account_name: data.payout_details?.account_name || '',
          account_number: data.payout_details?.account_number || '',
          docs_note: '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const handleShopNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      shop_name: name,
      shop_slug: profile?.shop_slug || slugify(name),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const payload = {
      shop_name: form.shop_name,
      shop_slug: form.shop_slug || slugify(form.shop_name),
      description: form.description,
      payout_method: form.payout_method,
      payout_details: {
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
      },
      docs_urls: form.docs_note ? [form.docs_note] : [],
    }

    try {
      const method = profile ? 'put' : 'post'
      const data = await api[method]('/vendor/profile', payload)
      setProfile(data)
      setSuccess(
        data.is_approved
          ? 'Shop profile saved. Your shop is approved and active.'
          : 'Shop profile submitted. Waiting for platform admin approval before you can sell.'
      )
    } catch (err: any) {
      setError(err.message || 'Failed to save shop profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading shop profile...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Shop profile</h2>
      <p className="text-gray-600 mb-6">
        Set up your multivendor shop on KediSmart. Admin reviews new shops before products appear in the
        marketplace.
      </p>

      {profile && !profile.is_approved && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Pending approval.</strong> You can prepare products, but they won&apos;t go live until a
          platform admin approves your shop.
        </div>
      )}

      {profile?.is_approved && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <strong>Shop approved.</strong> You can add products and receive orders.{' '}
          <Link href="/dashboard/vendor/products/new" className="underline font-medium">
            Add your first product
          </Link>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop name *</label>
          <input
            required
            value={form.shop_name}
            onChange={(e) => handleShopNameChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Paws & Supplies BD"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop URL slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/shop/vendor/</span>
            <input
              value={form.shop_slug}
              onChange={(e) => setForm({ ...form, shop_slug: slugify(e.target.value) })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About your shop</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Tell customers what you sell and why they should trust your shop."
          />
        </div>

        <div className="border-t pt-5">
          <h3 className="font-semibold text-gray-900 mb-3">Payout details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank name</label>
              <input
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account holder</label>
              <input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account number</label>
              <input
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Verification note / document link (optional)
          </label>
          <input
            value={form.docs_note}
            onChange={(e) => setForm({ ...form, docs_note: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Trade license URL or reference for admin review"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : profile ? 'Update shop profile' : 'Submit shop for review'}
        </button>
      </form>
    </div>
  )
}
