'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { resolveMediaUrl } from '@/lib/media'

type Catalog = 'pet_animal' | 'general'

const STEPS = [
  { id: 1, title: 'Basics', hint: 'What are you selling?' },
  { id: 2, title: 'Category', hint: 'Help shoppers find it' },
  { id: 3, title: 'Price & stock', hint: 'Set offer & inventory' },
  { id: 4, title: 'Review', hint: 'Submit for approval' },
] as const

const ACCEPT_IMAGES = 'image/jpeg,image/png,image/webp,image/gif'

export default function NewVendorProductPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description_md: '',
    brand: '',
    catalog: 'pet_animal' as Catalog,
    category_id: '',
    price: '',
    compare_at_price: '',
    stock_qty: '10',
    sku: '',
    image_url: '',
    product_kind: 'physical' as 'physical' | 'service' | 'digital',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/vendor/products/new')
      return
    }
    api.setToken(token)
    api.get('/vendor/profile').then(setProfile).catch(() => setProfile(null))
  }, [router])

  useEffect(() => {
    api
      .get(`/shop/categories?catalog=${form.catalog}`)
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [form.catalog])

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c.id) === String(form.category_id)),
    [categories, form.category_id]
  )

  const previewSrc = form.image_url.trim() ? resolveMediaUrl(form.image_url.trim()) : ''

  const canNext = () => {
    if (step === 1) return form.title.trim().length >= 3
    if (step === 2) return Boolean(form.catalog)
    if (step === 3) {
      if (Number(form.price) <= 0) return false
      if (form.product_kind === 'physical') return Number(form.stock_qty) >= 0
      return true
    }
    return true
  }

  const uploadImageFile = async (file: File | null | undefined) => {
    if (!file) return
    if (!profile) {
      setError('Create your shop profile before uploading images.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, WebP).')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const data = await api.upload('/vendor/products/image', body)
      const url = data.image_url || data.url
      if (!url) throw new Error('Upload did not return an image URL')
      setForm((prev) => ({ ...prev, image_url: url }))
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void uploadImageFile(e.dataTransfer.files?.[0])
  }

  const handleSubmit = async () => {
    if (!profile) {
      setError('Create your shop profile before adding products.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api.post('/shop/products', {
        title: form.title.trim(),
        description_md: form.description_md.trim() || undefined,
        brand: form.brand.trim() || undefined,
        catalog: form.catalog,
        category_id: form.category_id ? parseInt(form.category_id, 10) : null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price
          ? parseFloat(form.compare_at_price)
          : undefined,
        stock_qty: form.product_kind === 'physical' ? parseInt(form.stock_qty, 10) || 0 : 0,
        sku: form.sku.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
        product_kind: form.product_kind,
      })
      router.push('/dashboard/vendor/products')
    } catch (err: any) {
      setError(err.message || 'Failed to create product')
      setStep(4)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div>
        <Link
          href="/dashboard/vendor/products"
          className="text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          ← Back to catalogue
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3">Add a product</h1>
        <p className="text-sm text-gray-500 mt-1">
          Guided listing inspired by Amazon Seller Central, Shopify, and Walmart Marketplace —
          clear steps, fewer mistakes.
        </p>
      </div>

      {/* Progress */}
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const active = step === s.id
          const done = step > s.id
          return (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2.5 ${
                active
                  ? 'border-primary-300 bg-primary-50'
                  : done
                    ? 'border-green-200 bg-green-50/70'
                    : 'border-gray-100 bg-white'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Step {s.id}
              </p>
              <p className="text-sm font-semibold text-gray-900">{s.title}</p>
              <p className="text-xs text-gray-500 hidden sm:block">{s.hint}</p>
            </li>
          )
        })}
      </ol>

      {!profile && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          You need a shop profile first.{' '}
          <Link href="/dashboard/vendor/profile" className="font-semibold underline">
            Set up shop
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-7 space-y-5">
        {step === 1 && (
          <>
            <SectionTip title="Tip from top marketplaces">
              Use a clear title shoppers would search for — e.g. “Premium Dry Dog Food 3kg – Chicken”
              rather than only “Dog food”.
            </SectionTip>
            <Field label="Product title *" htmlFor="title">
              <input
                id="title"
                required
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                placeholder="e.g. Stainless steel pet bowl — large"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Brand" htmlFor="brand">
              <input
                id="brand"
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                placeholder="Your brand or manufacturer"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </Field>
            <Field label="Description" htmlFor="desc">
              <textarea
                id="desc"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                rows={5}
                placeholder="Key benefits, size, materials, who it's for…"
                value={form.description_md}
                onChange={(e) => setForm({ ...form, description_md: e.target.value })}
              />
            </Field>
            <div>
              <p className="block text-sm font-medium text-gray-800 mb-1.5">
                Main product image <span className="font-normal text-gray-400">(optional)</span>
              </p>
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                }}
                onDrop={onDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed px-4 py-8 text-center cursor-pointer transition ${
                  dragOver
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/40'
                } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_IMAGES}
                  className="hidden"
                  onChange={(e) => void uploadImageFile(e.target.files?.[0])}
                />
                {previewSrc ? (
                  <div className="mx-auto max-w-[220px] space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt="Product preview"
                      className="mx-auto w-full aspect-square rounded-xl object-cover border border-gray-200 bg-white shadow-sm"
                    />
                    <p className="text-sm font-semibold text-gray-800">
                      {uploading ? 'Uploading…' : 'Drop a new image to replace'}
                    </p>
                    <p className="text-xs text-gray-500">or click to browse · JPG / PNG / WebP · max 8 MB</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 text-xl">
                      +
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {uploading ? 'Uploading…' : 'Drag & drop product photo here'}
                    </p>
                    <p className="text-xs text-gray-500">
                      or click to browse · JPG / PNG / WebP · max 8 MB
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0">
                  or paste URL
                </span>
                <input
                  id="image"
                  type="url"
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  placeholder="https://… or /uploads/…"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
                {form.image_url && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: '' })}
                    className="shrink-0 text-sm font-semibold text-gray-500 hover:text-red-600 px-2 py-2"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTip title="Categorization">
              Pick the catalogue shoppers browse (Pet &amp; Animal or General), then the closest
              category — like Walmart&apos;s item setup.
            </SectionTip>
            <Field label="Catalogue *" htmlFor="catalog">
              <div className="grid sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      id: 'pet_animal' as Catalog,
                      title: 'Pet & Animal',
                      desc: 'Food, toys, care, accessories',
                    },
                    {
                      id: 'general' as Catalog,
                      title: 'General Products',
                      desc: 'Electronics, fashion, home & more',
                    },
                  ] as const
                ).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, catalog: c.id, category_id: '' })
                    }
                    className={`text-left rounded-xl border px-4 py-3 transition ${
                      form.catalog === c.id
                        ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-primary-200'
                    }`}
                  >
                    <span className="block font-semibold text-gray-900">{c.title}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{c.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Category" htmlFor="category">
              <select
                id="category"
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 bg-white"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Select category (recommended)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTip title="Pricing & inventory">
              Physical goods track on-hand qty (Shopify-style). Services and digital listings skip
              stock — shoppers can still buy; you fulfill online or in clinic.
            </SectionTip>
            <div className="grid sm:grid-cols-2 gap-3 mb-2">
              {(
                [
                  { id: 'physical' as const, title: 'Physical product', desc: 'Tracks stock units' },
                  { id: 'service' as const, title: 'Service', desc: 'Grooming, consult add-on…' },
                  { id: 'digital' as const, title: 'Digital', desc: 'Guides, downloads' },
                ] as const
              ).map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setForm({ ...form, product_kind: k.id })}
                  className={`text-left rounded-xl border px-4 py-3 transition ${
                    form.product_kind === k.id
                      ? 'border-primary-400 bg-primary-50 ring-2 ring-primary-200'
                      : 'border-gray-200 hover:border-primary-200'
                  }`}
                >
                  <span className="block font-semibold text-gray-900">{k.title}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{k.desc}</span>
                </button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Price (BDT) *" htmlFor="price">
                <input
                  id="price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </Field>
              <Field label="Compare-at price" htmlFor="compare">
                <input
                  id="compare"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  placeholder="Optional MRP"
                  value={form.compare_at_price}
                  onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                />
              </Field>
              {form.product_kind === 'physical' ? (
                <Field label="Stock quantity *" htmlFor="stock">
                  <input
                    id="stock"
                    required
                    type="number"
                    min="0"
                    className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                    value={form.stock_qty}
                    onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
                  />
                </Field>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:col-span-1">
                  No stock units — this {form.product_kind} won’t decrement inventory at checkout.
                </div>
              )}
              <Field label="SKU" htmlFor="sku">
                <input
                  id="sku"
                  className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
                  placeholder="Auto if empty"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <SectionTip title="Before you submit">
              KediSmart reviews vendor listings (moderation). Accurate details speed up approval —
              same idea as marketplace item checks worldwide.
            </SectionTip>
            {previewSrc && (
              <div className="flex justify-center sm:justify-start">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt=""
                  className="h-28 w-28 rounded-xl object-cover border border-gray-200"
                />
              </div>
            )}
            <dl className="rounded-xl bg-gray-50 border border-gray-100 divide-y divide-gray-100 text-sm">
              <Row label="Title" value={form.title} />
              <Row label="Brand" value={form.brand || '—'} />
              <Row
                label="Catalogue"
                value={form.catalog === 'general' ? 'General Products' : 'Pet & Animal'}
              />
              <Row label="Category" value={selectedCategory?.name || '—'} />
              <Row label="Price" value={`BDT ${form.price || '0'}`} />
              <Row
                label="Compare at"
                value={form.compare_at_price ? `BDT ${form.compare_at_price}` : '—'}
              />
              <Row label="Type" value={form.product_kind} />
              <Row
                label="Stock"
                value={
                  form.product_kind === 'physical' ? form.stock_qty : 'Not tracked (service/digital)'
                }
              />
              <Row label="SKU" value={form.sku || 'Auto-generated'} />
              <Row label="Image" value={form.image_url ? 'Attached' : 'None'} />
              <Row
                label="Description"
                value={form.description_md ? form.description_md.slice(0, 120) + (form.description_md.length > 120 ? '…' : '') : '—'}
              />
            </dl>
            {profile && !profile.is_approved && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Your shop is still pending approval. This product will wait in review until the shop
                is live.
              </p>
            )}
          </>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 border-t border-gray-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="min-h-[48px] rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          ) : (
            <Link
              href="/dashboard/vendor/products"
              className="inline-flex items-center justify-center min-h-[48px] rounded-xl border border-gray-200 px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <button
              type="button"
              disabled={!canNext() || uploading}
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              className="min-h-[48px] rounded-xl bg-primary-600 px-6 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || uploading || !profile || !canNext()}
              onClick={handleSubmit}
              className="min-h-[48px] rounded-xl bg-primary-600 px-6 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-800 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function SectionTip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50/60 px-4 py-3 text-sm text-primary-950">
      <p className="font-semibold mb-0.5">{title}</p>
      <p className="text-primary-900/80 text-xs sm:text-sm leading-relaxed">{children}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium min-w-0 break-words">{value}</dd>
    </div>
  )
}
