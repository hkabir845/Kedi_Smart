'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function NewVendorProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    description_md: '',
    brand: '',
    catalog: 'pet_animal' as 'pet_animal' | 'general',
    category_id: '',
    price: '',
    stock_qty: '10',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }
    api.setToken(token)
    loadCategories(form.catalog)
  }, [router, form.catalog])

  const loadCategories = (catalog: string) => {
    api.get(`/shop/categories?catalog=${catalog}`).then(setCategories).catch(() => {})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/shop/products', {
        title: form.title,
        description_md: form.description_md,
        brand: form.brand,
        catalog: form.catalog,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        price: parseFloat(form.price),
        stock_qty: parseInt(form.stock_qty),
      })
      router.push('/dashboard/vendor/products')
    } catch (err: any) {
      setError(err.message || 'Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/vendor/products" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Products
        </Link>
        <h1 className="text-3xl font-bold mb-6">Add Product</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              required
              className="w-full border rounded px-3 py-2"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Catalog *</label>
            <select
              required
              className="w-full border rounded px-3 py-2"
              value={form.catalog}
              onChange={(e) => setForm({
                ...form,
                catalog: e.target.value as 'pet_animal' | 'general',
                category_id: '',
              })}
            >
              <option value="pet_animal">Pet &amp; Animal</option>
              <option value="general">General Products</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={4}
              value={form.description_md}
              onChange={(e) => setForm({ ...form, description_md: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (BDT) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock *</label>
              <input
                required
                type="number"
                min="0"
                className="w-full border rounded px-3 py-2"
                value={form.stock_qty}
                onChange={(e) => setForm({ ...form, stock_qty: e.target.value })}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Products are submitted for admin approval before appearing in the shop.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </main>
  )
}
