import { api } from '@/lib/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { category: string; topicSlug: string } }) {
  try {
    const topic = await api.get(`/content/topics/${params.topicSlug}`)
    return {
      title: `${topic.title} - Kedi Smart`,
      description: topic.excerpt || topic.title,
    }
  } catch {
    return {
      title: 'Pet Care Guide - Kedi Smart',
    }
  }
}

async function getTopic(slug: string) {
  try {
    return await api.get(`/content/topics/${slug}`)
  } catch {
    return null
  }
}

export default async function TopicPage({ params }: { params: { category: string; topicSlug: string } }) {
  const topic = await getTopic(params.topicSlug)

  if (!topic) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8">
      <article className="max-w-4xl mx-auto">
        <Link href={`/pets/${params.category}`} className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to {params.category}
        </Link>
        
        <h1 className="text-4xl font-bold mb-4">{topic.title}</h1>
        {topic.vet_verified && (
          <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded mb-4">
            ✓ Vet Verified
          </span>
        )}
        
        {topic.excerpt && (
          <p className="text-xl text-gray-600 mb-8">{topic.excerpt}</p>
        )}
        
        {topic.cover_image_url && (
          <img
            src={topic.cover_image_url}
            alt={topic.title}
            className="w-full h-96 object-cover rounded-lg mb-8"
          />
        )}
        
        <div className="prose max-w-none">
          {topic.body_md && (
            <div dangerouslySetInnerHTML={{ __html: topic.body_md }} />
          )}
        </div>

        {topic.faqs && topic.faqs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {topic.faqs.map((faq: any, index: number) => (
                <div key={faq.id || index} className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  )
}
