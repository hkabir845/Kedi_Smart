import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { absoluteUrl, buildPageMetadata, plainText } from '@/lib/seo'
import { breadcrumbList } from '@/lib/schema'
import JsonLd from '@/components/JsonLd'

export async function generateMetadata({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  try {
    const listing = await api.get(`/marketplace/listings/${listingId}`)
    const species = listing.species || ''
    const breed = listing.breed || ''
    const type = listing.type || ''
    const location = listing.location || listing.city || listing.district || ''
    const title =
      [species, breed || type].filter(Boolean).join(' — ') || 'Pet listing on KediSmart'
    const descBase = plainText(listing.description_md || '')
    const description =
      descBase ||
      [
        species && breed ? `${breed} ${species}` : species || 'Pet',
        'for sale on KediSmart marketplace',
        location ? `in ${location}` : 'in Bangladesh',
      ]
        .filter(Boolean)
        .join(' ')

    return buildPageMetadata({
      title,
      description,
      path: `/marketplace/${listingId}`,
      image: listing.photos?.[0]?.url || listing.image_url,
      keywords: [
        species,
        breed,
        type,
        location,
        species && 'for sale',
        species && `${species} marketplace`,
        'KediSmart listing',
        'live animal listing',
      ].filter(Boolean) as string[],
    })
  } catch {
    return buildPageMetadata({
      title: 'Pet Listing on KediSmart',
      path: `/marketplace/${listingId}`,
      keywords: ['KediSmart listing', 'live animal listing'],
    })
  }
}

async function getListing(listingId: string) {
  try {
    return await api.get(`/marketplace/listings/${listingId}`)
  } catch {
    return null
  }
}

export default async function ListingPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const listing = await getListing(listingId)

  if (!listing) {
    notFound()
  }

  const title = [listing.species, listing.breed].filter(Boolean).join(' - ') || 'Pet listing'
  const offerLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: plainText(listing.description_md || title, 200),
    url: absoluteUrl(`/marketplace/${listingId}`),
    category: listing.type || 'Pet',
    brand: {
      '@type': 'Brand',
      name: 'KediSmart',
      alternateName: ['Kedi Smart', 'kedismart', 'Kedi_Smart', 'Kedi-Smart'],
    },
  }
  if (listing.photos?.[0]?.url) offerLd.image = [listing.photos[0].url]
  if (listing.price != null) {
    offerLd.offers = {
      '@type': 'Offer',
      priceCurrency: listing.currency || 'BDT',
      price: String(listing.price),
      availability: 'https://schema.org/InStock',
      url: absoluteUrl(`/marketplace/${listingId}`),
    }
  }

  const crumbs = breadcrumbList([
    { name: 'Home', path: '/' },
    { name: 'Marketplace', path: '/marketplace' },
    { name: title, path: `/marketplace/${listingId}` },
  ])

  return (
    <main className="min-h-screen p-8">
      <JsonLd data={[offerLd, crumbs]} />
      <div className="max-w-6xl mx-auto">
        <Link href="/marketplace" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Marketplace
        </Link>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              {listing.photos && listing.photos.length > 0 && (
                <img
                  src={listing.photos[0].url}
                  alt={listing.species}
                  className="w-full h-96 object-cover rounded-lg mb-4"
                />
              )}
            </div>

            <div>
              <h1 className="text-4xl font-bold mb-4">
                {listing.species} {listing.breed && `- ${listing.breed}`}
              </h1>
              
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                  listing.type === 'ADOPTION' ? 'bg-green-100 text-green-800' :
                  listing.type === 'GIVEAWAY' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {listing.type}
                </span>
              </div>

              {listing.price && (
                <p className="text-3xl font-bold text-primary-600 mb-4">
                  {listing.currency} {listing.price}
                </p>
              )}

              <div className="space-y-2 mb-6">
                {listing.age_text && (
                  <p className="text-gray-600"><strong>Age:</strong> {listing.age_text}</p>
                )}
                {listing.gender && (
                  <p className="text-gray-600"><strong>Gender:</strong> {listing.gender}</p>
                )}
                <p className="text-gray-600"><strong>Location:</strong> {listing.location_text}</p>
                {listing.vaccination_status_text && (
                  <p className="text-gray-600"><strong>Vaccination:</strong> {listing.vaccination_status_text}</p>
                )}
              </div>

              {listing.description_md && (
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description_md}</p>
                </div>
              )}

              <button className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700">
                Contact Seller
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
