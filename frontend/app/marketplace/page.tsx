import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api'
import PetPageHero from '@/components/PetPageHero'
import JsonLd from '@/components/JsonLd'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList, itemListSchema } from '@/lib/schema'

export const metadata = buildPageMetadata({
  title: 'Live Animals Marketplace | KediSmart',
  description:
    'Buy, sell, and adopt pets on KediSmart (Kedi Smart, kedismart, Kedi_Smart, Kedi-Smart) — trusted live animal marketplace listings in Bangladesh.',
  path: '/marketplace',
  keywords: [
    'KediSmart marketplace',
    'live animals',
    'buy pets Bangladesh',
    'sell pets',
    'adopt pets',
    'pet breeders',
  ],
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
  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Live Animals Marketplace', path: '/marketplace' },
  ])
  const listLd = itemListSchema(
    'KediSmart Live Animals Marketplace',
    listings.map((listing: any) => ({
      name: [listing.species, listing.breed].filter(Boolean).join(' · ') || `Listing ${listing.id}`,
      url: `/marketplace/${listing.id}`,
      image: listing.cover_photo_url || listing.photos?.[0]?.url,
      description: plainText(listing.description_md || listing.location_text, 120),
    })),
    {
      description:
        'Buy, sell, and adopt pets on KediSmart — live animal listings across Bangladesh.',
      path: '/marketplace',
    },
  )

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <JsonLd data={[crumbs, listLd]} />
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
                      alt={`${listing.breed || listing.species} on KediSmart marketplace`}
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
