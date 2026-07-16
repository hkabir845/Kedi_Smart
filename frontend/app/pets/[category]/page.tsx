import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PetPageHero from '@/components/PetPageHero'
import { petCardClass } from '@/lib/pet-theme'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  try {
    const category = await api.get(`/content/categories/${categorySlug}`)
    return buildPageMetadata({
      title: `${category.name} Care Guides`,
      description: `Comprehensive care guides for ${category.name} on KediSmart.`,
      path: `/pets/${categorySlug}`,
    })
  } catch {
    return buildPageMetadata({
      title: 'Pet Care Guides',
      path: `/pets/${categorySlug}`,
    })
  }
}

async function getCategory(slug: string) {
  try {
    return await api.get(`/content/categories/${slug}`)
  } catch {
    return null
  }
}

async function getTopics(categoryId: number) {
  try {
    const response = await api.get(`/content/topics?category_id=${categoryId}&limit=50`)
    return response.items || []
  } catch {
    return []
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params
  const category = await getCategory(categorySlug)

  if (!category) {
    notFound()
  }

  const topics = await getTopics(category.id)

  return (
    <main className="min-h-screen bg-[#f5f5f3]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <PetPageHero
          title={`${category.name} Care Guides`}
          description={`Expert guides and tips for ${category.name.toLowerCase()} care, health, and nutrition.`}
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Knowledge', href: '/pets' },
            { label: category.name },
          ]}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {topics.map((topic: any) => (
            <Link
              key={topic.id}
              href={`/pets/${categorySlug}/${topic.slug}`}
              className={`${petCardClass} p-6 group`}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                {topic.title}
              </h2>
              {topic.excerpt && <p className="text-sm text-gray-500 mb-4 line-clamp-2">{topic.excerpt}</p>}
              {topic.vet_verified && (
                <span className="inline-block bg-primary-100 text-primary-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  ✓ Vet verified
                </span>
              )}
            </Link>
          ))}
        </div>
        {topics.length === 0 && (
          <p className="text-center text-gray-500 mt-12">
            No guides available for this category yet.
          </p>
        )}
      </div>
    </main>
  )
}
