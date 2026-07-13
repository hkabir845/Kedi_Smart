'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function NewListingPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    species: '',
    breed: '',
    type: 'sale',
    age_text: '',
    gender: '',
    location_text: '',
    price: '',
    description_md: '',
    vaccination_status_text: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/listings/new')
      return
    }
    api.setToken(token)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await api.post('/marketplace/listings', {
        species: form.species,
        breed: form.breed || undefined,
        type: form.type,
        age_text: form.age_text || undefined,
        gender: form.gender || undefined,
        location_text: form.location_text,
        price: form.price ? parseFloat(form.price) : undefined,
        currency: 'BDT',
        description_md: form.description_md || undefined,
        vaccination_status_text: form.vaccination_status_text || undefined,
      })
      router.push('/dashboard/listings')
    } catch (err: any) {
      setError(err.message || 'Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <Link href="/dashboard/listings" className="text-primary-600 hover:text-primary-700 text-sm mb-4 inline-block">
        ← Back to listings
      </Link>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create live-animal listing</h2>
      <p className="text-gray-600 mb-6">
        Listings are reviewed by our team before they appear on the marketplace.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Species *</label>
            <input
              required
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="Cat, Dog, Bird..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Breed</label>
            <input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Listing type *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="sale">For sale</option>
              <option value="adoption">Adoption</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (BDT)</label>
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input
              value={form.age_text}
              onChange={(e) => setForm({ ...form, age_text: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              placeholder="8 weeks"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location *</label>
          <input
            required
            value={form.location_text}
            onChange={(e) => setForm({ ...form, location_text: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Dhaka, Bangladesh"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vaccination status</label>
          <input
            value={form.vaccination_status_text}
            onChange={(e) => setForm({ ...form, vaccination_status_text: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Up to date / first dose given"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            rows={4}
            value={form.description_md}
            onChange={(e) => setForm({ ...form, description_md: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
        >
          {submitting ? 'Submitting...' : 'Submit listing for review'}
        </button>
      </form>
    </div>
  )
}
