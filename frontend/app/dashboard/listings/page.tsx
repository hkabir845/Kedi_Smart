'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ListingsPage() {
  const router = useRouter()
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    api.setToken(token)
    // Note: This would require a user listings endpoint
    // For now, use the general listings endpoint
    api.get('/marketplace/listings?mine=true&limit=100')
      .then((response) => {
        setListings(response.items || [])
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">My Listings</h1>
          <Link
            href="/dashboard/listings/new"
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            + Create Listing
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any listings yet.</p>
            <Link
              href="/dashboard/listings/new"
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              Create your first listing →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-2">{listing.species}</h2>
                {listing.breed && <p className="text-gray-600 mb-2">Breed: {listing.breed}</p>}
                <p className="text-gray-600 mb-2">{listing.location_text}</p>
                {listing.price && (
                  <p className="text-lg font-semibold text-primary-600 mb-2">
                    {listing.currency} {listing.price}
                  </p>
                )}
                <p className={`inline-block px-2 py-1 rounded text-xs mb-4 ${
                  listing.status === 'published' ? 'bg-green-100 text-green-800' :
                  listing.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {listing.status}
                </p>
                <Link
                  href={`/marketplace/${listing.id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                >
                  View Listing →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
