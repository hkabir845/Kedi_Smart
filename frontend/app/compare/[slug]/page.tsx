import Link from 'next/link'
import { notFound } from 'next/navigation'
import Breadcrumbs from '@/components/Breadcrumbs'
import FaqSection from '@/components/FaqSection'
import JsonLd from '@/components/JsonLd'
import ShareButtons from '@/components/ShareButtons'
import { allCompareSlugs, getComparison } from '@/lib/content/comparisons'
import { automatePageSeo, definitionBlock } from '@/lib/seo-automation'

export function generateStaticParams() {
  return allCompareSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cmp = getComparison(slug)
  if (!cmp) return {}
  return automatePageSeo({
    kind: 'comparison',
    title: cmp.title,
    description: cmp.summary,
    path: `/compare/${slug}`,
    keywords: cmp.keywords,
    aiSummary: cmp.definition,
    clusterId: cmp.clusterId,
  }).metadata
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cmp = getComparison(slug)
  if (!cmp) notFound()

  const path = `/compare/${slug}`
  const seo = automatePageSeo({
    kind: 'comparison',
    title: cmp.title,
    description: cmp.summary,
    path,
    keywords: cmp.keywords,
    faqs: cmp.faqs,
    aiSummary: cmp.definition,
    clusterId: cmp.clusterId,
  })

  return (
    <main className="min-h-screen bg-white">
      <JsonLd data={seo.schemas} />
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumbs items={seo.breadcrumbs} />
        <p className="text-sm text-gray-500 mb-2">Reviewed {cmp.lastReviewed}</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{cmp.title}</h1>
        <p className="text-lg text-gray-600 mb-6">{cmp.summary}</p>

        <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-5 py-4 mb-8">
          <p className="text-sm font-semibold text-teal-900 mb-1">Definition</p>
          <p className="text-gray-800">{definitionBlock(cmp.title, cmp.definition)}</p>
        </div>

        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">
              {cmp.optionA} versus {cmp.optionB}
            </caption>
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 border border-gray-200 font-semibold">Aspect</th>
                <th className="p-3 border border-gray-200 font-semibold">{cmp.optionA}</th>
                <th className="p-3 border border-gray-200 font-semibold">{cmp.optionB}</th>
              </tr>
            </thead>
            <tbody>
              {cmp.rows.map((row) => (
                <tr key={row.aspect}>
                  <th scope="row" className="p-3 border border-gray-200 font-medium text-gray-900">
                    {row.aspect}
                  </th>
                  <td className="p-3 border border-gray-200 text-gray-700">{row.a}</td>
                  <td className="p-3 border border-gray-200 text-gray-700">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">{cmp.optionA} — pros</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {cmp.prosA.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Cons</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {cmp.consA.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 mb-2">{cmp.optionB} — pros</h2>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {cmp.prosB.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">Cons</h3>
            <ul className="list-disc pl-5 text-gray-700 space-y-1">
              {cmp.consB.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>

        <section className="mb-8 rounded-xl border border-gray-200 p-5">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verdict</h2>
          <p className="text-gray-700 leading-relaxed">{cmp.verdict}</p>
        </section>

        {cmp.faqs.length ? <FaqSection faqs={cmp.faqs} /> : null}

        <nav className="mt-8" aria-label="Related">
          <h2 className="font-semibold text-gray-900 mb-2">Related</h2>
          <ul className="space-y-1 text-sm">
            {cmp.relatedGuideSlugs.map((s) => (
              <li key={s}>
                <Link href={`/guides/${s}`} className="text-primary-700 hover:underline">
                  Guide: {s.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
            {cmp.relatedPaths.map((r) => (
              <li key={r.path}>
                <Link href={r.path} className="text-primary-700 hover:underline">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <ShareButtons path={path} title={cmp.title} />
        </div>
      </article>
    </main>
  )
}
