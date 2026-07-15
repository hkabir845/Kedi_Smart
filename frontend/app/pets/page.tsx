import { api } from '@/lib/api'
import Link from 'next/link'
import PetPageHero from '@/components/PetPageHero'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata } from '@/lib/seo'

export const metadata = buildPageMetadata({
  title: 'Pet Care Guides',
  description: 'Expert pet care, nutrition, and health guides from KediSmart.',
  path: '/pets',
})

async function getCategories() {
  try {
    return await api.get('/content/categories')
  } catch {
    return []
  }
}

export default async function PetsPage() {
  const categories = await getCategories()

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <PetPageHero
          title="Knowledge"
          description="Expert guides on nutrition, health, training, and wellness — vetted for pet parents."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((category: any) => (
            <Link
              key={category.id}
              href={`/pets/${category.slug}`}
              className={`${petCardClass} p-6 group`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-4 text-primary-600 font-bold text-sm">
                {category.name.charAt(0)}
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                {category.name}
              </h2>
              <p className="text-sm text-gray-500">Explore {category.name.toLowerCase()} guides</p>
            </Link>
          ))}
        </div>
        {categories.length === 0 && (
          <div className={`${petCardClass} p-12 text-center mt-6`}>
            <p className="text-gray-600">Guides coming soon.</p>
          </div>
        )}
      </div>
    </main>
  )
}
