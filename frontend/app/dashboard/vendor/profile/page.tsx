'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
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

  const handleLogoUpload = async (file: File | null) => {
    if (!file) return
    setError('')
    setSuccess('')
    setUploadingLogo(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const data = await api.upload('/vendor/profile/logo', body)
      setProfile(data.profile || { ...profile, logo_url: data.logo_url })
      setSuccess('Shop logo updated.')
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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

      {profile && (
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Shop logo</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(profile.logo_url)}
                  alt="Shop logo"
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <span className="text-sm text-gray-400 text-center px-2">No logo</span>
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {uploadingLogo ? 'Uploading...' : profile.logo_url ? 'Replace logo' : 'Upload logo'}
              </button>
              <p className="mt-2 text-xs text-gray-500">PNG, JPG, or WebP. Shown on your Seller Centre.</p>
            </div>
          </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal shop code</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">vendor/</span>
            <input
              value={form.shop_slug}
              onChange={(e) => setForm({ ...form, shop_slug: slugify(e.target.value) })}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            For Kedi Smart ops only — customers shop the main store and see Kedi Smart, not a
            separate vendor storefront.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About your shop</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="Internal notes for platform review (not shown to shoppers as a vendor store)."
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
