'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { EmptyState, StatusPill } from '@/components/control-centre/PanelPrimitives'

const field =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500'

export default function ListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    api
      .get('/marketplace/listings?mine=true&limit=100')
      .then((response) => setListings(response.items || []))

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login?next=/dashboard/listings')
      return
    }

    api.setToken(token)
    load()
      .catch(() => router.push('/dashboard/seller'))
      .finally(() => setLoading(false))
  }, [router])

  const closeListing = async (id: number) => {
    if (!window.confirm('Close this listing? It will no longer appear on the marketplace.')) return
    setSaving(true)
    setError('')
    try {
      await api.delete(`/marketplace/listings/${id}`)
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not close listing')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/marketplace/listings/${editing.id}`, {
        species: editing.species,
        breed: editing.breed,
        age_text: editing.age_text,
        gender: editing.gender,
        location_text: editing.location_text,
        price: editing.price,
        currency: editing.currency || 'BDT',
        type: editing.type,
        vaccination_status_text: editing.vaccination_status_text,
        description_md: editing.description_md,
      })
      setEditing(null)
      await load()
    } catch (err: any) {
      setError(err.message || 'Could not update listing')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-500">Loading listings...</div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">My listings</h2>
          <p className="text-sm text-gray-600">Edit details, close offers, and track moderation.</p>
        </div>
        <Link
          href="/dashboard/listings/new"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
        >
          + Create listing
        </Link>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {editing && (
        <form onSubmit={saveEdit} className="mb-6 bg-white rounded-xl border border-gray-100 p-5 grid sm:grid-cols-2 gap-4">
          <h3 className="sm:col-span-2 text-lg font-semibold text-gray-900">Edit listing #{editing.id}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Species</label>
            <input
              className={field}
              required
              value={editing.species || ''}
              onChange={(e) => setEditing({ ...editing, species: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
            <input
              className={field}
              value={editing.breed || ''}
              onChange={(e) => setEditing({ ...editing, breed: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
            <input
              type="number"
              className={field}
              value={editing.price ?? ''}
              onChange={(e) => setEditing({ ...editing, price: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              className={field}
              required
              value={editing.location_text || ''}
              onChange={(e) => setEditing({ ...editing, location_text: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className={field}
              rows={3}
              value={editing.description_md || ''}
              onChange={(e) => setEditing({ ...editing, description_md: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
          <p className="sm:col-span-2 text-xs text-gray-500">
            Saving a live listing sends it back to moderation for review.
          </p>
        </form>
      )}

      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          description="Create a sale, adoption, or shelter listing. Our team reviews each one before it goes live."
          actionHref="/dashboard/listings/new"
          actionLabel="Create your first listing"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {listing.species}
                    {listing.breed ? ` · ${listing.breed}` : ''}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize mt-1">
                    {listing.type} · {listing.location_text}
                  </p>
                </div>
                <StatusPill
                  tone={
                    listing.status === 'published'
                      ? 'success'
                      : listing.status === 'pending'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {listing.status}
                </StatusPill>
              </div>
              {listing.price != null && (
                <p className="text-base font-semibold text-primary-600 mb-4">
                  {listing.currency} {listing.price}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-3 text-sm font-semibold">
                {listing.status !== 'closed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing({ ...listing })}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => closeListing(listing.id)}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Close
                    </button>
                  </>
                )}
                <Link
                  href={`/marketplace/${listing.id}`}
                  className="text-gray-600 hover:text-gray-900"
                >
                  View →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
