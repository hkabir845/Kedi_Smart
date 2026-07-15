'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const SPECIES = [
  { value: 'cat', label: 'Cat' },
  { value: 'dog', label: 'Dog' },
  { value: 'bird', label: 'Bird' },
  { value: 'fish', label: 'Fish' },
  { value: 'reptile', label: 'Reptile' },
  { value: 'small_pet', label: 'Small pet' },
  { value: 'livestock', label: 'Livestock' },
  { value: 'exotic', label: 'Exotic' },
  { value: 'other', label: 'Other' },
]

export default function NewPetPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    species: 'cat',
    breed: '',
    gender: 'unknown',
    age_text: '',
    color_markings: '',
    temperament: '',
    special_needs: '',
    instructions_if_found: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/pets/new')
      return
    }
    api.setToken(token)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const pet = await api.post('/pets', {
        name: form.name,
        species: form.species,
        breed: form.breed || undefined,
        gender: form.gender,
        age_text: form.age_text || undefined,
        color_markings: form.color_markings || undefined,
        temperament: form.temperament || undefined,
        special_needs: form.special_needs || undefined,
        instructions_if_found: form.instructions_if_found || undefined,
      })
      router.push(`/dashboard/pets/${pet.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to add pet')
    } finally {
      setSubmitting(false)
    }
  }

  const field =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

  return (
    <div>
      <Link href="/dashboard/pets" className="text-primary-600 hover:text-primary-700 text-sm mb-4 inline-block">
        ← Back to my pets
      </Link>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Add a pet</h2>
      <p className="text-gray-600 mb-6 text-sm max-w-2xl">
        Create a profile for shopping context, medical records, vet bookings, and lost-pet privacy settings.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              required
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species *</label>
            <select
              required
              className={field}
              value={form.species}
              onChange={(e) => setForm({ ...form, species: e.target.value })}
            >
              {SPECIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
            <input
              className={field}
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              className={field}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              className={field}
              placeholder="e.g. 2 years"
              value={form.age_text}
              onChange={(e) => setForm({ ...form, age_text: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color / markings</label>
            <input
              className={field}
              value={form.color_markings}
              onChange={(e) => setForm({ ...form, color_markings: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temperament</label>
          <textarea
            rows={2}
            className={field}
            value={form.temperament}
            onChange={(e) => setForm({ ...form, temperament: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Special needs</label>
          <textarea
            rows={2}
            className={field}
            value={form.special_needs}
            onChange={(e) => setForm({ ...form, special_needs: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions if found</label>
          <textarea
            rows={2}
            className={field}
            placeholder="Who to contact, medications, etc."
            value={form.instructions_if_found}
            onChange={(e) => setForm({ ...form, instructions_if_found: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Saving...' : 'Save pet'}
        </button>
      </form>
    </div>
  )
}
