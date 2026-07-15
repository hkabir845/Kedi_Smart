import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Live Animals Marketplace',
  description: 'Buy, sell, and adopt pets on KediSmart — trusted live animal listings in Bangladesh.',
  path: '/marketplace',
})

async function getListings() {
  try {
    const response = await api.get('/marketplace/listings?limit=20')
    return response.items || []
  } catch {
    return []
  }
}

export default async function MarketplacePage() {
  const listings = await getListings()

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <PetPageHero
          title="Live Animals"
          description="Browse listings from trusted breeders, shelters, and sellers across Bangladesh."
        >
          <Link
            href="/register?role=BREEDER"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            List your animals →
          </Link>
        </PetPageHero>

        {listings.length === 0 ? (
          <div className={`${petCardClass} p-12 text-center`}>
            <p className="text-4xl mb-4">🐾</p>
            <p className="text-gray-600">No listings available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((listing: any) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className={`${petCardClass} overflow-hidden block group`}
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  {listing.cover_photo_url ? (
                    <Image
                      src={listing.cover_photo_url}
                      alt={`${listing.breed || listing.species} listing`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">🐾</div>
                  )}
                  <span className="absolute top-3 left-3 text-xs font-semibold uppercase tracking-wide text-primary-800 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full">
                    {listing.type}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors capitalize">
                    {listing.species}
                    {listing.breed ? ` · ${listing.breed}` : ''}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">{listing.location_text}</p>
                  {listing.price ? (
                    <p className="text-xl font-bold text-primary-600">
                      {listing.currency} {listing.price}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-green-700">Free / adoption</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
